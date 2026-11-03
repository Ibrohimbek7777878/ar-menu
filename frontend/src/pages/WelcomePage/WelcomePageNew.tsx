import React, { useEffect, useRef, useState } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { Icon } from '../../components/ui/Icon/Icon';
import { useNavigation } from '../../context/NavigationContext';
import { roleService } from '../../core/auth/RoleService';
import { HeroPlate3D } from '../../motion/HeroPlate3D';

interface FeaturedDish {
  id: number;
  name: string;
  description?: string;
  price: number;
  image: string;
  has_3d?: boolean;
  is_popular?: boolean;
}

interface InitialWelcomeData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  cartCount?: number;
  /** Server: stolni raqam bilan tanlashga ruxsat (DEMO_MODE yoki RESTAURANT_ALLOW_TABLE_NUMBER_URL) */
  allow_table_number?: boolean;
  /** Server: rasmli taomlar (avval "tavsiya" belgilanganlar) */
  featured?: FeaturedDish[];
}

/** Bo'limlar ekranga kirganda yumshoq paydo bo'ladi (IntersectionObserver; animatsiya o'chirilgan qurilmada darhol ko'rinadi). */
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('.wn-reveal'));
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((n) => n.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

export const WelcomePageNew: React.FC = () => {
  const { navigate, setTableNumber, addToCart, cartCount: navCartCount, setIsQrModalOpen, setIsNfcModalOpen, userRole } = useNavigation();
  const initialData: InitialWelcomeData = (window as any).__GULISTON_WELCOME_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const cartCount = navCartCount || initialData.cartCount || 0;
  const featured = (initialData.featured || []).filter((d) => d.image);
  const hero = featured[0];
  const minis = featured.slice(1, 4);
  const bannerDish = featured[1] || hero;

  // QR generator — xodim vositasi; mehmon stol ustidagi QR ni telefon kamerasi bilan skanerlaydi (TZ: R-SEC-08)
  const isStaff = userRole !== 'guest';
  // Stol raqamini yozish va "NFC" production'da stolni aniqlay olmaydi (server faqat QR tokenni taniydi): faqat DEMO yoki
  // server ruxsat bergandagina ko'rsatiladi (TZ: R5-3, R1-10). Hech narsa o'chirilmagan.
  const demo = roleService.isDemo();
  const allowTableNumber = demo || Boolean(initialData.allow_table_number);

  const [inputTableNum, setInputTableNum] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTableNum.trim()) {
      showToast('Iltimos, stol raqamini kiriting');
      return;
    }
    setTableNumber(inputTableNum.trim());
    navigate('/menu');
  };

  // Katta taom sichqoncha harakatiga yengil javob beradi (faqat sichqonchali qurilmada)
  const handleStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el || !window.matchMedia('(hover: hover)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };
  const handleStageLeave = () => {
    if (stageRef.current) stageRef.current.style.transform = '';
  };

  const handleAdd = (dish: FeaturedDish) => {
    addToCart(dish.id, 1);
    showToast(`${dish.name} savatga qo'shildi`);
  };

  return (
    <div className="wn-root" ref={rootRef}>
      <Toast message={toastMsg} icon="" visible={toastVisible} />

      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={cartCount}
        onCartClick={() => navigate('/cart')}
      />

      <main>
        {/* ─── Hero ─── */}
        <section className="wn-hero">
          <div className={`wn-wrap wn-hero-grid ${hero ? '' : 'wn-hero-solo'}`}>
            <div>
              <span className="wn-eyebrow wn-rise" style={{ ['--i' as string]: 0 }}>Xush kelibsiz</span>
              <h1 className="wn-title wn-rise" style={{ ['--i' as string]: 1 }}>
                Haqiqiy o'zbek <em>ta'mi</em>,<br />stolingizda
              </h1>
              <p className="wn-lead wn-rise" style={{ ['--i' as string]: 2 }}>
                Milliy taomlarimizni 360° ko'rinishda aylantirib ko'ring, tanlang va buyurtmangiz to'g'ridan-to'g'ri
                oshxonaga tushadi. Kutish ham, qog'oz menyu ham yo'q.
              </p>
              <div className="wn-cta wn-rise" style={{ ['--i' as string]: 3 }}>
                <button type="button" className="wn-btn wn-btn-primary" onClick={() => navigate('/menu')}>
                  <span>Menyuni ko'rish</span>
                  <Icon name="arrow" size={18} strokeWidth={2.5} />
                </button>
                <button type="button" className="wn-btn wn-btn-ghost" onClick={() => navigate('/ar')}>
                  <Icon name="rotate" size={18} />
                  <span>360° taomlar</span>
                </button>
              </div>
              <ul className="wn-trust wn-rise" style={{ ['--i' as string]: 4 }}>
                <li><Icon name="check" size={15} strokeWidth={3} />Halol</li>
                <li><Icon name="check" size={15} strokeWidth={3} />Yangi mahsulotlar</li>
                <li><Icon name="check" size={15} strokeWidth={3} />Buyurtma 1 daqiqada</li>
              </ul>
            </div>

            {hero && (
              <div className="wn-rise" style={{ ['--i' as string]: 2 }}>
                <div className="wn-stage" ref={stageRef} onMouseMove={handleStageMove} onMouseLeave={handleStageLeave} aria-hidden="true">
                  <div className="wn-ring" />
                  <HeroPlate3D
                    className="wn-hero3d"
                    photoUrl={hero.image || undefined}
                    fallback={
                      <>
                        <div className="wn-main-dish"><img src={hero.image} alt="" /></div>
                        <div className="wn-steam"><i /><i /><i /></div>
                      </>
                    }
                  />
                  {minis.map((dish, index) => (
                    <div key={dish.id} className={`wn-mini wn-mini-${index + 1}`}><img src={dish.image} alt="" loading="lazy" /></div>
                  ))}
                  {hero.has_3d && (
                    <div className="wn-badge360"><Icon name="rotate" size={15} strokeWidth={2.5} />360°</div>
                  )}
                  <div className="wn-tag wn-tag-1">
                    <span className="wn-tag-dot"><Icon name="star" size={16} /></span>
                    <div>{hero.is_popular ? 'Tavsiya' : 'Bugungi tanlov'}<small>{hero.name}</small></div>
                  </div>
                  <div className="wn-tag wn-tag-2">
                    <span className="wn-tag-dot"><Icon name="clock" size={16} /></span>
                    <div>~ 15 daqiqa<small>tayyorlanish vaqti</small></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Mashhur taomlar ─── */}
        {featured.length > 0 && (
          <section className="wn-block">
            <div className="wn-wrap">
              <div className="wn-head wn-reveal">
                <div>
                  <h2>Mashhur taomlar</h2>
                  <p>Mehmonlarimiz eng ko'p buyurtma qiladiganlar</p>
                </div>
                <button type="button" className="wn-link" onClick={() => navigate('/menu')}>Hammasini ko'rish →</button>
              </div>
              <div className="wn-scroller">
                {featured.slice(0, 5).map((dish, index) => (
                  <article key={dish.id} className="wn-dish wn-reveal" style={{ ['--i' as string]: index }}>
                    <button type="button" className="wn-dish-photo" onClick={() => navigate('/menu')} aria-label={`${dish.name} — menyuda ko'rish`}>
                      <img src={dish.image} alt={dish.name} loading="lazy" />
                      {dish.has_3d && <span className="wn-pill wn-pill-dark">360°</span>}
                      {dish.is_popular && <span className="wn-pill wn-pill-hot">Tavsiya</span>}
                    </button>
                    <div className="wn-dish-body">
                      <h3>{dish.name}</h3>
                      {dish.description && <p>{dish.description}</p>}
                      <div className="wn-dish-row">
                        <span className="wn-price">{new Intl.NumberFormat('uz-UZ').format(dish.price)} <small>so'm</small></span>
                        <button type="button" className="wn-add" onClick={() => handleAdd(dish)}>
                          <Icon name="plus" size={15} strokeWidth={2.5} />
                          <span>Qo'shish</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 360° banner ─── */}
        <section className="wn-block">
          <div className="wn-wrap">
            <div className="wn-banner wn-reveal">
              <div>
                <h2>Taomni buyurtmadan oldin ko'ring</h2>
                <p>Har bir taomni telefon yoki kompyuterda barmoq bilan aylantirib, hajmi va tarkibini ko'zingiz bilan baholang.</p>
                <button type="button" className="wn-btn wn-btn-white" onClick={() => navigate('/ar')}>
                  <span>360° taomlarni ko'rish</span>
                  <Icon name="arrow" size={16} strokeWidth={2.5} />
                </button>
              </div>
              {bannerDish && (
                <div className="wn-banner-dish" aria-hidden="true"><img src={bannerDish.image} alt="" loading="lazy" /></div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Stolga ulanish ─── */}
        <section className="wn-block">
          <div className="wn-wrap">
            <div className="wn-head wn-reveal">
              <div>
                <h2>Stolga ulanish</h2>
                <p>O'zingizga qulay usulni tanlang</p>
              </div>
            </div>
            <div className="wn-connect">
              <div className="wn-opt wn-reveal" style={{ ['--i' as string]: 0 }}>
                <span className="wn-opt-icon"><Icon name="qr" size={24} /></span>
                <div>
                  <h3>QR kodni skanerlash</h3>
                  <p>Stol ustidagi QR kodga telefon kamerangizni qarating.</p>
                  {isStaff && (
                    <button type="button" className="wn-opt-action" onClick={() => setIsQrModalOpen(true)}>QR kod generatori &amp; chop etish</button>
                  )}
                </div>
              </div>

              {allowTableNumber && (
                <div className="wn-opt wn-reveal" style={{ ['--i' as string]: 1 }}>
                  <span className="wn-opt-icon"><Icon name="table" size={24} /></span>
                  <div>
                    <h3>Stol raqamini kiritish</h3>
                    <p>Stolingiz ustidagi raqamni yozib menyuga kiring.</p>
                    <form onSubmit={handleTableSubmit} className="wn-table-form">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Stol raqami (masalan: 7)"
                        value={inputTableNum}
                        onChange={(e) => setInputTableNum(e.target.value)}
                        aria-label="Stol raqami"
                      />
                      <button type="submit">Ulanish</button>
                    </form>
                  </div>
                </div>
              )}

              {demo && (
                <div className="wn-opt wn-reveal" style={{ ['--i' as string]: 2 }}>
                  <span className="wn-opt-icon"><Icon name="nfc" size={24} /></span>
                  <div>
                    <h3>NFC orqali ulanish</h3>
                    <p>Telefoningizni stol burchagidagi NFC belgisiga yaqinlashtiring.</p>
                    <button type="button" className="wn-opt-action" onClick={() => setIsNfcModalOpen(true)}>NFC / Stolni tanlash</button>
                  </div>
                </div>
              )}

              <div className="wn-opt wn-reveal" style={{ ['--i' as string]: 3 }}>
                <span className="wn-opt-icon"><Icon name="calendar" size={24} /></span>
                <div>
                  <h3>Bron qilingan stolni qidirish</h3>
                  <p>Oldindan joy band qilgan bo'lsangiz, raqamingiz orqali toping.</p>
                  <button type="button" className="wn-opt-action" onClick={() => navigate('/reservation/find')}>
                    <Icon name="search" size={15} />Bronni tekshirish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNav
        activeTab="home"
        cartCount={cartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
