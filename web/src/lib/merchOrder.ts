import type { CartItem } from '../types/db';
import { createMerchOrder } from './supabase';
import { formatMerchOrderReference } from './format';

export async function submitMerchOrder(
  cart: CartItem[],
  customerName: string,
  customerPhone: string
): Promise<{ reference: string; totalAmount: number }> {
  const order = await createMerchOrder(
    customerName,
    customerPhone,
    cart.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
      size: item.size,
    }))
  );
  return {
    reference: formatMerchOrderReference(order.id),
    totalAmount: order.totalAmount,
  };
}
