// <model-viewer> — Google'ning 3D/AR veb-komponenti (index.html orqali yuklanadi).
// JSX ichida ishlatish uchun TypeScript e'loni.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  alt?: string;
  'auto-rotate'?: boolean;
  'rotation-per-second'?: string;
  'camera-controls'?: boolean;
  'touch-action'?: string;
  'shadow-intensity'?: string;
  'environment-image'?: string;
  exposure?: string;
  ar?: boolean;
  'ar-modes'?: string;
};

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': ModelViewerAttributes;
      }
    }
  }
}

export {};
