import React, { useState, useEffect, useRef } from 'react';
import { Dish, Language, Currency } from '../types';
import { translations } from '../data/translations';
import { formatPrice, speakText, stopSpeech } from '../utils/formatters';
import { 
  X, 
  RotateCw, 
  Camera, 
  Check, 
  Maximize2, 
  Smartphone, 
  Sparkles, 
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  Share2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion } from 'motion/react';

interface ARViewerModalProps {
  dish: Dish | null;
  lang: Language;
  currency?: Currency;
  onClose: () => void;
  onAddToCart: (dish: Dish) => void;
}

export const ARViewerModal: React.FC<ARViewerModalProps> = ({
  dish,
  lang,
  currency = 'UZS',
  onClose,
  onAddToCart
}) => {
  const t = translations[lang];
  const [arMode, setArMode] = useState<'3d' | 'camera'>('3d');
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(18);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [isLoading3D, setIsLoading3D] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!dish) return;
    setIsLoading3D(true);
    const timer = setTimeout(() => setIsLoading3D(false), 500);
    return () => clearTimeout(timer);
  }, [dish]);

  // Clean up camera on unmount or mode switch
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Auto rotation in 3D mode
  useEffect(() => {
    if (!autoRotate || arMode === 'camera') return;
    const interval = setInterval(() => {
      setRotationY(prev => (prev + 0.8) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [autoRotate, arMode]);

  // Start Camera for Augmented Reality Mode
  const startCameraAR = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        setCameraStream(stream);
        setArMode('camera');
        setAutoRotate(false);
      } else {
        setCameraError("Qurilmangizda kamera qo'llab-quvvatlanmaydi.");
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable:", err);
      setCameraError("Kamera ruxsati berilmadi. Simulyatsiya qilingan AR rejimi yoqildi.");
      setArMode('camera'); // Allow simulation with animated table backdrop
    }
  };

  const stopCameraAR = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setArMode('3d');
    setAutoRotate(true);
  };

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [cameraStream, arMode]);

  // Render 3D Uzbek Traditional Dish onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dish) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + (arMode === 'camera' ? 40 : 10);
      const radY = (rotationY * Math.PI) / 180;
      const radX = (rotationX * Math.PI) / 180;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom * Math.cos(radX * 0.5));

      // 1. Shadow on table
      ctx.beginPath();
      ctx.ellipse(0, 75, 140, 45, 0, 0, Math.PI * 2);
      ctx.fillStyle = arMode === 'camera' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(26, 23, 20, 0.35)';
      ctx.fill();

      // 2. Ceramic Lagan Plate base
      ctx.save();
      ctx.rotate(radY * 0.1);

      // Plate outer rim (Traditional Ceramic Blue / Terracotta with gold lining)
      ctx.beginPath();
      ctx.ellipse(0, 40, 160, 65, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1B4B73'; // Ceramic Blue rim
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#C9A227'; // Gold border
      ctx.stroke();

      // Plate inner basin (White ceramic with classic cotton/islimiy pattern accents)
      ctx.beginPath();
      ctx.ellipse(0, 36, 142, 56, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FAF7F2';
      ctx.fill();

      // Ceramic inner floral ring
      ctx.beginPath();
      ctx.ellipse(0, 36, 120, 46, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(46, 111, 163, 0.4)';
      ctx.stroke();
      ctx.restore();

      // 3. Render Dish Food Geometry based on modelType
      ctx.save();
      const model = dish.modelType;

      if (model === 'plov') {
        // Golden rice mound
        const gradRice = ctx.createRadialGradient(0, 10, 20, 0, 25, 130);
        gradRice.addColorStop(0, '#E5A93C');
        gradRice.addColorStop(0.7, '#C88825');
        gradRice.addColorStop(1, '#8D5B11');
        ctx.beginPath();
        ctx.ellipse(0, 20, 110, 48, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradRice;
        ctx.fill();

        // Grains and raisins detail
        for (let i = 0; i < 35; i++) {
          const angle = (i * 137.5 + rotationY) * (Math.PI / 180);
          const dist = (i % 5) * 18 + 10;
          const gx = Math.cos(angle) * dist * 0.9;
          const gy = Math.sin(angle) * dist * 0.4 + 10;

          // Meat chunk or carrot
          if (i % 7 === 0) {
            ctx.fillStyle = '#6B2C11'; // browned lamb chunk
            ctx.beginPath();
            ctx.ellipse(gx, gy, 14, 9, 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (i % 4 === 0) {
            ctx.fillStyle = '#E86A17'; // sweet yellow/orange carrot
            ctx.fillRect(gx, gy, 12, 3);
          } else if (i % 9 === 0) {
            ctx.fillStyle = '#26140A'; // raisin
            ctx.beginPath();
            ctx.arc(gx, gy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Quail egg on top
        ctx.fillStyle = '#FDFBF7';
        ctx.beginPath();
        ctx.ellipse(-15, -5, 10, 14, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Red chili pepper
        ctx.beginPath();
        ctx.moveTo(15, -8);
        ctx.quadraticCurveTo(45, -18, 55, -2);
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#DC2626';
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (model === 'manti') {
        // 5 Steamed manti dumplings around the plate
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 + rotationY) * (Math.PI / 180);
          const mx = Math.cos(angle) * 55;
          const my = Math.sin(angle) * 26 + 22;

          ctx.beginPath();
          ctx.ellipse(mx, my, 26, 19, 0, 0, Math.PI * 2);
          const mGrad = ctx.createRadialGradient(mx, my - 5, 5, mx, my, 28);
          mGrad.addColorStop(0, '#FFFDF8');
          mGrad.addColorStop(0.8, '#EADDC9');
          mGrad.addColorStop(1, '#C8B79B');
          ctx.fillStyle = mGrad;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#B39E7E';
          ctx.stroke();

          // Pleat folds
          ctx.beginPath();
          ctx.moveTo(mx - 12, my);
          ctx.lineTo(mx + 12, my);
          ctx.moveTo(mx, my - 10);
          ctx.lineTo(mx, my + 10);
          ctx.strokeStyle = 'rgba(120, 90, 60, 0.35)';
          ctx.stroke();

          // Black pepper specks
          ctx.fillStyle = '#332C26';
          ctx.fillRect(mx - 4, my - 2, 2, 2);
          ctx.fillRect(mx + 5, my + 3, 2, 2);
        }

        // Center bowl with Suzma yogurt
        ctx.beginPath();
        ctx.arc(0, 22, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#1B4B73';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Green dill speckle
        ctx.fillStyle = '#16A34A';
        ctx.fillRect(-4, 20, 8, 3);
      } else if (model === 'somsa') {
        // 3 Triangular golden flaky somsa
        for (let i = 0; i < 3; i++) {
          const angle = (i * 120 + rotationY) * (Math.PI / 180);
          const sx = Math.cos(angle) * 45;
          const sy = Math.sin(angle) * 22 + 25;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(26, 16);
          ctx.lineTo(-26, 16);
          ctx.closePath();

          const sGrad = ctx.createLinearGradient(0, -20, 0, 20);
          sGrad.addColorStop(0, '#E09B3D');
          sGrad.addColorStop(0.5, '#C76A1B');
          sGrad.addColorStop(1, '#8B3E0B');
          ctx.fillStyle = sGrad;
          ctx.fill();
          ctx.strokeStyle = '#632B07';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Black nigella seeds (sedana)
          ctx.fillStyle = '#14110E';
          for (let s = 0; s < 7; s++) {
            ctx.fillRect((s % 3) * 8 - 8, (s % 2) * 8 - 4, 2.5, 2.5);
          }
          ctx.restore();
        }
      } else if (model === 'shashlik') {
        // Skewers with charred juicy lamb and onions
        for (let k = -1; k <= 1; k++) {
          const offY = k * 18 + 25;
          // Metal skewer line
          ctx.beginPath();
          ctx.moveTo(-110, offY);
          ctx.lineTo(110, offY);
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Meat cubes
          for (let m = -3; m <= 3; m++) {
            const mx = m * 22;
            ctx.beginPath();
            ctx.ellipse(mx, offY, 14, 12, 0.2, 0, Math.PI * 2);
            ctx.fillStyle = m % 2 === 0 ? '#782C0E' : '#963C15';
            ctx.fill();
            // Char marks
            ctx.fillStyle = '#261208';
            ctx.fillRect(mx - 4, offY - 3, 8, 3);
          }
        }
      } else {
        // Rich generic Uzbek delicacy representation
        ctx.beginPath();
        ctx.ellipse(0, 22, 100, 44, 0, 0, Math.PI * 2);
        const genGrad = ctx.createRadialGradient(0, 10, 10, 0, 20, 110);
        genGrad.addColorStop(0, '#DC2626');
        genGrad.addColorStop(0.5, '#C75B39');
        genGrad.addColorStop(1, '#83280B');
        ctx.fillStyle = genGrad;
        ctx.fill();
      }

      ctx.restore();

      // 4. Steam particles
      const time = Date.now() * 0.003;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      for (let s = 0; s < 3; s++) {
        const sx = Math.sin(time + s * 2) * 20 + (s - 1) * 25;
        const sy = -30 - ((time * 25 + s * 30) % 55);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 10, 18, Math.sin(time) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [dish, rotationY, rotationX, zoom, arMode]);

  // Touch / Drag controls for 360 degree rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    setAutoRotate(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setRotationY(prev => (prev + deltaX * 0.6 + 360) % 360);
    setRotationX(prev => Math.max(0, Math.min(45, prev - deltaY * 0.3)));
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleSnapshot = () => {
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2000);
  };

  if (!dish) return null;

  return (
    <div id="ar-viewer-modal-container" className="fixed inset-0 z-50 flex flex-col justify-between bg-[#14110E]/95 backdrop-blur-md text-[#F5F1EA]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#332C26] bg-[#1C1815]/90 z-20">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#1B4B73] text-[#C9A227] flex items-center justify-center font-bold text-xs border border-[#C9A227]/40 shadow-xs">
            AIR
          </span>
          <div>
            <h3 className="font-semibold text-base sm:text-lg leading-tight text-[#F5F1EA]">
              {dish.name[lang]}
            </h3>
            <p className="text-xs text-[#A89E92] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block animate-pulse"></span>
              {t.arRealScaleLabel} {dish.diameterCm} {t.arCentimeter}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio speech readout button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (isSpeaking) {
                stopSpeech();
                setIsSpeaking(false);
              } else {
                setIsSpeaking(true);
                const desc = `${dish.name[lang]}. Narxi ${formatPrice(dish.price, currency)}. ${dish.description[lang]}`;
                speakText(desc, lang);
              }
            }}
            className={`p-2.5 rounded-full transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-[#16A34A] text-white animate-pulse'
                : 'bg-[#241F1B] hover:bg-[#332C26] text-[#A89E92] hover:text-white'
            }`}
            title={isSpeaking ? t.stopAudio : t.listenAudio}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>

          <motion.button
            id="btn-close-ar"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="p-2.5 rounded-full bg-[#241F1B] hover:bg-[#332C26] text-[#A89E92] hover:text-white transition-colors cursor-pointer"
            aria-label="Close AR"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Main Visual Stage (Canvas / Live Camera Video) */}
      <div 
        className="relative flex-1 flex items-center justify-center overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background if in Camera AR mode */}
        {arMode === 'camera' && (
          <div className="absolute inset-0 z-0 bg-black">
            {cameraStream ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              // Simulated Wood Table Surface background when real camera permission not available in iframe
              <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3A2419] via-[#24140D] to-[#120804] flex items-center justify-center opacity-90">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#48291A_1px,transparent_1px),linear-gradient(to_bottom,#48291A_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
              </div>
            )}

            {/* AR Table Placement Reticle Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 w-64 h-32 border-2 border-dashed border-[#C9A227] rounded-[100%] pointer-events-none opacity-80 animate-pulse flex items-center justify-center">
              <span className="text-[11px] text-[#C9A227] bg-[#14110E]/80 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Ø {dish.diameterCm} sm stol yuzasi
              </span>
            </div>
          </div>
        )}

        {/* 3D Canvas Rendering */}
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="relative z-10 w-full max-w-[480px] aspect-square drop-shadow-2xl"
        />

        {/* Loading Skeleton */}
        {isLoading3D && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#14110E]/80 backdrop-blur-sm">
            <div className="w-14 h-14 border-4 border-[#1B4B73] border-t-[#C9A227] rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-medium text-[#F5F1EA]">{t.arLoading}</p>
          </div>
        )}

        {/* Floating Tool Controls Overlay */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2.5 rounded-xl backdrop-blur-md border border-[#332C26] transition-all ${
              autoRotate ? 'bg-[#C75B39] text-white' : 'bg-[#241F1B]/80 text-[#A89E92]'
            }`}
            title="Avto aylantirish"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoom(prev => Math.min(1.4, prev + 0.15))}
            className="p-2.5 rounded-xl bg-[#241F1B]/80 hover:bg-[#332C26] text-[#F5F1EA] backdrop-blur-md border border-[#332C26]"
            title="Yaqinlashtirish"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoom(prev => Math.max(0.7, prev - 0.15))}
            className="p-2.5 rounded-xl bg-[#241F1B]/80 hover:bg-[#332C26] text-[#F5F1EA] backdrop-blur-md border border-[#332C26]"
            title="Uzoqlashtirish"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Hint Banner */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[#1C1815]/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#332C26] text-xs text-[#A89E92] flex items-center gap-2 pointer-events-none whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          {arMode === 'camera' ? t.arCameraActive : t.arRotateHint}
        </div>
      </div>

      {/* Action Footer Drawer */}
      <div className="bg-[#1C1815] border-t border-[#332C26] p-5 z-20 space-y-4">
        {/* AR CTA Toggle Button - Strictly formatted as Ceramic Blue #1B4B73, white text, 1px gold border #C9A227 */}
        {arMode === '3d' ? (
          <div>
            <button
              id="btn-launch-ar-camera"
              onClick={startCameraAR}
              className="w-full h-14 rounded-xl bg-[#1B4B73] hover:bg-[#2E6FA3] active:bg-[#153B5B] text-white font-semibold text-base border border-[#C9A227] flex items-center justify-center gap-3 transition-all animate-ar-pulse shadow-lg cursor-pointer"
            >
              <Smartphone className="w-5 h-5 text-[#C9A227]" />
              <span>{t.arButtonCTA}</span>
            </button>
            <p className="text-center text-[11px] text-[#A89E92] mt-1.5">
              ✓ {t.realSizeBadge} (1:1 masshtab, Lagan Ø{dish.diameterCm} sm)
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              id="btn-take-snapshot"
              onClick={handleSnapshot}
              className="flex-1 h-12 rounded-xl bg-[#241F1B] hover:bg-[#332C26] text-white border border-[#332C26] flex items-center justify-center gap-2 font-medium text-sm transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#C9A227]" />
              <span>{snapshotTaken ? '✓ Rasm olindi' : t.arTakeSnapshot}</span>
            </button>
            <button
              id="btn-exit-camera"
              onClick={stopCameraAR}
              className="px-4 h-12 rounded-xl bg-[#332C26] hover:bg-[#423932] text-[#F5F1EA] font-medium text-sm transition-all cursor-pointer"
            >
              3D ga qaytish
            </button>
          </div>
        )}

        {/* Dish Info & Direct Add to Cart Action */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#2A241F]">
          <div>
            <span className="text-xs text-[#A89E92] block">
              {currency === 'USD' ? 'AQSH DOLLARI' : currency === 'EUR' ? 'EVRO' : 'NARXI'}
            </span>
            <span className="text-2xl font-bold text-[#E3C158] num">
              {formatPrice(dish.price, currency)}
            </span>
            {currency !== 'UZS' && (
              <span className="block text-[11px] text-[#A89E92] num">
                {dish.price.toLocaleString('uz-UZ')} so'm
              </span>
            )}
          </div>

          <motion.button
            id="btn-add-to-cart-from-ar"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              onAddToCart(dish);
              stopSpeech();
              onClose();
            }}
            className="flex-1 max-w-[220px] h-12 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] active:bg-[#A8452A] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <span>{t.addToCart}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
