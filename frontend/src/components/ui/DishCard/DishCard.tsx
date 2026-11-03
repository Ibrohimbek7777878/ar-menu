import React, { useState } from 'react';
import type { Product } from '../../../types/dish';
import './DishCard.css';
import { flyToCart } from '../../../utils/cartFly';
import { spin3d } from '../../../motion/fx';
import { fmtNum, getLang, t } from '../../../i18n';
import { dishDescription, dishName, localizeMeasure } from '../../../utils/dishText';

export interface DishCardProps {
  product: Product;
  quantity?: number;
  onAddToCart?: (product: Product) => void;
  onUpdateQuantity?: (productId: number, delta: number) => void;
  onOpen3D?: (product: Product) => void;
  /** Berilsa, karta (rasm, nom, narx) bosilganda taom oynasi ochiladi; berilmasa avvalgi xatti-harakat (faqat 3D taomda 3D oyna) */
  onOpenDetail?: (product: Product) => void;
  className?: string;
  layout?: 'grid' | 'horizontal';
}

export const DishCard: React.FC<DishCardProps> = ({
  product,
  quantity = 0,
  onAddToCart,
  onUpdateQuantity,
  onOpen3D,
  onOpenDetail,
  className = '',
  layout = 'grid',
}) => {
  const [imgError, setImgError] = useState(false);

  const lang = getLang();
  const name = dishName(product, lang);
  const description = dishDescription(product, lang);
  const formattedPrice = fmtNum(product.price);
  const formattedOldPrice = product.old_price
    ? fmtNum(product.old_price)
    : null;

  const handleMediaClick = () => {
    if (onOpenDetail) {
      onOpenDetail(product);
      return;
    }
    if (product.has_3d && onOpen3D) {
      onOpen3D(product);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    flyToCart(e.currentTarget as Element);
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
    <article className={`dish-card layout-${layout}${onOpenDetail ? ' has-detail' : ''} ${className}`}>
      {/* ─── Media Container ─── */}
      <div
        className="dish-card-media"
        onClick={handleMediaClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMediaClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={onOpenDetail ? t('{name}: batafsil', { name }) : undefined}
      >
        {product.image && !imgError ? (
          <img 
            src={product.image} 
            alt={name} 
            className="dish-card-img" 
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="dish-card-placeholder" data-letter={name.trim().charAt(0).toUpperCase()}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        )}

        {/* Top Badges (No technical jargon, only food status) */}
        <div className="dish-card-badges">
          {product.has_3d && (
            <span className="badge-3d-clean">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>360°</span>
            </span>
          )}
          {!product.has_3d && (product.model_status === 'queued' || product.model_status === 'processing') && (
            <span className="badge-tag-clean" title={t("Taom rasmidan 3D ko'rinish tayyorlanmoqda")}>{t('3D tayyorlanmoqda…')}</span>
          )}
          {product.is_popular && (
            <span className="badge-tag-clean tag-popular">{t('Hit')}</span>
          )}
          {product.is_new && (
            <span className="badge-tag-clean tag-new">{t('Yangi')}</span>
          )}
          {product.is_halal && (
            <span className="badge-tag-clean tag-halal">{t('Halol')}</span>
          )}
        </div>

        {/* 360 View Trigger (Human, clear Uzbek phrase) */}
        {product.has_3d && (
          <button 
            type="button" 
            className="btn-trigger-3d"
            onClick={(e) => {
              e.stopPropagation();
              spin3d(e.currentTarget.querySelector('svg'));
              if (onOpen3D) onOpen3D(product);
            }}
            title={t("Taomni 360 daraja aylantirib ko'rish")}
            aria-label={t("360 daraja ko'rish")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{t('360° aylantirish')}</span>
          </button>
        )}
      </div>

      {/* ─── Content Body ─── */}
      <div className="dish-card-body" onClick={onOpenDetail ? () => onOpenDetail(product) : undefined}>
        {/* Meta badges: time & weight */}
        {(product.prep_time || product.weight) && (
          <div className="dish-card-meta">
            {product.prep_time && <span>{localizeMeasure(product.prep_time, lang)}</span>}
            {product.prep_time && product.weight && <span className="meta-sep">·</span>}
            {product.weight && <span>{localizeMeasure(product.weight, lang)}</span>}
          </div>
        )}

        <h3 className="dish-card-title">{name}</h3>
        
        {/* Description strictly clamped so it fits on mobile screens */}
        {description && (
          <div className="dish-card-desc-wrap">
            <p className="dish-card-desc">{description}</p>
          </div>
        )}

        {/* ─── Separated Footer: Price Row and Action Row on Mobile ─── */}
        <div className="dish-card-footer">
          <div className="dish-card-price-row">
            {formattedOldPrice && (
              <span className="price-old tabular-nums">{formattedOldPrice} {t("so'm")}</span>
            )}
            <div className="price-current">
              <span className="price-val tabular-nums">{formattedPrice}</span>
              <span className="price-unit">{t("so'm")}</span>
            </div>
          </div>

          <div className="dish-card-action-row">
            {quantity > 0 ? (
              <div className="card-stepper" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button" 
                  className="stepper-btn" 
                  onClick={handleDecrement}
                  aria-label={t('Kamaytirish')}
                >
                  −
                </button>
                <span className="stepper-val tabular-nums">{quantity}</span>
                <button 
                  type="button" 
                  className="stepper-btn" 
                  onClick={handleIncrement}
                  aria-label={t("Ko'paytirish")}
                >
                  +
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="btn-add-to-cart"
                onClick={handleAdd}
                aria-label={t("{name} savatga qo'shish", { name })}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{t("Qo'shish")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
