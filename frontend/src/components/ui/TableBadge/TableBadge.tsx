import React from 'react';
import './TableBadge.css';

export interface TableBadgeProps {
  tableNumber?: string | number;
  hallName?: string;
  status?: 'available' | 'occupied' | 'reserved';
  className?: string;
}

export const TableBadge: React.FC<TableBadgeProps> = ({
  tableNumber = 1,
  hallName,
  status = 'available',
  className = '',
}) => {
  return (
    <div className={`react-table-badge status-${status} ${className}`}>
      <span className="table-badge-pin" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
        </svg>
      </span>
      <div className="table-badge-text">
        <span className="table-badge-title tabular-nums">Stol #{tableNumber}</span>
        {hallName && <span className="table-badge-hall">{hallName}</span>}
      </div>
    </div>
  );
};
