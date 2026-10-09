import React, { useState } from 'react';
import type { Product } from '../../../types/dish';
import './DishCard.css';

export interface DishCardProps {
  product: Product;
  layout?: 'vertical' | 'horizontal';
  quantity?: number;
  onAddToCart?: (product: Product) => void;
  onUpdateQuantity?: (productId: number, delta: number) => void;
  onOpen3D?: (product: Product) => void;
  className?: string;
}

export const DishCard: React.FC<DishCardProps> = ({
  product,
  layout = 'vertical',
  quantity = 0,
  onAddToCart,
  onUpdateQuantity,
  onOpen3D,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(product.price);
  const formattedOldPrice = product.old_price 
    ? new Intl.NumberFormat('uz-UZ').format(product.old_price) 
    : null;

  const handleMediaClick = () => {
    if (product.has_3d && onOpen3D) {
      onOpen3D(product);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateQuantity) {
      onUpdateQuantity(product.id, -1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateQuantity) {
      onUpdateQuantity(product.id, 1);
    }
  };

  return (
    <article className={`dish-card layout-${layout} ${className}`}>
      {/* ─── Media Container ─── */}
      <div className="dish-card-media" onClick={handleMediaClick} role="button" tabIndex={0}>
        {product.image && !imgError ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="dish-card-img" 
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="dish-card-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        )}

        {/* Minimalist Top Badges */}
        <div className="dish-card-badges">
          {product.has_3d && (
            <span className="badge-3d-clean">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>3D</span>
            </span>
          )}
          {product.is_halal && (
            <span className="badge-tag-clean tag-halal">Halol</span>
          )}
          {product.is_popular && (
            <span className="badge-tag-clean tag-popular">Tavsiya</span>
          )}
        </div>

        {/* 360 View Trigger */}
        {product.has_3d && (
          <button 
            type="button" 
            className="btn-trigger-3d"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpen3D) onOpen3D(product);
            }}
            title="3D ko'rinishda tomosha qilish"
            aria-label="3D ko'rinish"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>360° ko'rish</span>
          </button>
        )}
      </div>

      {/* ─── Content Body ─── */}
      <div className="dish-card-body">
        {/* Meta badges: time & weight */}
        {(product.prep_time || product.weight) && (
          <div className="dish-card-meta">
            {product.prep_time && <span>{product.prep_time}</span>}
            {product.prep_time && product.weight && <span className="meta-sep">·</span>}
            {product.weight && <span>{product.weight}</span>}
          </div>
        )}

        <h3 className="dish-card-title">{product.name}</h3>
        
        {product.description && (
          <p className="dish-card-desc">{product.description}</p>
        )}

        {/* ─── Footer: Price & Add Action ─── */}
        <div className="dish-card-footer">
          <div className="dish-card-price-group">
            {formattedOldPrice && (
              <span className="price-old tabular-nums">{formattedOldPrice} so'm</span>
            )}
            <div className="price-current">
              <span className="price-val tabular-nums">{formattedPrice}</span>
              <span className="price-unit">so'm</span>
            </div>
          </div>

          {quantity > 0 ? (
            <div className="card-stepper" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button" 
                className="stepper-btn" 
                onClick={handleDecrement}
                aria-label="Kamaytirish"
              >
                −
              </button>
              <span className="stepper-val tabular-nums">{quantity}</span>
              <button 
                type="button" 
                className="stepper-btn" 
                onClick={handleIncrement}
                aria-label="Oshirish"
              >
                +
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className="btn-add-to-cart"
              onClick={handleAdd}
              aria-label="Savatga qo'shish"
            >
              <span>+ Savatga</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
