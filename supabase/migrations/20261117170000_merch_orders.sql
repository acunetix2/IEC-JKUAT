-- Store public merchandise order requests and expose them only to admins.
CREATE TABLE IF NOT EXISTS public.merch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  customer_phone TEXT NOT NULL CHECK (char_length(customer_phone) BETWEEN 7 AND 20),
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merch_orders_created_at
  ON public.merch_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merch_orders_status
  ON public.merch_orders (status);

CREATE TABLE IF NOT EXISTS public.merch_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.merch_orders (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  size TEXT CHECK (size IS NULL OR char_length(size) <= 24)
);

CREATE INDEX IF NOT EXISTS idx_merch_order_items_order_id
  ON public.merch_order_items (order_id);

ALTER TABLE public.merch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.merch_orders, public.merch_order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE (status) ON public.merch_orders TO authenticated;
GRANT SELECT ON public.merch_order_items TO authenticated;

DROP POLICY IF EXISTS "Admins can read merchandise orders" ON public.merch_orders;
CREATE POLICY "Admins can read merchandise orders"
  ON public.merch_orders FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update merchandise order status" ON public.merch_orders;
CREATE POLICY "Admins can update merchandise order status"
  ON public.merch_orders FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read merchandise order items" ON public.merch_order_items;
CREATE POLICY "Admins can read merchandise order items"
  ON public.merch_order_items FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.create_merch_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB
)
RETURNS TABLE (order_id UUID, total_amount BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID := gen_random_uuid();
  v_total BIGINT := 0;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_size TEXT;
  v_product RECORD;
BEGIN
  IF p_customer_name IS NULL
     OR char_length(btrim(p_customer_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter a valid name.';
  END IF;
  IF p_customer_phone IS NULL
     OR char_length(btrim(p_customer_phone)) NOT BETWEEN 7 AND 20 THEN
    RAISE EXCEPTION 'Enter a valid phone number.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'The cart is invalid.';
  END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'The cart must contain between 1 and 30 items.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'One or more cart items are invalid.';
    END IF;

    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION
      WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'One or more cart items are invalid.';
    END;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity NOT BETWEEN 1 AND 99 THEN
      RAISE EXCEPTION 'One or more cart items are invalid.';
    END IF;
    v_size := NULLIF(btrim(v_item->>'size'), '');
    IF v_size IS NOT NULL AND char_length(v_size) > 24 THEN
      RAISE EXCEPTION 'One or more selected sizes are invalid.';
    END IF;

    SELECT p.id, p.name, p.price, p.sizes
      INTO v_product
      FROM public.products AS p
      WHERE p.id = v_product_id
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.';
    END IF;
    IF jsonb_typeof(v_product.sizes) = 'array' THEN
      IF jsonb_array_length(v_product.sizes) > 0
         AND (v_size IS NULL OR NOT (v_product.sizes @> jsonb_build_array(v_size))) THEN
        RAISE EXCEPTION 'Choose a valid size for %.', v_product.name;
      END IF;
    END IF;

    v_total := v_total + (v_product.price::BIGINT * v_quantity);
  END LOOP;

  INSERT INTO public.merch_orders (id, customer_name, customer_phone, total_amount)
  VALUES (v_order_id, btrim(p_customer_name), btrim(p_customer_phone), v_total);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_size := NULLIF(btrim(v_item->>'size'), '');
    SELECT p.id, p.name, p.price
      INTO v_product
      FROM public.products AS p
      WHERE p.id = v_product_id;

    INSERT INTO public.merch_order_items (
      order_id, product_id, product_name, unit_price, quantity, size
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.price, v_quantity, v_size
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_total;
END
$$;

REVOKE ALL ON FUNCTION public.create_merch_order(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_merch_order(TEXT, TEXT, JSONB) TO anon, authenticated;
