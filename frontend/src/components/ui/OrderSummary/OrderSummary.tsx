import React from 'react';
import { Button } from '../Button';
import { fmtMoney, t } from '../../../i18n';
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
  checkoutButtonText = t("Buyurtmani tasdiqlash"),
  showButton = true,
  className = '',
}) => {
  const serviceFee = Math.round((subtotal * servicePercent) / 100);
  const total = subtotal + serviceFee;

  return (
    <div className={`react-order-summary ${className}`}>
      <h3 className="summary-card-title">{t('Hisob-kitob')}</h3>

      <div className="summary-card-list">
        <div className="summary-card-row">
          <span className="row-label">{t('Taomlar summasi:')}</span>
          <span className="row-val tabular-nums">{fmtMoney(subtotal)}</span>
        </div>

        {servicePercent > 0 && (
          <div className="summary-card-row row-muted">
            <span className="row-label">{t('Xizmat haqi ({p}%):', { p: servicePercent })}</span>
            <span className="row-val tabular-nums">+{fmtMoney(serviceFee)}</span>
          </div>
        )}

        <div className="summary-card-line" />

        <div className="summary-card-row row-total">
          <span className="row-label">{t("Jami to'lov:")}</span>
          <span className="row-val-total tabular-nums">{fmtMoney(total)}</span>
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
