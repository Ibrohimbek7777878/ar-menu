import React, { useEffect } from 'react';
import type { Product } from '../../../types/dish';
import './Modal3D.css';

export interface Modal3DProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
}

export const Modal3D: React.FC<Modal3DProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(product.price);
  const modelUrl = product.ar_model || '/media/ar/glb/plov.glb';

  const handleARClick = () => {
    const viewer = document.getElementById('reactModelViewer') as any;
    if (viewer && viewer.canActivateAR) {
      viewer.activateAR();
    } else {
      alert("AR rejimini mobil telefon kamerasida oching.");
    }
  };

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product);
      onClose();
    }
  };

  return (
    <div className="react-modal-backdrop" onClick={onClose}>
      <div className="react-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-round" onClick={onClose} aria-label="Yopish">
          ✕
        </button>

        {/* 3D Model Viewport */}
        <div className="modal-3d-viewport">
          {/* @ts-ignore */}
          <model-viewer
            id="reactModelViewer"
            src={modelUrl}
            poster={product.image || ''}
            alt={product.name}
            auto-rotate
            rotation-per-second="25deg"
            camera-controls
            shadow-intensity="1.5"
            environment-image="neutral"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
          />
          <span className="modal-3d-tip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            <span>360° aylantiring</span>
          </span>
        </div>

        {/* Details & Actions */}
        <div className="modal-3d-info">
          <div className="modal-info-header">
            <h3 className="modal-dish-name">{product.name}</h3>
            <span className="modal-dish-price tabular-nums">{formattedPrice} so'm</span>
          </div>

          {product.description && (
            <p className="modal-dish-desc">{product.description}</p>
          )}

          <div className="modal-3d-buttons">
            <button type="button" className="btn-modal-ar" onClick={handleARClick}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
              </svg>
              <span>Stolda ko'rish (AR)</span>
            </button>
            <button type="button" className="btn-modal-cart" onClick={handleAdd}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <span>Savatga qo'shish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
