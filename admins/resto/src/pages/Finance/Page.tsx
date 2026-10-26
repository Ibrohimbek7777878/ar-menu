import React from 'react';
import { Card } from '@admins/shared';
import { DollarSign } from 'lucide-react';

export const FinancePage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Moliya va Sof Pul Oqimi</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <DollarSign size={24} />
          <span>Restoran kassa va xarajatlar monitoringi.</span>
        </div>
      </Card>
    </div>
  );
};
export default FinancePage;
