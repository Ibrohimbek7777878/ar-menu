// Taom oynasi (Uzum Market uslubida): taom kartasini bosganda pastdan ochiladi. Ichida rasm(lar), qisqa ma'lumot, savatga qo'shish
// va pastda "Shunga o'xshash" hamda "Qo'shimcha" taomlar (utils/recommendations.ts). Dizayn: docs/dizayn "Mehmon · 3D oyna".
// Yopish: pastga surish, tashqarini bosish, ✕, Escape, telefonning "orqaga" tugmasi (Telegram orqaga tugmasi ham shu).
// 3D bor taomda "360° ko'rish" mavjud 3D oynani ochadi (u o'chirilmagan). Animatsiya `guest_motion` ostida (motion/env.ts).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../../../types/dish';
import { COMPLEMENT_TITLES, complementDishes, similarDishes } from '../../../utils/recommendations';
import { flyToCart } from '../../../utils/cartFly';
import { fxEnabled } from '../../../motion/env';
import './DishSheet.css';

export interface DishSheetProps {
  product: Product;
  /** Butun menyu: tavsiyalar shundan tanlanadi */
  products: readonly Product[];
  cart: Record<number, number>;
  onClose: () => void;
  /** Tavsiyadagi taomga o'tish (oyna yopilmaydi, mazmuni almashadi) */
  onSelect: (product: Product) => void;
  /** 1 dona qo'shadi (MenuPage: xabar bilan) */
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onOpen3D: (product: Product) => void;
  onGoToCart: () => void;
}

const EXIT_MS = 220;
const money = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);
const letterOf = (name: string) => name.trim().charAt(0).toUpperCase();

interface ContentProps extends Omit<DishSheetProps, 'onClose'> {
  onRequestClose: () => void;
}

const Rail: React.FC<{
  title: string;
  items: Product[];
  cart: Record<number, number>;
  onSelect: (p: Product) => void;
  onAdd: (p: Product, button: Element) => void;
}> = ({ title, items, cart, onSelect, onAdd }) => {
  if (items.length === 0) return null;
  return (
    <section className="ds-rail" aria-label={title}>
      <h3 className="ds-rail-title">{title}</h3>
      <div className="ds-rail-track">
        {items.map((p) => (
          <div className="ds-mini" key={p.id}>
            <button type="button" className="ds-mini-open" onClick={() => onSelect(p)} aria-label={`${p.name}: batafsil`}>
              <span className="ds-mini-media">
                {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="ds-mini-letter">{letterOf(p.name)}</span>}
              </span>
              <span className="ds-mini-name">{p.name}</span>
            </button>
            <div className="ds-mini-foot">
              <span className="ds-mini-price tabular-nums">{money(p.price)} so'm</span>
              <button
                type="button"
                className="ds-mini-add"
                onClick={(e) => onAdd(p, e.currentTarget)}
                aria-label={`${p.name} savatga qo'shish`}
              >
                +
                {(cart[p.id] || 0) > 0 && <span className="ds-mini-qty tabular-nums">{cart[p.id]}</span>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** Oynaning mazmuni. `key={product.id}` bilan chaqiriladi: boshqa taomga o'tganda holat (son, tavsif, rasm) o'zi tozalanadi. */
const SheetContent: React.FC<ContentProps> = ({
  product, products, cart, onSelect, onAddToCart, onUpdateQuantity, onOpen3D, onGoToCart, onRequestClose,
}) => {
  const [count, setCount] = useState(1);
  const [descOpen, setDescOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [failed, setFailed] = useState<Record<number, true>>({});
  const addRef = useRef<HTMLButtonElement>(null);
  const inCart = cart[product.id] || 0;

  const images = useMemo(
    () => (product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : []),
    [product.images, product.image],
  );
  const similar = useMemo(() => similarDishes(product, products), [product, products]);
  const complement = useMemo(() => complementDishes(product, products), [product, products]);

  const tiles = [
    product.prep_time ? { label: 'Tayyorlanish', value: product.prep_time } : null,
    product.weight ? { label: "Og'irligi", value: product.weight } : null,
    product.calories ? { label: 'Kaloriya', value: product.calories } : null,
  ].filter((t): t is { label: string; value: string } => t !== null);

  const longDescription = (product.description?.length ?? 0) > 140;

  const add = () => {
    flyToCart(addRef.current);
    onAddToCart(product);
    if (count > 1) onUpdateQuantity(product.id, count - 1);
  };
  const addRelated = (p: Product, button: Element) => {
    flyToCart(button);
    onAddToCart(p);
  };

  return (
    <>
      <div className="ds-scroll">
        <div className="ds-hero">
          <div
            className="ds-gallery"
            onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          >
            {images.length === 0 ? (
              <div className="ds-slide">
                <div className="ds-placeholder" aria-hidden="true">{letterOf(product.name)}</div>
              </div>
            ) : (
              images.map((src, i) => (
                <div className="ds-slide" key={src + i}>
                  {failed[i] ? (
                    <div className="ds-placeholder" aria-hidden="true">{letterOf(product.name)}</div>
                  ) : (
                    <img src={src} alt={i === 0 ? product.name : ''} onError={() => setFailed((f) => ({ ...f, [i]: true }))} />
                  )}
                </div>
              ))
            )}
          </div>
          {images.length > 1 && (
            <div className="ds-dots" aria-hidden="true">
              {images.map((src, i) => (
                <span key={src + i} className={i === slide ? 'on' : ''} />
              ))}
            </div>
          )}
          {product.has_3d && (
            <button type="button" className="ds-chip-360" onClick={() => onOpen3D(product)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              360° ko'rish
            </button>
          )}
        </div>

        <div className="ds-info">
          <div className="ds-badges">
            {product.is_popular && <span className="ds-badge hit">Hit</span>}
            {product.is_new && <span className="ds-badge new">Yangi</span>}
            {product.is_halal && <span className="ds-badge halal">Halol</span>}
          </div>
          <div className="ds-title-row">
            <h2 className="ds-title" id="ds-title">{product.name}</h2>
            <div className="ds-price tabular-nums">
              {product.old_price && product.old_price > product.price && (
                <s className="ds-old">{money(product.old_price)}</s>
              )}
              <b>{money(product.price)}</b> <span>so'm</span>
            </div>
          </div>
          {product.description && (
            <>
              <p className={`ds-desc${descOpen ? ' open' : ''}`}>{product.description}</p>
              {longDescription && (
                <button type="button" className="ds-more" onClick={() => setDescOpen((v) => !v)} aria-expanded={descOpen}>
                  {descOpen ? 'Kamroq' : 'Batafsil'}
                </button>
              )}
            </>
          )}
          {tiles.length > 0 && (
            <div className="ds-tiles">
              {tiles.map((t) => (
                <div className="ds-tile" key={t.label}>
                  <span>{t.label}</span>
                  <b>{t.value}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <Rail title="Shunga o'xshash taomlar" items={similar} cart={cart} onSelect={onSelect} onAdd={addRelated} />
        <Rail
          title={COMPLEMENT_TITLES[product.category_kind ?? 'other']}
          items={complement}
          cart={cart}
          onSelect={onSelect}
          onAdd={addRelated}
        />
      </div>

      <div className="ds-bar">
        {inCart > 0 ? (
          <>
            <div className="ds-stepper" role="group" aria-label="Savatdagi soni">
              <button type="button" onClick={() => onUpdateQuantity(product.id, -1)} aria-label="Kamaytirish">−</button>
              <span className="tabular-nums">{inCart}</span>
              <button type="button" onClick={() => onUpdateQuantity(product.id, 1)} aria-label="Ko'paytirish">+</button>
            </div>
            <button type="button" className="ds-cta" onClick={() => { onRequestClose(); onGoToCart(); }}>
              Savatga o'tish
            </button>
          </>
        ) : (
          <>
            <div className="ds-stepper" role="group" aria-label="Nechta qo'shish">
              <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Kamaytirish" disabled={count <= 1}>−</button>
              <span className="tabular-nums">{count}</span>
              <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="Ko'paytirish">+</button>
            </div>
            <button type="button" ref={addRef} className="ds-cta" onClick={add}>
              Savatga qo'shish
            </button>
          </>
        )}
      </div>
    </>
  );
};

export const DishSheet: React.FC<DishSheetProps> = (props) => {
  const { product, onClose } = props;
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const closingRef = useRef(false);
  const pushed = useRef(false);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    // Animatsiya o'chiq bo'lsa (o'chiq daraja, "harakatni kamaytirish") kutmasdan yopiladi
    window.setTimeout(() => onCloseRef.current(), fxEnabled() ? EXIT_MS : 0);
  }, []);

  /** Foydalanuvchi yopganda: tarix yozuvini qaytaramiz (popstate yopilishni o'zi bajaradi); yozuv bo'lmasa to'g'ridan-to'g'ri. */
  const requestClose = useCallback(() => {
    if (pushed.current && (window.history.state as { dishSheet?: boolean } | null)?.dishSheet) window.history.back();
    else animateClose();
  }, [animateClose]);

  // Telefonning "orqaga" tugmasi oynani yopsin (sahifadan chiqib ketmasin)
  useEffect(() => {
    window.history.pushState({ dishSheet: true }, '');
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      animateClose();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [animateClose]);

  // Escape, orqa fon aylanmasin, fokus oynaga va yopilganda joyiga qaytadi
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('ds-lock');
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('ds-lock');
      previous?.focus?.({ preventScroll: true });
    };
  }, [requestClose]);

  // Pastga surib yopish (tutqich chizig'idan): 110 px dan ko'p yoki tez surilsa yopiladi, aks holda joyiga qaytadi
  const onGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !panelRef.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panelRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onGrabUp = () => {
    const d = drag.current;
    drag.current = null;
    const panel = panelRef.current;
    if (!d || !panel) return;
    panel.style.transition = '';
    const speed = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 110 || (d.dy > 30 && speed > 0.6)) requestClose();
    else panel.style.transform = '';
  };

  return createPortal(
    <div className={`ds-root${closing ? ' is-closing' : ''}`}>
      <div className="ds-backdrop" onClick={requestClose} />
      <div
        className="ds-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-title"
        tabIndex={-1}
      >
        <div
          className="ds-grab"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        >
          <span />
        </div>
        <button type="button" className="ds-close" onClick={requestClose} aria-label="Yopish">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <SheetContent key={product.id} {...props} onRequestClose={requestClose} />
      </div>
    </div>,
    document.body,
  );
};
