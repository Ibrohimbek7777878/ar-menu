import React from 'react';
import './Badge.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'ar' | 'neutral' | 'dark';
  size?: 'sm' | 'md';
  pill?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'success',
  size = 'md',
  pill = true,
  icon,
  className = '',
}) => {
  return (
    <span className={`react-badge badge-${variant} badge-sz-${size} ${pill ? 'badge-pill' : ''} ${className}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-text">{children}</span>
    </span>
  );
};
