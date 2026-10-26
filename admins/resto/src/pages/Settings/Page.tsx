import React from 'react';
import { Card } from '@admins/shared';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Sozlamalar</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Settings size={24} />
          <span>Restoran sozlamalari va Telegram bot integratsiyasi.</span>
        </div>
      </Card>
    </div>
  );
};
export default SettingsPage;
