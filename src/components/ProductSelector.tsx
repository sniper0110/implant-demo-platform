import { PRODUCTS } from '../data/products';
import type { ProductId } from '../types';

interface ProductSelectorProps {
  activeProductId: ProductId;
  onSelect: (id: ProductId) => void;
}

export function ProductSelector({ activeProductId, onSelect }: ProductSelectorProps) {
  return (
    <div className="product-list">
      {PRODUCTS.map((product) => (
        <button
          key={product.id}
          className={`product-btn ${product.id === activeProductId ? 'active' : ''}`}
          onClick={() => onSelect(product.id)}
          aria-pressed={product.id === activeProductId}
        >
          <span className="product-btn-name">{product.name}</span>
          <span className="product-btn-category">{product.category}</span>
          <span className="product-btn-region">{product.region}</span>
        </button>
      ))}
    </div>
  );
}
