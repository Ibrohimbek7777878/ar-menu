import React from 'react';
import { useSession } from '../auth/session';
import { EmptyState } from '../ui/EmptyState';
import { commonUz } from '../i18n/uz';
import { ShieldAlert } from 'lucide-react';

export interface CapabilityGuardProps {
  capability?: string;
  children: React.ReactNode;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({
  capability,
  children,
}) => {
  const { session, loading, hasCapability } = useSession();

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        {commonUz.loading}
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (capability && !hasCapability(capability)) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <EmptyState
          icon={<ShieldAlert size={32} style={{ color: 'var(--accent-rose)' }} />}
          title={commonUz.unauthorized}
          description={commonUz.accessDenied}
        />
      </div>
    );
  }

  return <>{children}</>;
};
