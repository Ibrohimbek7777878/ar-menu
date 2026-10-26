import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-subtle)',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: '16px',
            color: 'var(--text-dim)',
            padding: '16px',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '50%',
            display: 'inline-flex',
          }}
        >
          {icon}
        </div>
      )}
      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
        {title}
      </h4>
      {description && (
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: 'var(--text-muted)',
            maxWidth: '360px',
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '20px' }}>{action}</div>}
    </div>
  );
};
