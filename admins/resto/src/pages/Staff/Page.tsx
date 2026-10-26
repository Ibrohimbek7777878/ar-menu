import React from 'react';
import { Card } from '@admins/shared';
import { Users } from 'lucide-react';

export const StaffPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Xodimlar Boshqaruvi</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Users size={24} />
          <span>Restoran xodimlari va rollar boshqaruvi.</span>
        </div>
      </Card>
    </div>
  );
};
export default StaffPage;
