import React from 'react';
import './SearchBar.css';

export interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Taom yoki ichimlik qidiring...',
  className = '',
}) => {
  return (
    <div className={`react-search-bar ${className}`}>
      <span className="search-icon-prefix" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="text"
        className="search-native-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-clear-cross"
          onClick={() => onChange('')}
          aria-label="Tozalash"
        >
          ✕
        </button>
      )}
    </div>
  );
};
