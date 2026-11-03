import React, { Suspense, lazy, useRef, useState } from 'react';
import { useMenu, StatusFilter } from './useMenu';
import { MenuProduct } from './api';
import { restoUz } from '../../i18n/uz';
import { DishForm } from './DishForm/DishForm';
import type { ParseResponse } from './BulkImport/types';
import {
  Card,
  Button,
  Modal,
  Skeleton,
  EmptyState,
  commonUz,
  fmtNum,
  t,
} from '@admins/shared';
import {
  Plus,
  Search,
  Star,
  Clock,
  Box,
  Copy,
  Edit2,
  Trash2,
  RotateCcw,
  UtensilsCrossed,
  FolderPlus,
  RefreshCw,
  Image as ImageIcon,
  Files,
} from 'lucide-react';

// Ommaviy qo'shish alohida bo'lak sifatida yuklanadi: oddiy menyu sahifasi yengil qoladi
const BulkImportScreen = lazy(() => import('./BulkImport/BulkImportScreen'));

const MenuProductsScreen: React.FC<{ onOpenBulkImport: (seed?: ParseResponse) => void }> = ({ onOpenBulkImport }) => {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
    toggleAvailability,
    toggleFeature,
    duplicate,
    remove,
    restore,
    saveProduct,
    addCategory,
  } = useMenu();

  // Modallar holati
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  // Taom formasida saqlanmagan o'zgarish bor (oyna chetini bosib yoki Esc bilan tasodifan yopishdan oldin so'raymiz)
  const dishDirtyRef = useRef(false);

  // Kategoriya formasi
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Taom formasi (yangi yoki tahrirlash) `DishForm/` da; u har ochilganda yangidan quriladi
  const openCreateModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: MenuProduct) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    dishDirtyRef.current = false;
    setIsProductModalOpen(false);
  };

  const requestCloseProductModal = () => {
    if (dishDirtyRef.current && !window.confirm(restoUz.dishForm.discardConfirm)) return;
    closeProductModal();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCatSubmitting(true);
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
    } finally {
      setCatSubmitting(false);
    }
  };

  const formatSum = (val?: number) => {
    return `${fmtNum(val || 0)} ${commonUz.currency}`;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sarlavha va Harakatlar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>
            {t('Menyu va Taomlar')}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {t('Restoran menyusi, narxlar va oshxona stop-listini tezkor boshqarish')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenBulkImport()}
            icon={<Files size={16} />}
          >
            {restoUz.bulkImport.openButton}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            icon={<FolderPlus size={16} />}
          >
            {t("Kategoriya qo'shish")}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            icon={<Plus size={16} />}
          >
            {t("Taom qo'shish")}
          </Button>
        </div>
      </div>

      {/* Kategoriya lentasi (Tabs) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        <button
          onClick={() => setSelectedCategory('')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: selectedCategory === '' ? 'var(--action)' : 'var(--bg-surface)',
            color: selectedCategory === '' ? 'var(--text-inverse)' : 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          {commonUz.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: selectedCategory === c.id ? 'var(--text-main)' : 'var(--bg-surface)',
              color: selectedCategory === c.id ? 'var(--bg-surface)' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Qidiruv va Holat filtrlari */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Qidiruv */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            minWidth: '260px',
            maxWidth: '360px',
            flex: 1,
          }}
        >
          <Search size={16} style={{ color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder={t('Taom nomini qidirish...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '14px',
              width: '100%',
            }}
          />
        </div>

        {/* Holat filter tugmalari */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          {(
            [
              { key: 'all', label: t('Barchasi') },
              { key: 'on', label: t('Sotuvda') },
              { key: 'off', label: t('Stop-list') },
              { key: 'hidden', label: t('Arxiv') },
            ] as { key: StatusFilter; label: string }[]
          ).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: statusFilter === filter.key ? 'var(--bg-elevated)' : 'transparent',
                color: statusFilter === filter.key ? 'var(--accent-emerald)' : 'var(--text-dim)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Taomlar ro'yxati (Grid) */}
      {loading && products.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height="220px" borderRadius="var(--radius-lg)" />
          ))}
        </div>
      ) : error && products.length === 0 ? (
        <EmptyState
          title={commonUz.errorOccurred}
          description={t(error.message)}
          action={
            <Button variant="primary" onClick={refresh} icon={<RefreshCw size={14} />}>
              {commonUz.retry}
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={36} />}
          title={t('Taomlar topilmadi')}
          description={t("Ushbu mezonlar bo'yicha menyuda taom mavjud emas. Yangi taom qo'shishingiz mumkin.")}
          action={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="primary" onClick={openCreateModal} icon={<Plus size={16} />}>
                {t("Birinchi taomni qo'shish")}
              </Button>
              <Button variant="secondary" onClick={() => onOpenBulkImport()} icon={<Files size={16} />}>
                {restoUz.bulkImport.openButton}
              </Button>
            </div>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {products.map((p) => (
            <Card
              key={p.id}
              hoverable
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                opacity: p.is_deleted ? 0.6 : p.is_available ? 1 : 0.75,
                borderColor: !p.is_available ? 'var(--accent-amber)' : undefined,
              }}
            >
              <div>
                {/* Rasm yoki Placeholder */}
                <div
                  style={{
                    height: '140px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={32} style={{ color: 'var(--text-dim)' }} />
                  )}

                  {/* 3D AR Badge */}
                  {(p.has_3d || p.ar_model) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: 'var(--scrim)',
                        color: 'var(--text-inverse)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Box size={12} />
                      3D AR
                    </span>
                  )}

                  {/* Featured Button */}
                  <button
                    onClick={() => toggleFeature(p)}
                    title={p.is_featured ? t('Tavsiyani bekor qilish') : t('Tavsiya qilish')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'var(--scrim)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: p.is_featured ? 'var(--accent-amber)' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <Star size={16} fill={p.is_featured ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Nomi va Kategoriya */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      lineHeight: 1.3,
                    }}
                  >
                    {p.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--accent-emerald)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatSum(p.price)}
                  </span>
                </div>

                {/* Tayyorlanish vaqti */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--text-dim)',
                    marginTop: '6px',
                  }}
                >
                  <Clock size={13} />
                  <span>{t('{n} daqiqa', { n: p.prep_minutes || p.cook_min || 15 })}</span>
                </div>
              </div>

              {/* Stop-List va Harakatlar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                {/* Stop-List toggle */}
                {p.is_deleted ? (
                  <span style={{ fontSize: '12px', color: 'var(--accent-rose)', fontWeight: 600 }}>
                    {t('Arxivlangan')}
                  </span>
                ) : (
                  <button
                    onClick={() => toggleAvailability(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: 'none',
                      backgroundColor: p.is_available ? 'var(--accent-emerald-bg)' : 'var(--accent-rose-bg)',
                      color: p.is_available ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                      }}
                    />
                    {p.is_available ? t('Sotuvda') : t('Stop-list')}
                  </button>
                )}

                {/* Amallar */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {p.is_deleted ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => restore(p)}
                      title={t('Qayta tiklash')}
                      icon={<RotateCcw size={14} />}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => duplicate(p)}
                        title={t('Nusxalash')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Copy size={15} />
                      </button>

                      <button
                        onClick={() => openEditModal(p)}
                        title={t('Tahrirlash')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => remove(p)}
                        title={t('Yashirish (arxiv)')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-rose)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Taom Yaratish / Tahrirlash Modali: ichidagi forma `DishForm/` da */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={requestCloseProductModal}
        title={editingProduct ? t('Taomni tahrirlash') : t("Yangi taom qo'shish")}
        maxWidth="760px"
      >
        <DishForm
          product={editingProduct}
          categories={categories}
          tabCategoryId={selectedCategory ? String(selectedCategory) : ''}
          fallbackCategoryId={String(categories[0]?.id || '')}
          onSave={saveProduct}
          onAddCategory={addCategory}
          onCancel={closeProductModal}
          onSaved={closeProductModal}
          onOpenBulkImport={(response) => {
            closeProductModal();
            onOpenBulkImport(response);
          }}
          onDirtyChange={(dirty) => {
            dishDirtyRef.current = dirty;
          }}
        />
      </Modal>

      {/* Kategoriya Yaratish Modali */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t("Yangi Kategoriya Qo'shish")}
        maxWidth="400px"
      >
        <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              {t('Kategoriya nomi *')}
            </label>
            <input
              type="text"
              required
              placeholder={t('Masalan: Gazaklar, Ichimliklar...')}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              {commonUz.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={catSubmitting}>
              {commonUz.save}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/**
 * Menyu sahifasi: taomlar ro'yxati yoki "Ommaviy qo'shish" ekrani. Ro'yxatga qaytganda u qayta ochiladi,
 * shuning uchun yangi taomlar va bo'limlar darrov ko'rinadi.
 */
export const MenuPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'import'>('list');
  // Taom formasi menyu suratini o'qib, ko'p taom topsa: shu natija bilan "Ommaviy qo'shish" darrov tekshirish bosqichida ochiladi
  const [importSeed, setImportSeed] = useState<ParseResponse | undefined>(undefined);
  if (view === 'import') {
    return (
      <Suspense
        fallback={
          <div style={{ padding: '24px' }}>
            <Skeleton height="40px" width="240px" style={{ marginBottom: '16px' }} />
            <Skeleton height="220px" borderRadius="var(--radius-lg)" />
          </div>
        }
      >
        <BulkImportScreen
          initial={importSeed}
          onClose={() => {
            setImportSeed(undefined);
            setView('list');
          }}
        />
      </Suspense>
    );
  }
  return (
    <MenuProductsScreen
      onOpenBulkImport={(seed) => {
        setImportSeed(seed);
        setView('import');
      }}
    />
  );
};

export default MenuPage;
