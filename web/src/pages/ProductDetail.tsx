import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getProducts } from '../lib/supabase';
import { parseJsonList } from '../lib/media';
import type { Product } from '../types/db';
import ProductColorPicker from '../components/ProductColorPicker';

type ProductWithOptions = Product & { sizeList: string[]; colorList: string[] };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<ProductWithOptions | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setProduct(null);
    setSelectedSize(null);
    setSelectedColor(null);

    getProducts()
      .then((products) => {
        if (!active) return;
        const found = products.find((candidate) => candidate.id === id);
        if (!found) {
          setError('This product could not be found.');
          return;
        }
        setProduct({
          ...found,
          sizeList: parseJsonList(found.sizes),
          colorList: parseJsonList(found.colors),
        });
        document.title = `${found.name} | IEC JKUAT`;
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this product.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  function addProductToCart() {
    if (!product) return;
    if (product.sizeList.length > 0 && !selectedSize) {
      toast('Please select a size first', 'error');
      return;
    }
    if (product.colorList.length > 0 && !selectedColor) {
      toast('Please select a color first', 'error');
      return;
    }

    add({
      id: product.id,
      name: product.name,
      price: product.price || 0,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      colorOptions: product.colorList.length ? product.colorList : undefined,
      image_url: product.image_url || undefined,
    });
    toast(`${product.name} added to cart`, 'success');
  }

  return (
    <main className="product-detail-page">
      <div className="product-detail-shell">
        <Link to="/products" className="product-detail-back">
          <FiArrowLeft aria-hidden="true" /> Back to Products
        </Link>

        {loading ? (
          <p className="product-detail-message" role="status">Loading product details…</p>
        ) : error || !product ? (
          <section className="product-detail-message" role="alert">
            <h1>Product unavailable</h1>
            <p>{error || 'This product could not be found.'}</p>
            <Link to="/products">Browse all products</Link>
          </section>
        ) : (
          <article className="product-detail-card">
            <div className="product-detail-image-wrap">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="product-detail-image" />
              ) : (
                <div className="product-detail-image-placeholder" aria-hidden="true">
                  <FiShoppingCart />
                </div>
              )}
            </div>
            <div className="product-detail-copy">
              <p className="product-detail-kicker">{product.category || 'IEC JKUAT merchandise'}</p>
              <h1>{product.name}</h1>
              <p className="product-detail-price">KES {(product.price || 0).toLocaleString()}</p>
              <p className="product-detail-description">
                {product.description || 'No additional description is available for this product.'}
              </p>

              {product.sizeList.length > 0 && (
                <fieldset className="product-detail-sizes">
                  <legend>Choose a size</legend>
                  <div>
                    {product.sizeList.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selectedSize === size}
                        className={selectedSize === size ? 'is-selected' : ''}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <ProductColorPicker colors={product.colorList} value={selectedColor} onChange={setSelectedColor} />

              {product.is_member_exclusive && (
                <p className="product-detail-exclusive"><FiCheck aria-hidden="true" /> Member-exclusive product</p>
              )}

              <button type="button" className="product-detail-add" onClick={addProductToCart}>
                <FiShoppingCart aria-hidden="true" /> Add to Cart
              </button>
              <Link to="/cart" className="product-detail-cart-link">Go to Cart</Link>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
