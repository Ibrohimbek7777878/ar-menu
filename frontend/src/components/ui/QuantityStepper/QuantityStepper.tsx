import React from 'react';
import './QuantityStepper.css';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 0,
  max = 99,
  onChange,
  size = 'md',
  className = '',
}) => {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className={`react-stepper stepper-sz-${size} ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="stepper-action-btn"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Kamaytirish"
      >
        −
      </button>
      <span className="stepper-display-value">{value}</span>
      <button
        type="button"
        className="stepper-action-btn"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Oshirish"
      >
        +
      </button>
    </div>
  );
};
