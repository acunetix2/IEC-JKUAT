ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_colors_array_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_colors_array_check
      CHECK (jsonb_typeof(colors) = 'array');
  END IF;
END
$$;

UPDATE public.products
SET colors = '["Black", "White"]'::jsonb
WHERE colors = '[]'::jsonb
  AND (name ILIKE '%shirt%' OR COALESCE(description, '') ILIKE '%shirt%');

ALTER TABLE public.merch_order_items
  ADD COLUMN IF NOT EXISTS color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'merch_order_items_color_length_check'
      AND conrelid = 'public.merch_order_items'::regclass
  ) THEN
    ALTER TABLE public.merch_order_items
      ADD CONSTRAINT merch_order_items_color_length_check
      CHECK (color IS NULL OR char_length(color) <= 40);
  END IF;
END
$$;

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
  v_color TEXT;
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
    v_color := NULLIF(btrim(v_item->>'color'), '');
    IF v_color IS NOT NULL AND char_length(v_color) > 40 THEN
      RAISE EXCEPTION 'One or more selected colors are invalid.';
    END IF;

    SELECT p.id, p.name, p.price, p.sizes, p.colors
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
    IF jsonb_typeof(v_product.colors) = 'array' THEN
      IF jsonb_array_length(v_product.colors) > 0
         AND (v_color IS NULL OR NOT (v_product.colors @> jsonb_build_array(v_color))) THEN
        RAISE EXCEPTION 'Choose a valid color for %.', v_product.name;
      ELSIF jsonb_array_length(v_product.colors) = 0 AND v_color IS NOT NULL THEN
        RAISE EXCEPTION '% does not offer color options.', v_product.name;
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
    v_color := NULLIF(btrim(v_item->>'color'), '');
    SELECT p.id, p.name, p.price
      INTO v_product
      FROM public.products AS p
      WHERE p.id = v_product_id;

    INSERT INTO public.merch_order_items (
      order_id, product_id, product_name, unit_price, quantity, size, color
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.price, v_quantity, v_size, v_color
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_total;
END
$$;

REVOKE ALL ON FUNCTION public.create_merch_order(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_merch_order(TEXT, TEXT, JSONB) TO anon, authenticated;
