// "Bu bo'lim hozircha mavjud emas": egasi bo'limni (360°, buyurtmalar, bron, menyu) o'chirgan bo'lsa, unga to'g'ridan-to'g'ri havola bilan
// kirilganda ko'rsatiladigan YUMSHOQ ekran (xato emas). Marshrut o'chirilmagan — bo'lim qayta yoqilsa o'zi ishlaydi.
import React from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { t } from '../../../i18n';
import { brandName, moduleEnabled } from '../../../utils/brand';
import { BottomNav } from '../BottomNav/BottomNav';
import { HeaderNav } from '../HeaderNav/HeaderNav';
import { Icon } from '../Icon/Icon';
import './ModuleUnavailable.css';

export const ModuleUnavailable: React.FC = () => {
  const { navigate } = useNavigation();
  // Menyu mavjud bo'lsa — menyuga; menyu ham o'chiq bo'lsa (faqat bron/aloqa) — bosh sahifaga
  const menuOn = moduleEnabled('menu');
  return (
    <div className="mu-root">
      <HeaderNav brandName={brandName()} />
      <main className="mu-main">
        <div className="mu-card" role="status">
          <span className="mu-icon"><Icon name="clock" size={28} /></span>
          <h1 className="mu-title">{t("Bu bo'lim hozircha mavjud emas")}</h1>
          <p className="mu-text">
            {menuOn
              ? t("Bu sahifa hozir yopiq. Menyuni ko'rib chiqing yoki keyinroq qaytib keling.")
              : t("Bu sahifa hozir yopiq. Bosh sahifadan kerakli bo'limni tanlang.")}
          </p>
          <button type="button" className="mu-btn" onClick={() => navigate(menuOn ? '/menu' : '/')}>
            <span>{menuOn ? t('Menyuga qaytish') : t('Bosh sahifaga')}</span>
            <Icon name="arrow" size={18} strokeWidth={2.5} />
          </button>
        </div>
      </main>
      <BottomNav activeTab={menuOn ? 'menu' : 'home'} />
    </div>
  );
};
