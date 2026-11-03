import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  return (
    <Card hoverable>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {title}
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums' }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                marginTop: '6px',
                color: trend.isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              }}
            >
              {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              padding: '10px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
