import React, { useEffect, useRef, useState } from 'react';
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

  // GLB yuklanmasa (fayl yo'q / buzilgan) — 3D o'rniga rasm ko'rsatiladi (TZ R-3D-03)
  const viewerRef = useRef<HTMLElement | null>(null);
  const [failedModelUrl, setFailedModelUrl] = useState<string | null>(null);
  const currentModelUrl = product?.ar_model || '';
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !currentModelUrl) return;
    const onError = () => setFailedModelUrl(currentModelUrl);
    el.addEventListener('error', onError);
    return () => el.removeEventListener('error', onError);
  }, [isOpen, currentModelUrl]);

  if (!isOpen || !product) return null;

  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(product.price);
  const modelUrl = product.ar_model || '';
  const modelFailed = Boolean(modelUrl) && failedModelUrl === modelUrl;
  const hasValid3D = Boolean(product.has_3d && modelUrl) && !modelFailed;

  const handleARClick = () => {
    const viewer = document.getElementById('reactModelViewer') as any;
    if (viewer && viewer.canActivateAR) {
      viewer.activateAR();
    } else {
      alert("AR rejimini mobil telefon brauzeri kamerasida oching.");
    }
  };

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product);
      onClose();
    }
  };

  return (
    <div className="react-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="react-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-round" onClick={onClose} aria-label="Yopish">
          ✕
        </button>

        {/* 1. Sof Haqiqiy 3D Model Viewport (GLB) & AR yoki Yuqori sifatli 2D Foto */}
        <div className="modal-3d-viewport">
          {hasValid3D ? (
            <>
              {/* @ts-ignore */}
              <model-viewer
                id="reactModelViewer"
                ref={viewerRef}
                src={modelUrl}
                poster={product.image || ''}
                alt={product.name}
                camera-orbit="0deg 55deg auto"
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
                <span>Barmoq bilan 360° aylantiring</span>
              </span>
            </>
          ) : (
            <div className="modal-2d-fallback" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F8F6', position: 'relative' }}>
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: '16px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.08))' }}
                />
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: '15px' }}>Rasm hali qo'yilmagan</span>
              )}
              <span className="modal-3d-tip" style={{ background: 'rgba(255,255,255,0.92)', color: '#374151' }}>
                <span>
                  {modelFailed
                    ? "3D model yuklanmadi — rasm ko'rsatilmoqda"
                    : product.model_status === 'queued' || product.model_status === 'processing'
                      ? '3D ko\'rinish tayyorlanmoqda…'
                      : "📸 Real Fotosurat ko'rinishi"}
                </span>
              </span>
            </div>
          )}
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

          {/* Real Taom Texnik Parametrlari */}
          <div className="modal-specs-row">
            {product.weight && (
              <span className="modal-spec-chip">
                ⚖️ <strong>{product.weight}</strong>
              </span>
            )}
            {product.prep_time && (
              <span className="modal-spec-chip">
                ⏱️ <strong>{product.prep_time}</strong>
              </span>
            )}
            {product.is_halal && (
              <span className="modal-spec-chip text-green">
                🌿 Halol
              </span>
            )}
          </div>

          <div className="modal-3d-buttons">
            <button type="button" className="btn-modal-ar" onClick={handleARClick}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
              </svg>
              <span>Stol ustida ko'rish (AR)</span>
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
