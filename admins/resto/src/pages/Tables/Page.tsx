import React, { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatCard,
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

const STATUS_CONFIG: Record<
  TableItem['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  free: {
    label: "Bo'sh",
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  occupied: {
    label: 'Band',
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  ordering: {
    label: 'Buyurtma',
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  waiting: {
    label: 'Kutmoqda',
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  ready: {
    label: 'Tayyor',
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  bill: {
    label: 'Hisob',
    bg: 'var(--accent-rose-bg)',
    text: 'var(--text-main)', // qizil matn kichik o'lchamda 4.4:1: to'q matn + qizil fon/chegara
    border: 'var(--accent-rose-border)',
  },
  cleaning: {
    label: 'Tozalanmoqda',
    bg: 'var(--bg-surface-hover)',
    text: 'var(--text-muted)',
    border: 'var(--border-strong)',
  },
};

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
    showToast("Stol menyusi havolasi nusxalandi", "success");
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
      setTableFormError("Stol raqami kiritilishi shart");
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
        showToast(`"${tableForm.number}" raqamli stol yangilandi`, "success");
      } else {
        await createTable({
          number: tableForm.number.trim(),
          hall_id: tableForm.hall_id === '' ? undefined : tableForm.hall_id,
          capacity: tableForm.capacity,
          shape: tableForm.shape,
        });
        showToast(`"${tableForm.number}" raqamli yangi stol yaratildi`, "success");
      }
      setTableModalOpen(false);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setTableFormError(msg);
    } finally {
      setTableFormSubmitting(false);
    }
  };

  // Submit Hall Form
  const handleHallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallForm.name.trim()) {
      setHallFormError("Zal nomi kiritilishi shart");
      return;
    }

    setHallFormSubmitting(true);
    setHallFormError(null);

    try {
      await createHall({
        name: hallForm.name.trim(),
        order: Number(hallForm.order) || 0,
      });
      showToast(`"${hallForm.name}" zali qo'shildi`, "success");
      setHallModalOpen(false);
      setHallForm({ name: '', order: 0 });
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setHallFormError(msg);
    } finally {
      setHallFormSubmitting(false);
    }
  };

  // Handle QR Rotate
  const handleRotateQr = async () => {
    if (!qrModalTable) return;
    if (!window.confirm("Haqiqatan ham ushbu stolning QR kodini yangilamoqchimisiz? Eski QR kod 24 soatdan so'ng to'xtaydi.")) {
      return;
    }

    setQrRotating(true);
    try {
      const res = await rotateQr(qrModalTable.id);
      setQrModalTable((prev) => (prev ? { ...prev, qr_token: res.qr_token, qr_url: res.qr_url, qr_path: res.qr_path } : null));
      showToast("QR token yangilandi", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "QR tokenini yangilab bo'lmadi";
      showToast(msg, "error");
    } finally {
      setQrRotating(false);
    }
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
            Stollar va QR Kodlar
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Zallar tartibi, jonli hisob-kitoblar va bosma QR menyu kartalari boshqaruvi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title="Qayta yuklash">
            <RefreshCw size={18} />
          </Button>
          <Button variant="secondary" onClick={() => setHallModalOpen(true)}>
            <Layers size={18} style={{ marginRight: '6px' }} />
            Yangi Zal
          </Button>
          <Button variant="primary" onClick={handleOpenCreateTable}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            Yangi Stol
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
          title="Jami Stollar"
          value={summary.total}
          icon={<Armchair size={22} />}
        />
        <StatCard
          title="Bo'sh Stollar"
          value={summary.free}
          icon={<Armchair size={22} color="var(--accent-emerald)" />}
        />
        <StatCard
          title="Band / Buyurtma"
          value={summary.occupied}
          icon={<Armchair size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title="Hisob Kutilmoqda"
          value={summary.bill}
          icon={<Armchair size={22} color="var(--accent-indigo)" />}
        />
        <StatCard
          title="Tozalanmoqda"
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
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={() => setSelectedHall('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: selectedHall === 'all' ? 'var(--primary)' : 'var(--card-bg)',
            color: selectedHall === 'all' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          Barcha Zallar ({summary.total})
        </button>
        {halls.map((h: HallItem) => (
          <button
            key={h.id}
            onClick={() => setSelectedHall(h.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: selectedHall === h.id ? 'var(--text-main)' : 'var(--card-bg)',
              color: selectedHall === h.id ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {h.name} ({h.tables_count})
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
            { id: 'all', label: 'Barchasi' },
            { id: 'free', label: "Bo'sh" },
            { id: 'occupied', label: 'Band' },
            { id: 'bill', label: 'Hisob' },
            { id: 'cleaning', label: 'Tozalanmoqda' },
            { id: 'deleted', label: 'Arxiv' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === st.id ? 'var(--primary)' : 'var(--border-color)',
                background: statusFilter === st.id ? 'var(--accent-amber-bg)' : 'transparent',
                color: statusFilter === st.id ? 'var(--primary)' : 'var(--text-muted)',
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
            placeholder="Stol raqami bo'yicha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
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
        <Card style={{ marginBottom: '24px', borderColor: 'rgb(220 38 38 / 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              Qayta urinish
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
          title="Stollar topilmadi"
          description={
            searchQuery || statusFilter !== 'all'
              ? "Qidiruv yoki filtr bo'yicha hech qanday stol topilmadi."
              : "Restoraningizda hali stollar mavjud emas. Yangi stol qo'shing."
          }
          action={
            <Button variant="primary" onClick={handleOpenCreateTable}>
              <Plus size={18} style={{ marginRight: '6px' }} />
              Birinchi stolni qo'shish
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
          {tables.map((t: TableItem) => {
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.free;

            return (
              <Card
                key={t.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '18px',
                  borderRadius: '12px',
                  border: `1px solid ${statusCfg.border}`,
                  position: 'relative',
                  background: 'var(--card-bg)',
                  opacity: t.is_deleted ? 0.6 : 1,
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
                        Stol #{t.number}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        {t.hall_name}
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
                      {statusCfg.label}
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
                      {t.capacity} kishi
                    </span>
                    <span>{t.shape === 'round' ? '⭕ Doira' : '⬛ To\'rtburchak'}</span>
                  </div>

                  {/* Faol hisob va buyurtmalar */}
                  {t.total_bill > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgb(24 21 19 / 0.08)',
                        border: '1px solid rgb(24 21 19 / 0.2)',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Ochiq hisob ({t.active_orders_count} buyurtma):
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                        {t.total_bill.toLocaleString('uz-UZ')} so'm
                      </div>
                    </div>
                  )}
                </div>

                {/* Pastki tugmalar va holat o'zgartirish */}
                <div>
                  {/* Tezkor holat select */}
                  {!t.is_deleted && (
                    <div style={{ marginBottom: '12px' }}>
                      <select
                        value={t.status}
                        onChange={(e) => changeStatus(t.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'rgb(24 21 19 / 0.04)',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="free">Holat: Bo'sh</option>
                        <option value="occupied">Holat: Band</option>
                        <option value="bill">Holat: Hisob</option>
                        <option value="cleaning">Holat: Tozalanmoqda</option>
                      </select>
                    </div>
                  )}

                  {/* Amallar tugmalari */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '12px',
                    }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQrModalTable(t)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                    >
                      <QrCode size={14} style={{ marginRight: '4px' }} />
                      QR Kod
                    </Button>

                    {!t.is_deleted ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditTable(t)}
                          title="Tahrirlash"
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`"${t.number}" raqamli stolni arxivlamoqchimisiz?`)) {
                              removeTable(t.id);
                            }
                          }}
                          title="Arxivlash"
                          style={{ color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => restoreDeletedTable(t.id)}
                        title="Tiklash"
                        style={{ color: 'var(--accent-emerald)' }}
                      >
                        <RotateCcw size={14} style={{ marginRight: '4px' }} />
                        Tiklash
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
          title={`Stol #${qrModalTable.number} — QR Kod`}
          onClose={() => setQrModalTable(null)}
        >
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Zal: <strong>{qrModalTable.hall_name}</strong> | Sig'im: <strong>{qrModalTable.capacity} kishi</strong>
            </div>

            {/* SVG QR Rasm */}
            <div
              style={{
                display: 'inline-block',
                padding: '16px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                marginBottom: '20px',
              }}
            >
              <img
                src={qrModalTable.qr_svg_url}
                alt={`QR Code Stol ${qrModalTable.number}`}
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
                background: 'rgb(24 21 19 / 0.04)',
                border: '1px solid var(--border-color)',
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
                title="Havoladan nusxa olish"
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
                  SVG Yuklab olish
                </Button>
              </a>

              <Button
                variant="secondary"
                onClick={handleRotateQr}
                disabled={qrRotating}
                title="Xavfsizlik uchun yangi QR token olish"
              >
                <RefreshCw
                  size={16}
                  style={{
                    marginRight: '6px',
                    animation: qrRotating ? 'spin 1s linear infinite' : undefined,
                  }}
                />
                QR ni Yangilash
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stol Yaratish / Tahrirlash Modali */}
      {tableModalOpen && (
        <Modal
          isOpen={true}
          title={editingTable ? `Stol #${editingTable.number} ni Tahrirlash` : "Yangi Stol Qo'shish"}
          onClose={() => setTableModalOpen(false)}
        >
          <form onSubmit={handleTableSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tableFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid rgb(220 38 38 / 0.3)',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                }}
              >
                {tableFormError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Stol Raqami *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: 1, 2, VIP-1"
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Zal
              </label>
              <select
                value={tableForm.hall_id}
                onChange={(e) => setTableForm({ ...tableForm, hall_id: e.target.value ? Number(e.target.value) : '' })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                {halls.map((h: HallItem) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Sig'imi (kishi)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) || 4 })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Shakli
                </label>
                <select
                  value={tableForm.shape}
                  onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value as 'rect' | 'round' })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="rect">⬛ To'rtburchak</option>
                  <option value="round">⭕ Doira</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="ghost" type="button" onClick={() => setTableModalOpen(false)}>
                Bekor qilish
              </Button>
              <Button variant="primary" type="submit" disabled={tableFormSubmitting}>
                {tableFormSubmitting ? "Saqlanmoqda..." : editingTable ? "O'zgarishlarni saqlash" : "Stolni yaratish"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Zal Yaratish Modali */}
      {hallModalOpen && (
        <Modal isOpen={true} title="Yangi Zal Qo'shish" onClose={() => setHallModalOpen(false)}>
          <form onSubmit={handleHallSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {hallFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid rgb(220 38 38 / 0.3)',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                }}
              >
                {hallFormError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Zal Nomi *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: Yozgi Terrasa, VIP Xona, 2-qavat"
                value={hallForm.name}
                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tartib Raqami
              </label>
              <input
                type="number"
                value={hallForm.order}
                onChange={(e) => setHallForm({ ...hallForm, order: Number(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="ghost" type="button" onClick={() => setHallModalOpen(false)}>
                Bekor qilish
              </Button>
              <Button variant="primary" type="submit" disabled={hallFormSubmitting}>
                {hallFormSubmitting ? "Saqlanmoqda..." : "Zalni qo'shish"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TablesPage;
