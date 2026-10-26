import React from 'react';
import { Card } from '@admins/shared';
import { ShoppingBag } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Buyurtmalar</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <ShoppingBag size={24} />
          <span>Buyurtmalar moduli keyingi bosqichda faollashtiriladi.</span>
        </div>
      </Card>
    </div>
  );
};
export default OrdersPage;
