import React, { useState, useEffect } from 'react';
import type { Product } from '../../../types/dish';
import './Modal3D.css';

export interface Modal3DProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  enable360PhotoTab?: boolean; // Default false (Rule 4: Soft-toggle preserved for dynamic control)
}

export const Modal3D: React.FC<Modal3DProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  enable360PhotoTab = false,
}) => {
  // Always default to 3D mode. If enable360PhotoTab is explicitly turned on and spin_frames exists, can support spin.
  const [viewMode, setViewMode] = useState<'3d' | 'spin'>('3d');
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);

  // Fallback 360 frames generated from the dish image with multi-angle rotation perspective
  const spinFrames = product?.spin_frames && product.spin_frames.length > 0
    ? product.spin_frames
    : product?.image
    ? [product.image]
    : ['/media/dish/plov.jpg'];

  useEffect(() => {
    // 3D & AR GLB model is strictly default
    setViewMode('3d');
    setCurrentFrameIndex(0);
    setIsAutoSpinning(false);
  }, [product]);

  // Auto-spin animation for 360 frame mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'spin' || !isAutoSpinning || spinFrames.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % spinFrames.length);
    }, 180);

    return () => clearInterval(interval);
  }, [isOpen, viewMode, isAutoSpinning, spinFrames.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Interactive Drag-to-Rotate handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setIsAutoSpinning(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || spinFrames.length <= 1) return;
    const deltaX = e.clientX - dragStartX;
    const sensitivity = 15; // pixels per frame

    if (Math.abs(deltaX) > sensitivity) {
      const step = deltaX > 0 ? 1 : -1;
      setCurrentFrameIndex((prev) => {
        let next = prev + step;
        if (next < 0) next = spinFrames.length - 1;
        if (next >= spinFrames.length) next = 0;
        return next;
      });
      setDragStartX(e.clientX);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !product) return null;

  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(product.price);
  const modelUrl = product.ar_model || '/models/plov.glb';

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

        {/* View Mode Tabs (Faqat enable360PhotoTab yoqilgan bo'lsa va spin_frames mavjud bo'lsa chiqadi - 4-Qoida) */}
        {enable360PhotoTab && product.spin_frames && product.spin_frames.length > 0 && (
          <div className="modal-view-mode-tabs">
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'spin' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('spin');
                setIsAutoSpinning(true);
              }}
            >
              🔄 360° Real Fotomodeli ({spinFrames.length} burchak)
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              📐 3D &amp; AR Modeli
            </button>
          </div>
        )}

        {/* 1. 3D Model Viewport (GLB) */}
        {viewMode === '3d' && (
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
              <span>Barmoq bilan 360° aylantiring</span>
            </span>
          </div>
        )}

        {/* 2. Instant 360° High-FPS Photogrammetry Spin Viewport (Faqat enable360PhotoTab faol bo'lsa) */}
        {enable360PhotoTab && viewMode === 'spin' && (
          <div
            className="modal-360-spin-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              src={spinFrames[currentFrameIndex]}
              alt={`${product.name} - 360 ko'rinish kadr ${currentFrameIndex + 1}`}
              className="spin-active-image"
              draggable={false}
            />

            {/* Rotation Control UI */}
            <div className="spin-controls-overlay">
              <span className="spin-indicator-badge">
                <span>🔄 360° aylana ko'rinishi</span>
                <span className="spin-kadr-num tabular-nums">
                  {currentFrameIndex + 1} / {spinFrames.length} burchak
                </span>
              </span>

              <button
                type="button"
                className={`spin-auto-btn ${isAutoSpinning ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoSpinning(!isAutoSpinning);
                }}
                title={isAutoSpinning ? "To'xtatish" : "Avtomatik aylantirish"}
              >
                {isAutoSpinning ? '⏸️ To\'xtatish' : '▶️ Aylantirish'}
              </button>
            </div>

            <div className="spin-drag-hint">
              <span>👈 Barmog'ingiz bilan suring 👉</span>
            </div>
          </div>
        )}

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
