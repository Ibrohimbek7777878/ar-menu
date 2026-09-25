/* ARMENU — AR qo'llab-quvvatlashini aniqlash */
(function (w) {
  'use strict';

  const ua = navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isChromeAndroid = isAndroid && /Chrome\/(\d+)/.test(ua);

  function chromeVersion() {
    const m = ua.match(/Chrome\/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function iosVersion() {
    const m = ua.match(/OS (\d+)_/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function device() {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return false;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        if (/SwiftShader|Software|llvmpipe/i.test(r)) return false;
      }
      return true;
    } catch (_) { return false; }
  }

  function isWeakDevice() {
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    return mem <= 2 || cores <= 2;
  }

  function isSlowNetwork() {
    const c = navigator.connection;
    if (!c) return false;
    if (c.saveData) return true;
    return ['slow-2g', '2g'].includes(c.effectiveType);
  }

  async function detectARSupport() {
    if (w.navigator.xr && w.navigator.xr.isSessionSupported) {
      try {
        const ok = await navigator.xr.isSessionSupported('immersive-ar');
        if (ok && hasWebGL()) return 'webxr';
      } catch (_) {}
    }
    if (isIOS && iosVersion() >= 12) {
      const a = document.createElement('a');
      const supported = a.relList && a.relList.supports && a.relList.supports('ar');
      if (supported || isSafari) return 'quick-look';
    }
    if (isChromeAndroid && chromeVersion() >= 79) return 'scene-viewer';
    if (hasWebGL() && !isWeakDevice() && !isSlowNetwork()) return '3d-only';
    if (!isSlowNetwork()) return '360';
    return 'image';
  }

  w.ARDetect = {
    detectARSupport,
    device,
    hasWebGL,
    isWeakDevice,
    isSlowNetwork,
    isIOS, isAndroid,
    info() {
      return {
        device: device(), webgl: hasWebGL(),
        weak: isWeakDevice(), slow: isSlowNetwork(),
        ua: ua.slice(0, 120),
      };
    },
  };
})(window);
