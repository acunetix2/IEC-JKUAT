import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import MerchCheckout from '../components/MerchCheckout';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { submitMerchOrder } from '../lib/merchOrder';

export default function Cart() {
  const { cart, count, total, remove, updateQuantity, clear } = useCart();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittedReference, setSubmittedReference] = useState('');

  async function placeOrder(name: string, phone: string) {
    const { reference } = await submitMerchOrder(cart, name, phone);
    clear();
    setCheckoutOpen(false);
    setSubmittedReference(reference);
    toast(`Order ${reference} has been submitted.`, 'success');
  }

  return (
    <main className="cart-page">
      <header className="cart-page-hero">
        <Link to="/products" className="cart-back-link"><FiArrowLeft aria-hidden="true" /> Continue shopping</Link>
        <div className="cart-page-hero-content">
          <span className="cart-page-kicker"><FiShoppingCart aria-hidden="true" /> IEC JKUAT Store</span>
          <h1>Your cart</h1>
          <p>Review your picks and submit your order to the IEC team.</p>
        </div>
        <div className="cart-page-count">{count} {count === 1 ? 'item' : 'items'}</div>
      </header>

      <section className="cart-page-content" aria-label="Your merchandise cart">
        {submittedReference ? (
          <div className="cart-empty-state cart-order-confirmation" role="status">
            <span className="cart-empty-icon"><FiShoppingCart aria-hidden="true" /></span>
            <p className="cart-empty-eyebrow">Order received</p>
            <h2>Your order is with the IEC team.</h2>
            <p>Order reference: <strong>{submittedReference}</strong>. The team will review your items and contact you using the phone number provided.</p>
            <Link to="/products" className="cart-primary-link">Continue shopping <FiArrowLeft aria-hidden="true" /></Link>
          </div>
        ) : checkoutOpen ? (
          <MerchCheckout
            itemCount={count}
            total={total}
            onClose={() => setCheckoutOpen(false)}
            onSubmit={placeOrder}
          />
        ) : cart.length === 0 ? (
          <div className="cart-empty-state">
            <span className="cart-empty-icon"><FiShoppingCart aria-hidden="true" /></span>
            <p className="cart-empty-eyebrow">Nothing in your cart yet</p>
            <h2>Find something that feels like IEC.</h2>
            <p>Browse the current merchandise collection, then come back here to place your order.</p>
            <Link to="/products" className="cart-primary-link">Explore products <FiArrowLeft aria-hidden="true" /></Link>
          </div>
        ) : (
          <div className="cart-page-grid">
            <div className="cart-items-panel">
              <div className="cart-items-heading">
                <div><h2>Order items</h2><p>{count} {count === 1 ? 'piece' : 'pieces'} selected</p></div>
                <button type="button" onClick={clear} className="cart-clear-button">Clear cart</button>
              </div>
              <div className="cart-page-item-list">
                {cart.map((item, index) => (
                  <article className="cart-page-item" key={`${item.id}-${item.size ?? ''}`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="cart-page-item-image" />
                    ) : (
                      <div className="cart-page-item-image cart-page-item-placeholder"><FiShoppingCart aria-hidden="true" /></div>
                    )}
                    <div className="cart-page-item-details">
                      <p className="cart-page-item-category">IEC MERCHANDISE</p>
                      <h3>{item.name}</h3>
                      {item.size && <p className="cart-page-item-size">Size: {item.size}</p>}
                      <p className="cart-page-item-price">KES {item.price.toLocaleString()}</p>
                    </div>
                    <div className="cart-page-item-actions">
                      <div className="cart-quantity-control" aria-label={`Quantity for ${item.name}`}>
                        <button type="button" onClick={() => updateQuantity(index, -1)} aria-label={`Decrease ${item.name} quantity`}><FiMinus aria-hidden="true" /></button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(index, 1)} aria-label={`Increase ${item.name} quantity`}><FiPlus aria-hidden="true" /></button>
                      </div>
                      <strong>KES {(item.price * item.quantity).toLocaleString()}</strong>
                      <button type="button" onClick={() => remove(index)} className="cart-remove-button" aria-label={`Remove ${item.name} from cart`}>
                        <FiTrash2 aria-hidden="true" /><span>Remove</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="cart-summary-panel">
              <p className="cart-summary-eyebrow">Order summary</p>
              <h2>Ready when you are.</h2>
              <div className="cart-summary-line"><span>Items ({count})</span><strong>KES {total.toLocaleString()}</strong></div>
              <div className="cart-summary-line"><span>Next step</span><span>IEC team confirmation</span></div>
              <div className="cart-summary-total"><span>Estimated total</span><strong>KES {total.toLocaleString()}</strong></div>
              <button type="button" className="cart-checkout-button" onClick={() => setCheckoutOpen(true)}>
                Continue to checkout <FiArrowLeft aria-hidden="true" />
              </button>
              <p className="cart-summary-note">Your order will be saved in the IEC admin workspace when you place it.</p>
              <Link to="/products" className="cart-summary-back"><FiArrowLeft aria-hidden="true" /> Keep browsing</Link>
            </aside>
          </div>
        )}
      </section>

    </main>
  );
}
