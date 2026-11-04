import React from 'react';
import { Button, Card, t } from '@admins/shared';
import { ExternalLink, KeyRound, Pause, Pencil, Play } from 'lucide-react';
import { businessLabel, statusLabel } from './labels';
import { badgeStyle, hintStyle, tapButton } from './styles';
import { formatDay, isSuspended } from './tenants';
import type { Tenant } from './tenants';

interface Props {
  tenant: Tenant;
  domain: string;
  onEdit: (tenant: Tenant) => void;
  onToggle: (tenant: Tenant) => void;
  onResetPassword: (tenant: Tenant) => void;
}

const statStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };

/** Bitta mijoz kartochkasi: nom, manzil, tur va holat belgilari, ega, hajm va amallar (Ochish, Tahrirlash, To'xtatish, Parolni tiklash) */
export const TenantCard: React.FC<Props> = ({ tenant, domain, onEdit, onToggle, onResetPassword }) => {
  const suspended = isSuspended(tenant);
  const day = formatDay(tenant.created_at);
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{tenant.name || tenant.subdomain}</h3>
          <div style={{ ...hintStyle, margin: '2px 0 0 0', overflowWrap: 'anywhere' }}>
            {tenant.subdomain}.{domain}
          </div>
        </div>
        <span style={badgeStyle(suspended ? 'danger' : 'success')}>{statusLabel(tenant.status)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={badgeStyle('brand')}>{businessLabel(tenant.business_type)}</span>
        {day && <span style={badgeStyle('neutral')}>{t("Qo'shilgan: {date}", { date: day })}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, fontSize: 14, color: 'var(--text-main)' }}>
        <div style={statStyle}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Egasi')}</span>
          <strong style={{ overflowWrap: 'anywhere' }}>{tenant.owner_username ? `@${tenant.owner_username}` : '—'}</strong>
        </div>
        <div style={statStyle}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Stollar')}</span>
          <strong>{tenant.tables}</strong>
        </div>
        <div style={statStyle}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Taomlar')}</span>
          <strong>{tenant.products}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tenant.url && (
          <a
            href={tenant.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('Ochish')}: ${tenant.name || tenant.subdomain}`}
            style={{ ...tapButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            <ExternalLink size={18} aria-hidden="true" />
            {t('Ochish')}
          </a>
        )}
        <Button variant="secondary" onClick={() => onEdit(tenant)} style={tapButton} aria-label={`${t('Tahrirlash')}: ${tenant.name || tenant.subdomain}`}>
          <Pencil size={18} aria-hidden="true" />
          {t('Tahrirlash')}
        </Button>
        <Button variant="secondary" onClick={() => onToggle(tenant)} style={tapButton} aria-label={`${suspended ? t('Faollashtirish') : t("To'xtatish")}: ${tenant.name || tenant.subdomain}`}>
          {suspended ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          {suspended ? t('Faollashtirish') : t("To'xtatish")}
        </Button>
        <Button variant="ghost" onClick={() => onResetPassword(tenant)} style={tapButton} aria-label={`${t('Ega parolini tiklash')}: ${tenant.name || tenant.subdomain}`}>
          <KeyRound size={18} aria-hidden="true" />
          {t('Ega parolini tiklash')}
        </Button>
      </div>
    </Card>
  );
};
