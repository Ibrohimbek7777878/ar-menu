// Brend aloqa bloki (Welcome sahifalari): faqat TO'LDIRILGAN maydonlar. Telefon `tel:`, Instagram/Telegram/sayt — tashqi havola
// (`rel="noopener noreferrer"`); manzil va ish vaqti matn. Hech narsa to'ldirilmagan bo'lsa blok umuman chizilmaydi.
import React from 'react';
import { t } from '../../../i18n';
import { contactItems, useBrand, type ContactItem, type ContactKind } from '../../../utils/brand';
import { Icon, type IconName } from '../Icon/Icon';
import './BrandContact.css';

const ICONS: Record<ContactKind, IconName> = {
  phone: 'phone',
  phone2: 'phone',
  address: 'pin',
  hours: 'clock',
  instagram: 'instagram',
  telegram: 'send',
  website: 'globe',
};

function label(kind: ContactKind): string {
  switch (kind) {
    case 'phone':
    case 'phone2': return t('Telefon');
    case 'address': return t('Manzil');
    case 'hours': return t('Ish vaqti');
    case 'instagram': return 'Instagram';
    case 'telegram': return 'Telegram';
    default: return t('Veb-sayt');
  }
}

const Row: React.FC<{ item: ContactItem }> = ({ item }) => {
  const isPhone = item.kind === 'phone' || item.kind === 'phone2';
  const external = item.href !== null && !item.href.startsWith('tel:');
  return (
    <li className="bc-item">
      <span className="bc-icon"><Icon name={ICONS[item.kind]} size={20} /></span>
      <div className="bc-body">
        <span className="bc-label">{label(item.kind)}</span>
        {item.href ? (
          <a
            className="bc-link"
            href={item.href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            {...(isPhone ? { 'aria-label': t("Qo'ng'iroq qilish: {phone}", { phone: item.text }) } : {})}
          >
            {item.text}
          </a>
        ) : (
          <span className="bc-text">{item.text}</span>
        )}
      </div>
    </li>
  );
};

export const BrandContact: React.FC<{ className?: string }> = ({ className = '' }) => {
  const brand = useBrand();
  const items = contactItems(brand.contact);
  if (!items.length) return null;
  return (
    <section className={`bc-section ${className}`} aria-labelledby="bc-title">
      <h2 className="bc-title" id="bc-title">{t('Aloqa')}</h2>
      <ul className="bc-list">
        {items.map((item) => <Row key={item.kind} item={item} />)}
      </ul>
    </section>
  );
};
