// IEC JKUAT — Merchandise. Ported from merchandise.html + merchandise.js.
// Products load from Supabase; cart lives in localStorage ('iec-cart').
// Size selection, filter, sort, cart modal, and the WhatsApp checkout flow
// (paybill 522522 / account 1346900159) are all preserved. Rendered inside
// the shared SiteLayout; the hero + info strip stay dark in both themes.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { getProducts } from '../lib/supabase';
import { parseJsonList } from '../lib/media';
import type { CartItem, Product } from '../types/db';

const CLUB_WHATSAPP_NUMBER = '254768281797';
const CART_FALLBACK_IMG = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop';

type UIProduct = Product & { sizeList: string[] };

export default function Merchandise() {
  const { theme } = useTheme();
  const { toast } = useToast();
  const isLight = theme === 'light';
  const { cart, count: cartCount, total: cartTotal, cartOpen, setCartOpen, add, remove, updateQuantity, clear } = useCart();

  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // The bag can be opened from the nav; close it when leaving the page.
  useEffect(() => () => setCartOpen(false), [setCartOpen]);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (!active) return;
        // merchandise.js listed products oldest-first; getProducts() is newest-first.
        const oldestFirst = [...data].reverse();
        setProducts(oldestFirst.map((p) => ({ ...p, sizeList: parseJsonList(p.sizes) })));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Lock body scroll while any modal is open.
  useEffect(() => {
    document.body.style.overflow = cartOpen || checkoutOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen, checkoutOpen]);

  // Close modals on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false);
        setCheckoutOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const visible = useMemo(() => {
    // Categories are stored capitalised ("Apparel"); the filter keys are
    // lowercase. The old page compared them case-sensitively, so its
    // Apparel/Accessories filters always came back empty.
    let list = filter === 'all' ? products : products.filter((p) => (p.category || '').toLowerCase() === filter);
    list = [...list];
    if (sort === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [products, filter, sort]);

  const addToCart = useCallback(
    (product: UIProduct, size: string | null) => {
      if (product.sizeList.length > 0 && !size) {
        toast('Please select a size first', 'error');
        return false;
      }
      add({
        id: product.id,
        name: product.name,
        price: product.price || 0,
        size: size || undefined,
        image_url: product.image_url || undefined,
      });
      return true;
    },
    [toast, add]
  );

  const removeFromCart = remove;

  function handleWhatsAppOrder(name: string, phone: string) {
    const itemLines = cart
      .map(
        (item) =>
          `  • ${item.name}${item.size ? ' (Size ' + item.size + ')' : ''} x${item.quantity} — KES ${(
            item.price * item.quantity
          ).toLocaleString()}`
      )
      .join('\n');

    const message =
      `*New Merch Order — IEC JKUAT*\n\n` +
      `*Name:* ${name}\n` +
      `*Phone:* ${phone}\n\n` +
      `*Items:*\n${itemLines}\n\n` +
      `*Total: KES ${cartTotal.toLocaleString()}*\n\n` +
      `*Payment Instructions:*\n` +
      `Lipa na M-Pesa → Paybill *522522*\n` +
      `Account No: *1346900159*\n` +
      `Amount: *KES ${cartTotal.toLocaleString()}*\n\n` +
      `I will send the M-Pesa confirmation once paid. Please confirm my order. Thank you!`;

    window.open(`https://wa.me/${CLUB_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    clear();
    setCheckoutOpen(false);
    setCartOpen(false);
    toast('Order sent! Check WhatsApp to complete.', 'success');
  }

  return (
    <main style={{ paddingTop: '72px' }} data-theme-lock="dark" className="pb-20">
      {/* HERO — always dark. Must stay main's first child: the light-mode
          "keep hero dark" rules select main > section:first-child. */}
      <section className="mb-12 relative overflow-hidden px-6 md:px-16" style={{ minHeight: '360px', borderRadius: 0 }}>
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1400&h=600&fit=crop"
            className="w-full h-full object-cover"
            alt=""
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(0,20,45,0.95) 40%, rgba(0,20,45,0.7) 70%, rgba(0,20,45,0.3) 100%)' }}
          />
        </div>
        {/* Mobile: single featured product image */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-36 md:hidden z-10 rounded-lg overflow-hidden shadow-2xl opacity-60"
          style={{ border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <img src="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=380&fit=crop" className="w-full h-full object-cover" alt="" />
        </div>
        {/* Desktop: stacked product images */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:flex items-center justify-end pr-12 z-10">
          <div className="relative w-64 h-64">
            <div className="absolute -right-4 top-4 w-48 h-60 rounded-lg overflow-hidden shadow-2xl rotate-6 opacity-70">
              <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=380&fit=crop" className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute left-0 top-0 w-48 h-60 rounded-lg overflow-hidden shadow-2xl -rotate-3" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=380&fit=crop" className="w-full h-full object-cover" alt="" />
              <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                <p className="text-white text-xs font-bold">IEC Snapback</p>
                <p className="text-white/60 text-[10px]">KES 900</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-20 px-8 md:px-14 py-12 md:py-16 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-iec-gold animate-pulse"></span>
            <span className="text-iec-gold text-[10px] font-bold tracking-[0.15em] uppercase">
              Season Drop · Club Gear 2026
            </span>
          </div>
          <h1
            className="font-display font-extrabold text-white mb-4 leading-tight"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            Wear the <span className="text-iec-gold">Spirit</span>
            <br />
            of Innovation
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-7 max-w-sm">
            Exclusive gear for founders, builders, and dreamers shaping the Silicon Savannah.
          </p>
          <div className="flex items-center gap-5 mb-7">
            <div className="text-center">
              <p className="text-white font-bold text-lg">8+</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Products</p>
            </div>
            <div className="w-px h-6 bg-white/15"></div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">250</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Starting KES</p>
            </div>
            <div className="w-px h-6 bg-white/15"></div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">24h</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Delivery</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#shop"
              className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-lg"
              style={{ background: '#FBB03B', color: '#000' }}
            >
              Shop Now <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <span className="material-symbols-outlined text-[16px]">shopping_bag</span> View Bag
            </button>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="shop" className="mb-20 px-6 md:px-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="section-label mb-2">Collection</p>
            <h2 className="font-display font-bold text-white text-2xl">
              Shop the Collection <span className="text-white/30 text-lg font-normal ml-2">· {visible.length} items</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex gap-1.5 p-1 rounded-lg overflow-x-auto scrollbar-hide"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {[
                { key: 'all', label: 'All', icon: null },
                { key: 'apparel', label: 'Apparel', icon: 'checkroom' },
                { key: 'accessories', label: 'Accessories', icon: 'backpack' },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-btn px-4 py-2 text-sm rounded-md whitespace-nowrap ${
                    filter === f.key ? 'font-semibold text-white' : 'font-medium text-white/50 hover:text-white'
                  }`}
                  style={filter === f.key ? { background: 'rgba(255,255,255,0.1)' } : undefined}
                  data-filter={f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.icon && <span className="material-symbols-outlined align-middle text-[13px] mr-1">{f.icon}</span>}
                  {f.label}
                </button>
              ))}
            </div>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm font-medium px-3 py-2 rounded-lg cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', outline: 'none' }}
              aria-label="Sort products"
            >
              <option value="default">Sort by</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
            </select>
          </div>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          id="product-grid"
          style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}
        >
          {loading ? (
            <div className="col-span-full py-16 text-center text-white/30">
              <span className="material-symbols-outlined animate-spin inline-block text-3xl mb-3">sync</span>
              <p className="text-sm">Loading products...</p>
            </div>
          ) : error ? (
            <p className="col-span-full py-16 text-center text-red-400 text-sm">Failed to load products: {error}</p>
          ) : visible.length === 0 ? (
            <div className="col-span-full py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-4 block">inventory_2</span>
              <p className="font-body-lg text-body-lg">No products in this category yet.</p>
            </div>
          ) : (
            visible.map((p) => <ProductCard key={p.id} product={p} isLight={isLight} onAdd={addToCart} />)
          )}
        </div>
      </section>

      {/* INFO STRIP — always dark */}
      <section id="info-strip" className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 px-6 md:px-16">
        <div
          className="md:col-span-2 p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6"
          style={{ background: 'rgba(10,30,20,0.9)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '12px' }}
        >
          <svg className="w-10 h-10 shrink-0" fill="#25D366" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <div>
            <h3 className="font-display font-bold text-base mb-1" style={{ color: '#ffffff' }}>
              Order via WhatsApp
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Add to bag, checkout — we pre-fill your order and open WhatsApp. Tap Send. Done.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#25D366' }}>
                <span className="material-symbols-outlined text-[14px]">verified</span> Instant Confirmation
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span className="material-symbols-outlined text-[14px]">local_shipping</span> 24h JKUAT Delivery
              </span>
            </div>
          </div>
        </div>
        <div className="p-7 relative overflow-hidden" style={{ background: '#00243d', borderRadius: '12px' }}>
          <h3 className="font-display font-bold text-base mb-2" style={{ color: '#ffffff' }}>
            Member Pricing
          </h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            IEC members get up to 20% off and access to exclusive drops.
          </p>
          <Link to="/#join" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: '#18C8FF' }}>
            Join the club <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
          <span className="material-symbols-outlined absolute -bottom-3 -right-3 text-[100px]" style={{ color: 'rgba(255,255,255,0.06)' }}>
            loyalty
          </span>
        </div>
      </section>

      {/* Phones only: the nav Bag button is hidden below 640px (as it was on
          merchandise.html), so offer a way back to the bag once it has items. */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-2xl"
          style={{ background: '#18C8FF', color: '#000' }}
          aria-label="Open shopping bag"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
          Bag
          <span className="w-5 h-5 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
        </button>
      )}

      {cartOpen && (
        <CartModal
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onQty={updateQuantity}
          onCheckout={() => setCheckoutOpen(true)}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          itemCount={cartCount}
          total={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onSubmit={handleWhatsAppOrder}
        />
      )}
    </main>
  );
}

function ProductCard({
  product,
  isLight,
  onAdd,
}: {
  product: UIProduct;
  isLight: boolean;
  onAdd: (p: UIProduct, size: string | null) => boolean;
}) {
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const nameColor = isLight ? '#0d0f12' : '#ffffff';
  const descColor = isLight ? '#4b5563' : 'rgba(255,255,255,0.6)';
  const cardBg = isLight ? '#ffffff' : 'rgba(255,255,255,0.04)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)';
  const sizeColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const sizeBorder = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
  const sizeText = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';

  function handleAdd() {
    const ok = onAdd(product, size);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <div
      className="product-card group"
      data-category={product.category || ''}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        <img
          className="product-img"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
          src={product.image_url || ''}
          alt={product.name}
        />
      </div>
      <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: '15px', color: nameColor, lineHeight: 1.35, marginBottom: '4px' }}>
          {product.name}
        </h3>
        <p style={{ fontWeight: 700, fontSize: '15px', color: '#18C8FF', marginBottom: '10px' }}>
          KES {(product.price || 0).toLocaleString()}
        </p>
        <p
          style={{
            fontSize: '13px',
            color: descColor,
            lineHeight: 1.5,
            marginBottom: '14px',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </p>
        {product.sizeList.length > 0 && (
          <div className="mb-3">
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: sizeColor, marginBottom: '8px' }}>
              Size
            </p>
            <div className="flex flex-wrap gap-1.5 size-group">
              {product.sizeList.map((s) => {
                const selected = size === s;
                return (
                  <button
                    key={s}
                    className="size-btn text-xs font-bold px-2.5 py-1 transition-all duration-150"
                    style={{
                      border: `1px solid ${selected ? '#18C8FF' : sizeBorder}`,
                      color: selected ? '#18C8FF' : sizeText,
                      background: selected ? 'rgba(24,200,255,0.12)' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          className="add-to-cart-btn"
          onClick={handleAdd}
          style={{
            width: '100%',
            padding: '11px',
            background: added ? '#22c55e' : '#18C8FF',
            color: '#000',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '6px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {added ? 'check_circle' : 'add_shopping_cart'}
          </span>
          {added ? 'Added!' : 'Add to Bag'}
        </button>
      </div>
    </div>
  );
}

function CartModal({
  cart,
  total,
  onClose,
  onRemove,
  onQty,
  onCheckout,
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onRemove: (i: number) => void;
  onQty: (i: number, d: number) => void;
  onCheckout: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
    >
      <div
        className="cart-modal-bg rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="font-display font-bold text-white text-lg">
            Your Bag ({cart.reduce((c, i) => c + i.quantity, 0)})
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close cart">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-40 text-white/25">shopping_bag</span>
              <p className="font-semibold text-sm text-white/60 mb-3">Your bag is empty</p>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                style={{ background: '#18C8FF', color: '#000' }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span> Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                <img
                  src={item.image_url || CART_FALLBACK_IMG}
                  className="rounded-lg object-cover shrink-0"
                  style={{ width: '72px', height: '72px' }}
                  alt={item.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    KES {item.price.toLocaleString()}
                    {item.size ? ' · Size ' + item.size : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onQty(index, -1)}
                      className="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center text-sm font-bold hover:border-tech-blue hover:text-tech-blue transition-colors"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => onQty(index, 1)}
                      className="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center text-sm font-bold hover:border-tech-blue hover:text-tech-blue transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-bold text-sm text-on-surface">KES {(item.price * item.quantity).toLocaleString()}</span>
                  <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/40 text-sm">Total</span>
              <span className="font-display font-bold text-iec-blue text-xl">KES {total.toLocaleString()}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-4 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              style={{ background: '#25D366' }}
            >
              <WhatsAppIcon /> Order via WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({
  itemCount,
  total,
  onClose,
  onSubmit,
}: {
  itemCount: number;
  total: number;
  onClose: () => void;
  onSubmit: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout via WhatsApp"
    >
      <div
        className="rounded-xl w-full max-w-sm mx-4 shadow-2xl"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,211,102,0.12)' }}>
              <WhatsAppIcon className="w-7 h-7 text-[#25D366]" />
            </div>
            <h3 className="font-display font-bold text-white text-lg mb-1">Order via WhatsApp</h3>
            <p className="text-white/40 text-sm">We'll open WhatsApp with your order pre-filled.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(name.trim(), phone.trim());
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Your Name</label>
              <input className="dark-input" placeholder="Jane Mwangi" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input type="tel" className="dark-input" placeholder="0712345678" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="p-4 rounded text-sm space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between text-white/35">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>
              <div className="flex justify-between font-bold text-white">
                <span>Total</span>
                <span className="text-iec-blue">KES {total.toLocaleString()}</span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3.5 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              style={{ background: '#25D366' }}
            >
              <WhatsAppIcon /> Send Order on WhatsApp
            </button>
          </form>
          <button onClick={onClose} className="w-full mt-3 py-2.5 text-white/35 text-sm hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
