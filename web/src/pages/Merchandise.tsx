// IEC JKUAT — Merchandise. Ported from merchandise.html + merchandise.js.
// Products load from Supabase; cart lives in localStorage ('iec-cart').
// Product selection and the cart are rendered inside the shared layout.

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { getProducts } from '../lib/supabase';
import { parseJsonList } from '../lib/media';
import type { CartItem, Product } from '../types/db';
import CustomSelect from '../components/CustomSelect';
import ProductColorPicker from '../components/ProductColorPicker';

const CART_FALLBACK_IMG = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop';

type UIProduct = Product & { sizeList: string[]; colorList: string[] };
type SortKey = 'default' | 'price-asc' | 'price-desc' | 'name';

function animateProductToCart(imageUrl: string, source: HTMLButtonElement) {
  const image = source.closest('.product-card')?.querySelector<HTMLImageElement>('.product-image-frame img');
  const target = document.querySelector<HTMLElement>('.site-nav-cart[data-cart-target]');
  if (!image || !target || !imageUrl) return;

  const start = image.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  if (!start.width || !end.width) return;

  const flyer = document.createElement('img');
  flyer.src = imageUrl;
  flyer.alt = '';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    top: `${start.top}px`,
    left: `${start.left}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    objectFit: 'contain',
    background: '#f1f4f7',
    borderRadius: '12px',
    pointerEvents: 'none',
    zIndex: '9999',
    boxShadow: '0 12px 30px rgba(5, 23, 45, 0.22)',
  });
  document.body.appendChild(flyer);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.top + end.height / 2 - (start.top + start.height / 2);
  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: reducedMotion ? 'translate(0, 0) scale(0.96)' : `translate(${dx}px, ${dy}px) scale(0.16)`,
        opacity: 0.15,
      },
    ],
    {
      duration: reducedMotion ? 140 : 450,
      easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
      fill: 'forwards',
    }
  );
  animation.addEventListener('finish', () => flyer.remove(), { once: true });
  animation.addEventListener('cancel', () => flyer.remove(), { once: true });
}
const SORT_LABELS: Record<SortKey, string> = {
  default: 'Sort by',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  name: 'Name: A-Z',
};
const SORT_VALUES: Record<string, SortKey> = {
  'Sort by': 'default',
  'Price: Low to High': 'price-asc',
  'Price: High to Low': 'price-desc',
  'Name: A-Z': 'name',
};

export default function Merchandise() {
  const { toast } = useToast();
  const { add } = useCart();

  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('default');

  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (!active) return;
        // merchandise.js listed products oldest-first; getProducts() is newest-first.
        const oldestFirst = [...data].reverse();
        setProducts(oldestFirst.map((p) => ({
          ...p,
          sizeList: parseJsonList(p.sizes),
          colorList: parseJsonList(p.colors),
        })));
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
  const validPrices = products
    .map((product) => product.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price));
  const startingPrice = validPrices.length ? Math.min(...validPrices) : null;
  const categoryCount = new Set(products.map((product) => product.category?.trim()).filter(Boolean)).size;
  const featuredProduct = products.find((product) => product.image_url) ?? null;

  const addToCart = useCallback(
    (product: UIProduct, size: string | null, color: string | null, source: HTMLButtonElement) => {
      if (product.sizeList.length > 0 && !size) {
        toast('Please select a size first', 'error');
        return false;
      }
      if (product.colorList.length > 0 && !color) {
        toast('Please select a color first', 'error');
        return false;
      }
      add({
        id: product.id,
        name: product.name,
        price: product.price || 0,
        size: size || undefined,
        color: color || undefined,
        colorOptions: product.colorList.length ? product.colorList : undefined,
        image_url: product.image_url || undefined,
      });
      requestAnimationFrame(() => animateProductToCart(product.image_url || '', source));
      return true;
    },
    [toast, add]
  );

  return (
    <main data-theme-lock="dark" className="pb-20">
      {/* HERO — always dark. Must stay main's first child: the light-mode
          "keep hero dark" rules select main > section:first-child. */}
      <section
        className="mb-12 relative overflow-hidden px-6 md:px-16"
        style={{
          minHeight: '320px',
          borderRadius: 0,
          background: 'linear-gradient(100deg, rgba(8,24,43,.76) 0%, rgba(11,38,64,.48) 52%, rgba(15,48,42,.3) 100%), url("/uploads/iec-14.jpg") center 42% / cover no-repeat',
        }}
      >
        {featuredProduct?.image_url && (
          <div className="merch-featured-photo absolute right-4 top-1/2 -translate-y-1/2 w-24 h-32 md:right-16 md:w-64 md:h-64 z-10 rounded-lg shadow-2xl overflow-hidden">
            <div className="photo-overlay-container h-full">
              <img src={featuredProduct.image_url} className="w-full h-full object-cover" alt={featuredProduct.name} />
              <div className="photo-reveal">
                <strong>{featuredProduct.name}</strong>
                <span>KES {(featuredProduct.price || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        <div className="relative z-20 px-8 md:px-14 py-12 md:py-16 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-iec-gold animate-pulse"></span>
            <span className="text-iec-gold text-[10px] font-bold tracking-[0.15em] uppercase">
              IEC JKUAT · Products
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
            Explore the merchandise currently available from IEC JKUAT.
          </p>
          <div className="flex items-center gap-5 mb-7">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{loading ? '—' : products.length}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Products</p>
            </div>
            <div className="w-px h-6 bg-white/15"></div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">
                {loading || startingPrice === null ? '—' : startingPrice.toLocaleString()}
              </p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Starting KES</p>
            </div>
            <div className="w-px h-6 bg-white/15"></div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{loading ? '—' : categoryCount}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Categories</p>
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
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg"
              style={{ background: '#0b1f3a', border: '1px solid rgba(255,255,255,0.22)' }}
            >
              <span className="material-symbols-outlined text-[16px]">shopping_cart</span> View Cart
            </Link>
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
                  style={filter === f.key ? { background: '#0b1f3a', border: '1px solid rgba(255,255,255,0.16)' } : undefined}
                  data-filter={f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.icon && <span className="material-symbols-outlined align-middle text-[13px] mr-1">{f.icon}</span>}
                  {f.label}
                </button>
              ))}
            </div>
            <CustomSelect
              id="sort-select"
              label="Sort products"
              value={SORT_LABELS[sort]}
              options={Object.values(SORT_LABELS)}
              onChange={(option) => setSort(SORT_VALUES[option] ?? 'default')}
            />
          </div>
        </div>

        <div className="merch-product-grid" id="product-grid">
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
            visible.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)
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
              Orders handled by the IEC team
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Checkout saves your order for the IEC team to review and follow up with you.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#25D366' }}>
                <span className="material-symbols-outlined text-[14px]">receipt_long</span> Order saved for tracking
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span className="material-symbols-outlined text-[14px]">support_agent</span> Team follow-up
              </span>
            </div>
          </div>
        </div>
        <div className="p-7 relative overflow-hidden" style={{ background: '#00243d', borderRadius: '12px' }}>
          <h3 className="font-display font-bold text-base mb-2" style={{ color: '#ffffff' }}>
            Member Perks
          </h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ask the IEC team about current merchandise offers and upcoming releases.
          </p>
          <Link to="/#join" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: '#18C8FF' }}>
            Join the club <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
          <span className="material-symbols-outlined absolute -bottom-3 -right-3 text-[100px]" style={{ color: 'rgba(255,255,255,0.06)' }}>
            loyalty
          </span>
        </div>
      </section>

    </main>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: UIProduct;
  onAdd: (p: UIProduct, size: string | null, color: string | null, source: HTMLButtonElement) => boolean;
}) {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function handleAdd(event: MouseEvent<HTMLButtonElement>) {
    const ok = onAdd(product, size, color, event.currentTarget);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <article
      className="product-card merch-product-card group"
      data-category={product.category || ''}
      style={{
        background: '#fff',
        border: '1px solid #e1e7ee',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link to={`/products/${encodeURIComponent(product.id)}`} className="product-card-details-link">
        <div className="product-image-frame" style={{ height: '160px', boxSizing: 'border-box', overflow: 'hidden', background: '#f1f4f7', padding: '8px' }}>
          <img
            className="product-img"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            loading="lazy"
            src={product.image_url || ''}
            alt={product.name}
          />
        </div>
        <div className="product-card-copy" style={{ padding: '12px 13px 0' }}>
          <h3 className="product-card-name">
            {product.name}
          </h3>
          <p className="product-card-price">
            KES {(product.price || 0).toLocaleString()}
          </p>
          <p className="product-card-description">
            {product.description || 'View product details'}
          </p>
        </div>
      </Link>
      <div className="product-card-controls" style={{ padding: '0 13px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(product.sizeList.length > 0 || product.colorList.length > 0) && (
          <div className="product-card-variants">
            {product.sizeList.length > 0 && (
              <div className="product-card-size-options" role="group" aria-label={`Choose a size for ${product.name}`}>
                <span className="product-card-variant-label">Size</span>
                <div className="size-group">
                  {product.sizeList.map((s) => {
                    const selected = size === s;
                    return (
                      <button
                        key={s}
                        className="size-btn"
                        style={{
                          border: `1px solid ${selected ? '#0b1f3a' : '#d6dee7'}`,
                          color: selected ? '#fff' : '#475569',
                          background: selected ? '#0b1f3a' : '#fff',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                        aria-pressed={selected}
                        onClick={() => setSize(s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <ProductColorPicker colors={product.colorList} value={color} onChange={setColor} compact />
          </div>
        )}
        <button
          className="add-to-cart-btn"
          onClick={handleAdd}
          style={{
            width: '100%',
            padding: '9px',
            background: added ? '#17653c' : '#0b1f3a',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '7px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {added ? 'check_circle' : 'add_shopping_cart'}
          </span>
          {added ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}

export function CartModal({
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
      aria-label="Shopping cart"
    >
      <div
        className="cart-modal-bg rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        style={{ background: '#0b1f3a', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="font-display font-bold text-white text-lg">
            Your Cart ({cart.reduce((c, i) => c + i.quantity, 0)})
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close cart">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-40 text-white/25">shopping_cart</span>
              <p className="font-semibold text-sm text-white/60 mb-3">Your cart is empty</p>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                style={{ background: '#fff', color: '#0b1f3a' }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span> Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <img
                  src={item.image_url || CART_FALLBACK_IMG}
                  className="rounded-lg object-cover shrink-0"
                  style={{ width: '72px', height: '72px' }}
                  alt={item.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-white/55 mt-0.5">
                    KES {item.price.toLocaleString()}
                    {item.size ? ' · Size ' + item.size : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onQty(index, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white hover:text-white transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.22)' }}
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => onQty(index, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white hover:text-white transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.22)' }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-bold text-sm text-white">KES {(item.price * item.quantity).toLocaleString()}</span>
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
              <span className="text-white/55 text-sm">Total</span>
              <span className="font-display font-bold text-white text-xl">KES {total.toLocaleString()}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-4 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              style={{ background: '#fff', color: '#0b1f3a' }}
            >
              <span className="material-symbols-outlined">shopping_cart_checkout</span> Continue to checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
