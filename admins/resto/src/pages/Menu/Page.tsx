import React from 'react';
import { Card } from '@admins/shared';
import { Utensils } from 'lucide-react';

export const MenuPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Menyu va Taomlar</h1>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Utensils size={24} />
          <span>Menyu boshqaruvi moduli tayyorlanmoqda.</span>
        </div>
      </Card>
    </div>
  );
};
export default MenuPage;
