// ===== CONFIG =====
const CLUB_WHATSAPP_NUMBER = '254768281797';

// ===== CART STATE =====
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('iec-cart') || '[]');
let activeFilter = 'all';

// ===== PRODUCT LOADING =====
async function loadProducts() {
  try {
    const sb = initSupabase();
    if (!sb) {
      document.getElementById('products-loading').innerHTML = '<p class="text-red-400 text-sm">Unable to connect.</p>';
      return;
    }
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    allProducts = data || [];

    // Map DB fields to the shape renderProducts() expects
    allProducts = allProducts.map(p => {
      let parsedSizes = [];
      try {
        if (Array.isArray(p.sizes)) {
          parsedSizes = p.sizes;
        } else if (typeof p.sizes === 'string') {
          parsedSizes = JSON.parse(p.sizes || '[]');
        }
      } catch(e) { parsedSizes = []; }

      return {
        ...p,
        sizes:      parsedSizes,
        stock:       'In Stock',
      };
    });

    renderProducts(allProducts);
    updateCartDisplay();
  } catch (err) {
    console.error('Products load error:', err);
    document.getElementById('products-loading').innerHTML =
      `<p class="text-red-400 text-sm">Failed to load products: ${err.message}</p>`;
  }
}

// ===== FILTER =====
function setFilter(filter) {
  activeFilter = filter;

  // Update filter button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('bg-on-surface', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('shadow-sm', isActive);
    btn.classList.toggle('text-on-surface-variant', !isActive);
    btn.classList.toggle('hover:bg-white/50', !isActive);
  });

  const filtered = filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter);
  renderProducts(filtered);

  // Update count label
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = filtered.length;
}

// ===== SORT =====
function sortProducts(sortBy) {
  let sorted = [...allProducts];
  const filtered = activeFilter === 'all' ? sorted : sorted.filter(p => p.category === activeFilter);

  switch (sortBy) {
    case 'price-asc':
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-desc':
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'name':
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    default:
      // Keep original order (by created_at)
      break;
  }

  renderProducts(filtered);
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  // Detect current theme — text colors adapt
  const isLight = document.documentElement.classList.contains('light');
  const cardBg      = isLight ? '#ffffff' : 'rgba(255,255,255,0.04)';
  const cardBorder  = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)';
  const cardBorderH = isLight ? 'rgba(24,200,255,0.5)' : 'rgba(24,200,255,0.35)';
  const nameColor   = isLight ? '#0d0f12' : '#ffffff';
  const descColor   = isLight ? '#4b5563' : 'rgba(255,255,255,0.6)';
  const sizeColor   = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const sizeBorder  = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
  const sizeText    = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
  const gridBg      = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  grid.style.background = gridBg;

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl mb-4 block">inventory_2</span>
        <p class="font-body-lg text-body-lg">No products in this category yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(product => {
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const safeName = escapeHtml(product.name);
    const safeDesc = escapeHtml(product.description || '');

    const sizesHTML = sizes.length > 0 ? `
      <div class="mb-3">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${sizeColor};margin-bottom:8px;">Size</p>
        <div class="flex flex-wrap gap-1.5 size-group">
          ${sizes.map(s => `
            <button class="size-btn text-xs font-bold px-2.5 py-1 transition-all duration-150"
              style="border:1px solid ${sizeBorder};color:${sizeText};background:transparent;border-radius:6px;cursor:pointer;"
              data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>
          `).join('')}
        </div>
      </div>` : '';

    // No inline onclick: product data is resolved from allProducts by id
    // in the delegated listener below (attribute-breakout-proof).
    const actionBtn = `<button class="add-to-cart-btn" data-product-id="${product.id}"
           style="width:100%;padding:11px;background:#18C8FF;color:#000;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity 0.2s, transform 0.15s;border-radius:6px;"
           onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1"
           onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
           <span class="material-symbols-outlined" style="font-size:16px;">add_shopping_cart</span> Add to Bag
         </button>`;

    const stockLabel = product.stock || 'In Stock';
    const stockColor = stockLabel === 'Limited' ? '#f97316' : '#22c55e';

    return `
      <div class="product-card group" data-category="${product.category || ''}"
        style="background:${cardBg};border:1px solid ${cardBorder};border-radius:8px;overflow:hidden;display:flex;flex-direction:column;transition:border-color 0.25s, transform 0.25s, box-shadow 0.25s;"
        onmouseover="this.style.borderColor='${cardBorderH}';this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 24px rgba(0,0,0,0.15)'" onmouseout="this.style.borderColor='${cardBorder}';this.style.transform='translateY(0)';this.style.boxShadow='none'">

        <!-- Image -->
        <div style="position:relative;aspect-ratio:4/5;overflow:hidden;background:rgba(255,255,255,0.05);">
          <img style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s;" loading="lazy"
            src="${product.image_url || ''}" alt="${safeName}"
            onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"/>
        </div>

        <!-- Info -->
        <div style="padding:16px 16px 18px;display:flex;flex-direction:column;flex:1;">
          <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:15px;color:${nameColor};line-height:1.35;margin-bottom:4px;">${safeName}</h3>
          <p style="font-weight:700;font-size:15px;color:#18C8FF;margin-bottom:10px;">KES ${(product.price||0).toLocaleString()}</p>
          <p style="font-size:13px;color:${descColor};line-height:1.5;margin-bottom:14px;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${safeDesc}</p>
          ${sizesHTML}
          ${actionBtn}
        </div>
      </div>`;
  }).join('');
}

// ===== CART SYSTEM =====
function addToCart(productId, productName, price, imageUrl, btnElement) {
  const productCard = btnElement?.closest('.product-card');
  const selectedSizeBtn = productCard?.querySelector('.size-btn[data-selected="true"]');
  const product = allProducts.find(p => p.id === productId);

  // Require size selection if product has sizes
  if (product?.sizes?.length > 0 && !selectedSizeBtn) {
    // Pulse the size group to prompt selection
    const sizeGroup = productCard?.querySelector('.size-group');
    if (sizeGroup) {
      sizeGroup.classList.add('ring-2', 'ring-red-400', 'rounded-lg', 'p-1');
      setTimeout(() => sizeGroup.classList.remove('ring-2', 'ring-red-400', 'rounded-lg', 'p-1'), 1500);
    }
    showToast('Please select a size first', 'error');
    return;
  }

  const selectedSize = selectedSizeBtn?.dataset.size || null;
  const existingIndex = cart.findIndex(item => item.id === productId && item.size === selectedSize);

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({ id: productId, name: productName, price, size: selectedSize, quantity: 1, image_url: imageUrl });
  }

  saveCart();
  updateCartDisplay();

  // Button feedback
  const btn = productCard?.querySelector('.add-to-cart-btn');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span> Added!';
    btn.classList.add('bg-tech-blue');
    btn.classList.remove('bg-on-surface');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('bg-tech-blue');
      btn.classList.add('bg-on-surface');
    }, 1500);
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  openCart(); // re-render
}

function updateQuantity(index, delta) {
  cart[index].quantity = Math.max(1, cart[index].quantity + delta);
  saveCart();
  openCart(); // re-render
}

function saveCart() {
  localStorage.setItem('iec-cart', JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

function updateCartDisplay() {
  document.querySelectorAll('.cart-count-badge').forEach(el => {
    el.textContent = getCartCount();
    el.classList.toggle('hidden', getCartCount() === 0);
  });
  // Update bag button badge
  const bagBadge = document.getElementById('bag-badge');
  if (bagBadge) {
    bagBadge.textContent = getCartCount();
    bagBadge.classList.toggle('hidden', getCartCount() === 0);
  }
}

// ===== CART UI =====
function openCart() {
  const modal = document.getElementById('cart-modal');
  const items = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  document.getElementById('cart-count').textContent = getCartCount();

  if (cart.length === 0) {
    items.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-5xl mb-3 block opacity-40 text-white/25">shopping_bag</span>
        <p class="font-semibold text-sm text-white/60 mb-3">Your bag is empty</p>
        <a href="#shop" onclick="closeCart()" class="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style="background: #18C8FF; color: #000;">
          <span class="material-symbols-outlined text-[16px]">arrow_downward</span> Start Shopping
        </a>
      </div>`;
    footer.classList.add('hidden');
    return;
  }

  footer.classList.remove('hidden');
  document.getElementById('cart-total').textContent = `KES ${getCartTotal().toLocaleString()}`;

  items.innerHTML = cart.map((item, index) => `
    <div class="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop'}"
        class="w-18 h-18 rounded-lg object-cover shrink-0" style="width:72px;height:72px;" alt="${item.name}"/>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-sm text-on-surface leading-tight truncate">${item.name}</p>
        <p class="text-xs text-on-surface-variant mt-0.5">
          KES ${item.price.toLocaleString()}${item.size ? ' &middot; Size ' + item.size : ''}
        </p>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="updateQuantity(${index}, -1)"
            class="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center text-sm font-bold hover:border-tech-blue hover:text-tech-blue transition-colors">−</button>
          <span class="w-5 text-center font-bold text-sm">${item.quantity}</span>
          <button onclick="updateQuantity(${index}, 1)"
            class="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center text-sm font-bold hover:border-tech-blue hover:text-tech-blue transition-colors">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2 shrink-0">
        <span class="font-bold text-sm text-on-surface">KES ${(item.price * item.quantity).toLocaleString()}</span>
        <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 transition-colors p-1">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function closeCart() {
  document.getElementById('cart-modal').classList.add('hidden');
  document.getElementById('cart-modal').classList.remove('flex');
  document.body.style.overflow = '';
}

// ===== CHECKOUT =====
function openCheckout() {
  document.getElementById('checkout-amount').textContent = `KES ${getCartTotal().toLocaleString()}`;
  document.getElementById('checkout-item-count').textContent = `${getCartCount()} item${getCartCount() !== 1 ? 's' : ''}`;
  document.getElementById('checkout-modal').classList.remove('hidden');
  document.getElementById('checkout-modal').classList.add('flex');
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.add('hidden');
  document.getElementById('checkout-modal').classList.remove('flex');
}

function handleWhatsAppOrder(e) {
  e.preventDefault();
  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();

  const itemLines = cart.map(item =>
    `  • ${item.name}${item.size ? ' (Size ' + item.size + ')' : ''} x${item.quantity} — KES ${(item.price * item.quantity).toLocaleString()}`
  ).join('\n');

  const message =
    `*New Merch Order — IEC JKUAT*\n\n` +
    `*Name:* ${name}\n` +
    `*Phone:* ${phone}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Total: KES ${getCartTotal().toLocaleString()}*\n\n` +
    `*Payment Instructions:*\n` +
    `Lipa na M-Pesa → Paybill *522522*\n` +
    `Account No: *1346900159*\n` +
    `Amount: *KES ${getCartTotal().toLocaleString()}*\n\n` +
    `I will send the M-Pesa confirmation once paid. Please confirm my order. Thank you!`;

  window.open(`https://wa.me/${CLUB_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

  cart = [];
  saveCart();
  updateCartDisplay();
  closeCheckout();
  closeCart();
  showToast('Order sent! Check WhatsApp to complete.', 'success');
}

// ===== DELEGATED CLICKS (no inline handlers — XSS-safe) =====
document.addEventListener('click', (e) => {
  const addBtn = e.target.closest?.('.add-to-cart-btn');
  if (addBtn) {
    const product = allProducts.find(p => String(p.id) === String(addBtn.dataset.productId));
    if (product) addToCart(product.id, product.name, product.price, product.image_url, addBtn);
    return;
  }
  if (e.target.classList.contains('size-btn')) {
    const isLight = document.documentElement.classList.contains('light');
    const group = e.target.closest('.size-group');
    group.querySelectorAll('.size-btn').forEach(btn => {
      btn.style.borderColor = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
      btn.style.background = 'transparent';
      btn.style.color = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
      btn.style.borderRadius = '6px';
      btn.removeAttribute('data-selected');
    });
    e.target.style.borderColor = '#18C8FF';
    e.target.style.background = 'rgba(24,200,255,0.12)';
    e.target.style.color = '#18C8FF';
    e.target.setAttribute('data-selected', 'true');
  }
});

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeCart(); closeCheckout(); }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});
