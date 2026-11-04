// Sayr ekranining ikonlari (umumiy Icon to'plamiga tegmaslik uchun shu yerda): chiziq qalinligi/uchlari bir xil, `currentColor`.
import React from 'react';

const PATHS = {
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  forward: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  pause: <path d="M8 5v14M16 5v14" strokeWidth={3} />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.5" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.7a3.5 3.5 0 0 1 0 6.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  spin: <path d="M12 3a9 9 0 0 1 9 9" />,
} satisfies Record<string, React.ReactNode>;

export type TourIconName = keyof typeof PATHS;

export const TourIcon: React.FC<{ name: TourIconName; size?: number; className?: string }> = ({ name, size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
    {PATHS[name]}
  </svg>
);
