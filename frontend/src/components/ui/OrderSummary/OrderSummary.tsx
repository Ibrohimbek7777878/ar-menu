import React from 'react';
import { Button } from '../Button';
import './OrderSummary.css';

export interface OrderSummaryProps {
  subtotal: number;
  servicePercent?: number;
  onCheckout?: () => void;
  checkoutButtonText?: string;
  showButton?: boolean;
  className?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  servicePercent = 10,
  onCheckout,
  checkoutButtonText = "Buyurtmani tasdiqlash",
  showButton = true,
  className = '',
}) => {
  const serviceFee = Math.round((subtotal * servicePercent) / 100);
  const total = subtotal + serviceFee;

  const fmt = (num: number) => new Intl.NumberFormat('uz-UZ').format(num);

  return (
    <div className={`react-order-summary ${className}`}>
      <h3 className="summary-card-title">Hisob-kitob</h3>

      <div className="summary-card-list">
        <div className="summary-card-row">
          <span className="row-label">Taomlar summasi:</span>
          <span className="row-val tabular-nums">{fmt(subtotal)} so'm</span>
        </div>

        {servicePercent > 0 && (
          <div className="summary-card-row row-muted">
            <span className="row-label">Xizmat haqi ({servicePercent}%):</span>
            <span className="row-val tabular-nums">+{fmt(serviceFee)} so'm</span>
          </div>
        )}

        <div className="summary-card-line" />

        <div className="summary-card-row row-total">
          <span className="row-label">Jami to'lov:</span>
          <span className="row-val-total tabular-nums">{fmt(total)} so'm</span>
        </div>
      </div>

      {showButton && (
        <div className="summary-card-cta">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onCheckout}
          >
            {checkoutButtonText}
          </Button>
        </div>
      )}
    </div>
  );
};
