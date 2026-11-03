import React, { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatCard,
  fmtNum,
  t,
  tr,
  useToast,
} from '@admins/shared';
import {
  AlertCircle,
  Armchair,
  Check,
  Copy,
  Edit2,
  Layers,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createHall,
  createTable,
  HallItem,
  TableItem,
  updateTable,
} from './api';
import { useTables } from './useTables';

// Holat nomlari tr() bilan belgilangan, ko'rsatishda t() chaqiriladi (modul bir marta bajariladi: til almashganda yangilanishi uchun).
const STATUS_CONFIG: Record<
  TableItem['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  free: {
    label: tr("Bo'sh"),
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  occupied: {
    label: tr('Band'),
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  ordering: {
    label: tr('Buyurtma'),
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  waiting: {
    label: tr('Kutmoqda'),
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  ready: {
    label: tr('Tayyor'),
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  bill: {
    label: tr('Hisob'),
    bg: 'var(--accent-rose-bg)',
    text: 'var(--text-main)', // qizil matn kichik o'lchamda 4.4:1: to'q matn + qizil fon/chegara
    border: 'var(--accent-rose-border)',
  },
  cleaning: {
    label: tr('Tozalanmoqda'),
    bg: 'var(--bg-surface-hover)',
    text: 'var(--text-muted)',
    border: 'var(--border-strong)',
  },
};

// QR kodning "qog'ozi": server QR ni shaffof fonda qora modullar bilan beradi (segno), skaner o'qishi uchun fon HAR DOIM oq bo'lishi shart
// (tun rejimida ham). `--text-inverse` barcha to'rt palitrada sof oq, shuning uchun qattiq rang yozilmaydi.
const QR_PAPER = 'var(--text-inverse)';

export const TablesPage: React.FC = () => {
  const {
    tables,
    halls,
    summary,
    loading,
    error,
    selectedHall,
    setSelectedHall,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    changeStatus,
    rotateQr,
    removeTable,
    restoreDeletedTable,
    refresh,
  } = useTables();

  const { showToast } = useToast();

  // Modals state
  const [qrModalTable, setQrModalTable] = useState<TableItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrRotating, setQrRotating] = useState(false);

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableForm, setTableForm] = useState<{
    number: string;
    hall_id: number | '';
    capacity: number;
    shape: 'rect' | 'round';
  }>({
    number: '',
    hall_id: '',
    capacity: 4,
    shape: 'rect',
  });
  const [tableFormSubmitting, setTableFormSubmitting] = useState(false);
  const [tableFormError, setTableFormError] = useState<string | null>(null);

  const [hallModalOpen, setHallModalOpen] = useState(false);
  const [hallForm, setHallForm] = useState({ name: '', order: 0 });
  const [hallFormSubmitting, setHallFormSubmitting] = useState(false);
  const [hallFormError, setHallFormError] = useState<string | null>(null);

  // Copy QR Link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast(t('Stol menyusi havolasi nusxalandi'), "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Open Create Table Modal
  const handleOpenCreateTable = () => {
    setEditingTable(null);
    setTableForm({
      number: '',
      hall_id: halls.length > 0 ? halls[0].id : '',
      capacity: 4,
      shape: 'rect',
    });
    setTableFormError(null);
    setTableModalOpen(true);
  };

  // Open Edit Table Modal
  const handleOpenEditTable = (table: TableItem) => {
    setEditingTable(table);
    setTableForm({
      number: table.number,
      hall_id: table.hall_id,
      capacity: table.capacity,
      shape: table.shape,
    });
    setTableFormError(null);
    setTableModalOpen(true);
  };

  // Submit Table Form
  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.number.trim()) {
      setTableFormError(tr('Stol raqami kiritilishi shart'));
      return;
    }

    setTableFormSubmitting(true);
    setTableFormError(null);

    try {
      if (editingTable) {
        await updateTable(editingTable.id, {
          number: tableForm.number.trim(),
          hall_id: tableForm.hall_id === '' ? undefined : tableForm.hall_id,
          capacity: tableForm.capacity,
          shape: tableForm.shape,
        });
        showToast(t('"{number}" raqamli stol yangilandi', { number: tableForm.number }), "success");
      } else {
        await createTable({
          number: tableForm.number.trim(),
          hall_id: tableForm.hall_id === '' ? undefined : tableForm.hall_id,
          capacity: tableForm.capacity,
          shape: tableForm.shape,
        });
        showToast(t('"{number}" raqamli yangi stol yaratildi', { number: tableForm.number }), "success");
      }
      setTableModalOpen(false);
      refresh();
    } catch (err: unknown) {
      // Xabar server (o'zbekcha) yoki shu yerdagi zaxira matni: ko'rsatishda t() bilan tarjima qilinadi
      const msg = err instanceof Error ? err.message : tr('Xatolik yuz berdi');
      setTableFormError(msg);
    } finally {
      setTableFormSubmitting(false);
    }
  };

  // Submit Hall Form
  const handleHallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallForm.name.trim()) {
      setHallFormError(tr('Zal nomi kiritilishi shart'));
      return;
    }

    setHallFormSubmitting(true);
    setHallFormError(null);

    try {
      await createHall({
        name: hallForm.name.trim(),
        order: Number(hallForm.order) || 0,
      });
      showToast(t('"{name}" zali qo\'shildi', { name: hallForm.name }), "success");
      setHallModalOpen(false);
      setHallForm({ name: '', order: 0 });
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr('Xatolik yuz berdi');
      setHallFormError(msg);
    } finally {
      setHallFormSubmitting(false);
    }
  };

  // Handle QR Rotate
  const handleRotateQr = async () => {
    if (!qrModalTable) return;
    if (!window.confirm(t("Haqiqatan ham ushbu stolning QR kodini yangilamoqchimisiz? Eski QR kod 24 soatdan so'ng to'xtaydi."))) {
      return;
    }

    setQrRotating(true);
    try {
      const res = await rotateQr(qrModalTable.id);
      setQrModalTable((prev) => (prev ? { ...prev, qr_token: res.qr_token, qr_url: res.qr_url, qr_path: res.qr_path } : null));
      showToast(t('QR token yangilandi'), "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? t(err.message) : t("QR tokenini yangilab bo'lmadi");
      showToast(msg, "error");
    } finally {
      setQrRotating(false);
    }
  };

  // Maydon uslublari (forma: kiritish maydoni chegarasi --border-strong, DishForm namunasi)
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-surface)',
    color: 'var(--text-main)',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Sarlavha va asosiy tugmalar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            {t('Stollar va QR Kodlar')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('Zallar tartibi, jonli hisob-kitoblar va bosma QR menyu kartalari boshqaruvi.')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title={t('Qayta yuklash')}>
            <RefreshCw size={18} />
          </Button>
          <Button variant="secondary" onClick={() => setHallModalOpen(true)}>
            <Layers size={18} style={{ marginRight: '6px' }} />
            {t('Yangi Zal')}
          </Button>
          <Button variant="primary" onClick={handleOpenCreateTable}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            {t('Yangi Stol')}
          </Button>
        </div>
      </div>

      {/* 5 ta Xulosa Kartasi (Summary) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title={t('Jami Stollar')}
          value={summary.total}
          icon={<Armchair size={22} />}
        />
        <StatCard
          title={t("Bo'sh Stollar")}
          value={summary.free}
          icon={<Armchair size={22} color="var(--accent-emerald)" />}
        />
        <StatCard
          title={t('Band / Buyurtma')}
          value={summary.occupied}
          icon={<Armchair size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title={t('Hisob Kutilmoqda')}
          value={summary.bill}
          icon={<Armchair size={22} color="var(--accent-indigo)" />}
        />
        <StatCard
          title={t('Tozalanmoqda')}
          value={summary.cleaning}
          icon={<Armchair size={22} color="var(--text-dim)" />}
        />
      </div>

      {/* Zallar Tablari (Hall Filter) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setSelectedHall('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: selectedHall === 'all' ? 'var(--action)' : 'var(--bg-surface)',
            color: selectedHall === 'all' ? 'var(--text-inverse)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {t('Barcha Zallar ({n})', { n: summary.total })}
        </button>
        {halls.map((h: HallItem) => (
          <button
            key={h.id}
            onClick={() => setSelectedHall(h.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: selectedHall === h.id ? 'var(--text-main)' : 'var(--bg-surface)',
              // to'q (kun) / och (tun) to'ldirish ustida matn: sirt rangi teskari
              color: selectedHall === h.id ? 'var(--bg-surface)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t(h.name)} ({h.tables_count})
          </button>
        ))}
      </div>

      {/* Holat filtrlari va Qidiruv qatori */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: t('Barchasi') },
            { id: 'free', label: t("Bo'sh") },
            { id: 'occupied', label: t('Band') },
            { id: 'bill', label: t('Hisob') },
            { id: 'cleaning', label: t('Tozalanmoqda') },
            { id: 'deleted', label: t('Arxiv') },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === st.id ? 'var(--brand)' : 'var(--border-subtle)',
                background: statusFilter === st.id ? 'var(--brand-bg)' : 'transparent',
                color: statusFilter === st.id ? 'var(--brand)' : 'var(--text-muted)',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder={t("Stol raqami bo'yicha...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Xatolik xabari */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: 'var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{t(error)}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              {t('Qayta urinish')}
            </Button>
          </div>
        </Card>
      )}

      {/* Yuklanish skeleti */}
      {loading && tables.length === 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height="180px" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          icon={<Armchair size={48} />}
          title={t('Stollar topilmadi')}
          description={
            searchQuery || statusFilter !== 'all'
              ? t("Qidiruv yoki filtr bo'yicha hech qanday stol topilmadi.")
              : t("Restoraningizda hali stollar mavjud emas. Yangi stol qo'shing.")
          }
          action={
            <Button variant="primary" onClick={handleOpenCreateTable}>
              <Plus size={18} style={{ marginRight: '6px' }} />
              {t("Birinchi stolni qo'shish")}
            </Button>
          }
        />
      ) : (
        /* Stollar Grid Ko'rinishi */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {tables.map((table: TableItem) => {
            const statusCfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.free;

            return (
              <Card
                key={table.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '18px',
                  borderRadius: '12px',
                  border: `1px solid ${statusCfg.border}`,
                  position: 'relative',
                  background: 'var(--bg-surface)',
                  opacity: table.is_deleted ? 0.6 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Yuqori qator: Stol raqami va sig'im */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {t('Stol #{number}', { number: table.number })}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        {t(table.hall_name)}
                      </div>
                    </div>

                    {/* Holat nishoni */}
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      {t(statusCfg.label)}
                    </div>
                  </div>

                  {/* Sig'im va shakl */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      marginBottom: '14px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={15} />
                      {t('{n} kishi', { n: table.capacity })}
                    </span>
                    <span>{table.shape === 'round' ? `⭕ ${t('Doira')}` : `⬛ ${t("To'rtburchak")}`}</span>
                  </div>

                  {/* Faol hisob va buyurtmalar */}
                  {table.total_bill > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-hover)',
                        border: '1px solid var(--border-strong)',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {t('Ochiq hisob ({n} buyurtma):', { n: table.active_orders_count })}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                        {t("{amount} so'm", { amount: fmtNum(table.total_bill) })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pastki tugmalar va holat o'zgartirish */}
                <div>
                  {/* Tezkor holat select */}
                  {!table.is_deleted && (
                    <div style={{ marginBottom: '12px' }}>
                      <select
                        value={table.status}
                        onChange={(e) => changeStatus(table.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-strong)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="free">{t('Holat: {status}', { status: t("Bo'sh") })}</option>
                        <option value="occupied">{t('Holat: {status}', { status: t('Band') })}</option>
                        <option value="bill">{t('Holat: {status}', { status: t('Hisob') })}</option>
                        <option value="cleaning">{t('Holat: {status}', { status: t('Tozalanmoqda') })}</option>
                      </select>
                    </div>
                  )}

                  {/* Amallar tugmalari */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '12px',
                    }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQrModalTable(table)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                    >
                      <QrCode size={14} style={{ marginRight: '4px' }} />
                      {t('QR Kod')}
                    </Button>

                    {!table.is_deleted ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditTable(table)}
                          title={t('Tahrirlash')}
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(t('"{number}" raqamli stolni arxivlamoqchimisiz?', { number: table.number }))) {
                              removeTable(table.id);
                            }
                          }}
                          title={t('Arxivlash')}
                          style={{ color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => restoreDeletedTable(table.id)}
                        title={t('Tiklash')}
                        style={{ color: 'var(--accent-emerald)' }}
                      >
                        <RotateCcw size={14} style={{ marginRight: '4px' }} />
                        {t('Tiklash')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Kod Modali */}
      {qrModalTable && (
        <Modal
          isOpen={true}
          title={t('Stol #{number} — QR Kod', { number: qrModalTable.number })}
          onClose={() => setQrModalTable(null)}
        >
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t('Zal:')} <strong>{t(qrModalTable.hall_name)}</strong> | {t("Sig'im:")} <strong>{t('{n} kishi', { n: qrModalTable.capacity })}</strong>
            </div>

            {/* SVG QR Rasm */}
            <div
              style={{
                display: 'inline-block',
                padding: '16px',
                background: QR_PAPER,
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                marginBottom: '20px',
              }}
            >
              <img
                src={qrModalTable.qr_svg_url}
                alt={t('QR Code Stol {number}', { number: qrModalTable.number })}
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>

            {/* Havola va nusxa olish */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '20px',
                wordBreak: 'break-all',
              }}
            >
              <span style={{ flex: 1, textAlign: 'left' }}>{qrModalTable.qr_url}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyLink(qrModalTable.qr_url)}
                title={t('Havoladan nusxa olish')}
              >
                {copiedLink ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
              </Button>
            </div>

            {/* Harakatlar */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <a
                href={qrModalTable.qr_svg_url}
                download={`qr-stol-${qrModalTable.number}.svg`}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary">
                  <Printer size={16} style={{ marginRight: '6px' }} />
                  {t('SVG Yuklab olish')}
                </Button>
              </a>

              <Button
                variant="secondary"
                onClick={handleRotateQr}
                disabled={qrRotating}
                title={t('Xavfsizlik uchun yangi QR token olish')}
              >
                <RefreshCw
                  size={16}
                  style={{
                    marginRight: '6px',
                    animation: qrRotating ? 'spin 1s linear infinite' : undefined,
                  }}
                />
                {t('QR ni Yangilash')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stol Yaratish / Tahrirlash Modali */}
      {tableModalOpen && (
        <Modal
          isOpen={true}
          title={editingTable ? t('Stol #{number} ni Tahrirlash', { number: editingTable.number }) : t("Yangi Stol Qo'shish")}
          onClose={() => setTableModalOpen(false)}
        >
          <form onSubmit={handleTableSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tableFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid var(--accent-rose-border)',
                  color: 'var(--text-main)', // qizil matn och-qizil fonda kichik o'lchamda AA dan past: to'q matn + qizil fon/chegara
                  fontSize: '13px',
                }}
              >
                {t(tableFormError)}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Stol Raqami *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('Masalan: 1, 2, VIP-1')}
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Zal')}
              </label>
              <select
                value={tableForm.hall_id}
                onChange={(e) => setTableForm({ ...tableForm, hall_id: e.target.value ? Number(e.target.value) : '' })}
                style={fieldStyle}
              >
                {halls.map((h: HallItem) => (
                  <option key={h.id} value={h.id}>
                    {t(h.name)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t("Sig'imi (kishi)")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) || 4 })}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('Shakli')}
                </label>
                <select
                  value={tableForm.shape}
                  onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value as 'rect' | 'round' })}
                  style={fieldStyle}
                >
                  <option value="rect">{`⬛ ${t("To'rtburchak")}`}</option>
                  <option value="round">{`⭕ ${t('Doira')}`}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="ghost" type="button" onClick={() => setTableModalOpen(false)}>
                {t('Bekor qilish')}
              </Button>
              <Button variant="primary" type="submit" disabled={tableFormSubmitting}>
                {tableFormSubmitting ? t('Saqlanmoqda...') : editingTable ? t("O'zgarishlarni saqlash") : t('Stolni yaratish')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Zal Yaratish Modali */}
      {hallModalOpen && (
        <Modal isOpen={true} title={t("Yangi Zal Qo'shish")} onClose={() => setHallModalOpen(false)}>
          <form onSubmit={handleHallSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {hallFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid var(--accent-rose-border)',
                  color: 'var(--text-main)', // qizil matn och-qizil fonda kichik o'lchamda AA dan past: to'q matn + qizil fon/chegara
                  fontSize: '13px',
                }}
              >
                {t(hallFormError)}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Zal Nomi *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('Masalan: Yozgi Terrasa, VIP Xona, 2-qavat')}
                value={hallForm.name}
                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Tartib Raqami')}
              </label>
              <input
                type="number"
                value={hallForm.order}
                onChange={(e) => setHallForm({ ...hallForm, order: Number(e.target.value) || 0 })}
                style={fieldStyle}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="ghost" type="button" onClick={() => setHallModalOpen(false)}>
                {t('Bekor qilish')}
              </Button>
              <Button variant="primary" type="submit" disabled={hallFormSubmitting}>
                {hallFormSubmitting ? t('Saqlanmoqda...') : t("Zalni qo'shish")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TablesPage;
