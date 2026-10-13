import React, { useState, useId, useEffect } from 'react';
import type { Product } from '../../../types/dish';
import { RestaurantAPI } from '../../../services/RestaurantAPI';
import { AVAILABLE_3D_MODELS, match3DModel, type Model3DItem } from '../../../services/Smart3DMatcher';
import './PhotogrammetryStudioModal.css';

export interface PhotogrammetryStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct3D: (newProduct: Partial<Product>) => void;
}

export const PhotogrammetryStudioModal: React.FC<PhotogrammetryStudioModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct3D,
}) => {
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('45000');
  const [dishCategory, setDishCategory] = useState('Asosiy taomlar');
  const [dishDesc, setDishDesc] = useState('');
  const [dishImage, setDishImage] = useState<string>('/media/dish/plov.jpg');

  // 3D Configuration
  const [enable3D, setEnable3D] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Model3DItem | null>(AVAILABLE_3D_MODELS[0]);
  const [customGlbUrl, setCustomGlbUrl] = useState<string | null>(null);
  const [customGlbName, setCustomGlbName] = useState<string>('');
  const [autoMatched, setAutoMatched] = useState<boolean>(false);

  const fileInputId = useId();
  const glbInputId = useId();

  // Smart 3D Auto-Match trigger whenever dishName or dishCategory changes
  useEffect(() => {
    if (!dishName.trim()) return;

    const matched = match3DModel(dishName, dishCategory);
    if (matched) {
      setSelectedModel(matched);
      setCustomGlbUrl(null);
      setAutoMatched(true);
      setEnable3D(true);
    } else {
      setAutoMatched(false);
    }
  }, [dishName, dishCategory]);

  if (!isOpen) return null;

  // Active GLB URL for preview
  const activeGlbUrl = customGlbUrl || (selectedModel ? selectedModel.glbUrl : '');

  // 2D Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDishImage(url);
    }
  };

  // Custom GLB File Upload
  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        alert("Iltimos, faqat .glb formatidagi 3D model faylini yuklang!");
        return;
      }
      const url = URL.createObjectURL(file);
      setCustomGlbUrl(url);
      setCustomGlbName(file.name);
      setSelectedModel(null);
      setAutoMatched(false);
      setEnable3D(true);
    }
  };

  const handleSelectModel = (model: Model3DItem) => {
    setSelectedModel(model);
    setCustomGlbUrl(null);
    setAutoMatched(false);
    setEnable3D(true);
  };

  const handleSave = () => {
    if (!dishName.trim()) {
      alert("Iltimos, taom nomini kiriting!");
      return;
    }

    const has3D = enable3D && Boolean(activeGlbUrl);

    const newDish: Partial<Product> = {
      id: Date.now(),
      name: dishName,
      price: Number(dishPrice) || 45000,
      category_name: dishCategory,
      description: dishDesc || "Restoran oshpazi tomonidan tayyorlangan mazali taom",
      image: dishImage,
      has_3d: has3D,
      ar_model: has3D ? activeGlbUrl : undefined,
    };

    // Backend PostgreSQL/SQLite bazasiga yozish
    RestaurantAPI.saveProduct3DScan(newDish as any);

    onSaveProduct3D(newDish);
    onClose();
  };

  return (
    <div className="photogram-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="photogram-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <header className="photogram-header">
          <div className="photogram-header-left">
            <div className="photogram-icon-mark">🧊</div>
            <div>
              <h2 className="photogram-title">Smart 3D Taomlar Studiyasi</h2>
              <p className="photogram-subtitle">
                Restoran taomlari uchun fotorealistik 3D GLB modellari va WebXR AR boshqaruvi
              </p>
            </div>
          </div>
          <button type="button" className="photogram-close" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </header>

        {/* MODAL BODY */}
        <div className="photogram-body">
          {/* LEFT: TAOM VA 3D SOZLAMALARI */}
          <div className="photogram-controls">
            <div className="photo-group">
              <label className="photo-label">Taom Nomi</label>
              <input
                type="text"
                className="photo-input-text"
                placeholder="Masalan: G'ijduvoncha qiyma shashlik, To'y oshi..."
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
              />
              {autoMatched && selectedModel && (
                <div className="smart-match-badge">
                  <span>✨ Aqlli moslandi:</span>
                  <strong>{selectedModel.name}</strong>
                </div>
              )}
            </div>

            <div className="photo-row">
              <div className="photo-group" style={{ flex: 1 }}>
                <label className="photo-label">Narxi (so'm)</label>
                <input
                  type="number"
                  className="photo-input-text"
                  value={dishPrice}
                  onChange={(e) => setDishPrice(e.target.value)}
                />
              </div>
              <div className="photo-group" style={{ flex: 1.2 }}>
                <label className="photo-label">Toifasi</label>
                <select
                  className="photo-input-text"
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value)}
                >
                  <option value="Asosiy taomlar">Asosiy taomlar</option>
                  <option value="Shoʻrvalar">Shoʻrvalar</option>
                  <option value="Salatlar & Desert">Salatlar & Desert</option>
                  <option value="Pishiriqlar & Non">Pishiriqlar & Non</option>
                  <option value="Ichimliklar">Ichimliklar</option>
                </select>
              </div>
            </div>

            <div className="photo-group">
              <label className="photo-label">Taomning 2D Fotosurati</label>
              <div className="photo-upload-row">
                <img src={dishImage} alt="Dish preview" className="photo-thumb-preview" />
                <label htmlFor={fileInputId} className="photo-upload-btn">
                  📷 Rasm Tanlash
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            {/* 3D TOGGLE */}
            <div className="photo-group 3d-toggle-group">
              <label className="switch-toggle-label">
                <input
                  type="checkbox"
                  checked={enable3D}
                  onChange={(e) => setEnable3D(e.target.checked)}
                />
                <span className="switch-text">Ushbu taom uchun 3D ko'rinishni faollashtirish</span>
              </label>
            </div>

            {enable3D && (
              <>
                {/* 3D LIBRARY SELECTION */}
                <div className="photo-group">
                  <div className="section-label-row">
                    <label className="photo-label">3D Kutubxonadan Tanlash ({AVAILABLE_3D_MODELS.length} ta)</label>
                  </div>
                  <div className="models-catalog-grid">
                    {AVAILABLE_3D_MODELS.map((model) => {
                      const isSelected = selectedModel?.id === model.id && !customGlbUrl;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          className={`model-catalog-card ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectModel(model)}
                          title={model.description}
                        >
                          <span className="card-model-icon">{model.icon}</span>
                          <span className="card-model-name">{model.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CUSTOM GLB UPLOAD */}
                <div className="photo-group">
                  <label className="photo-label">Yoki O'z .glb 3D Faylingizni Yuklang</label>
                  <div className="glb-upload-zone">
                    <label htmlFor={glbInputId} className="glb-upload-label">
                      <span className="glb-upload-icon">📦</span>
                      <div className="glb-upload-text">
                        {customGlbName ? (
                          <strong className="text-green">✓ {customGlbName}</strong>
                        ) : (
                          <span>Kompyuterdan .glb faylni tanlang</span>
                        )}
                        <small>Fotorealistik PBR 3D model (max 15MB)</small>
                      </div>
                    </label>
                    <input
                      id={glbInputId}
                      type="file"
                      accept=".glb,model/gltf-binary"
                      className="hidden-file-input"
                      onChange={handleGlbUpload}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="photo-group">
              <label className="photo-label">Qisqacha Tavsifi</label>
              <textarea
                className="photo-input-text photo-textarea"
                rows={2}
                placeholder="Retsepti, asosiy masalliqlari va xususiyatlari..."
                value={dishDesc}
                onChange={(e) => setDishDesc(e.target.value)}
              />
            </div>
          </div>

          {/* RIGHT: LIVE 3D PREVIEW */}
          <div className="photogram-preview-panel">
            <div className="preview-viewport-header">
              <span className="preview-badge">
                {enable3D && activeGlbUrl ? '🎮 Jonli 3D Viewport' : '🖼️ 2D Foto Viewport'}
              </span>
              <span className="preview-model-tag">
                {customGlbName ? `Yuklangan: ${customGlbName}` : selectedModel?.name || "3D o'chirilgan"}
              </span>
            </div>

            <div className="preview-canvas-container">
              {enable3D && activeGlbUrl ? (
                <>
                  {/* @ts-ignore */}
                  <model-viewer
                    src={activeGlbUrl}
                    poster={dishImage}
                    alt={dishName || "3D Dish"}
                    auto-rotate
                    rotation-per-second="25deg"
                    camera-controls
                    shadow-intensity="1.5"
                    environment-image="neutral"
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    ar-scale="auto"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="preview-tip-banner">
                    <span>🔄 Sichqoncha yoki barmoq bilan 360° aylantiring</span>
                  </div>
                </>
              ) : (
                <div className="preview-2d-display">
                  <img src={dishImage} alt={dishName} className="preview-2d-img" />
                  <p className="preview-2d-hint">Ushbu taom standart 2D formatda ko'rsatiladi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="photogram-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="button" className="btn-save-3d" onClick={handleSave}>
            💾 Taomni Menyuga Saqlash
          </button>
        </footer>
      </div>
    </div>
  );
};
