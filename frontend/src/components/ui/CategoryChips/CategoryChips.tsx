import React from 'react';
import type { Category } from '../../../types/dish';
import './CategoryChips.css';

export interface CategoryChipsProps {
  categories: Category[];
  activeId: number | 'all';
  onSelect: (id: number | 'all') => void;
  className?: string;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  activeId,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`category-chips-scroll ${className}`}>
      <button
        type="button"
        className={`chip-pill ${activeId === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
      >
        <span>Barchasi</span>
      </button>

      {/* "Barchasi" chipi yuqorida doim bor: ma'lumotdagi xuddi shunday nomli kategoriya ikkinchi nusxa bo'lib chiqmasin */}
      {categories.filter((cat) => cat.name.trim().toLowerCase() !== 'barchasi').map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`chip-pill ${activeId === cat.id ? 'active' : ''}`}
          onClick={() => onSelect(cat.id)}
        >
          <span>{cat.name}</span>
          {typeof cat.count === 'number' && (
            <span className="chip-counter tabular-nums">{cat.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};
