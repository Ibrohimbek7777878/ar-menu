import React from 'react';
import { Card } from '@admins/shared';
import { QrCode } from 'lucide-react';

export const TablesPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Stollar va QR Kodlar</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <QrCode size={24} />
          <span>Stollar xaritasi va QR menyu generatori.</span>
        </div>
      </Card>
    </div>
  );
};
export default TablesPage;
