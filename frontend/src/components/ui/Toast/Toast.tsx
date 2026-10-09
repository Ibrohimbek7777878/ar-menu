import React from 'react';
import './Toast.css';

export interface ToastProps {
  message: string;
  icon?: React.ReactNode;
  visible: boolean;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  icon,
  visible,
  className = '',
}) => {
  return (
    <div className={`react-toast-anchor ${visible ? 'visible' : ''} ${className}`}>
      <div className="react-toast-bubble">
        {icon ? (
          <span className="toast-symbol">{icon}</span>
        ) : (
          <span className="toast-default-dot" aria-hidden="true" />
        )}
        <span className="toast-text-content">{message}</span>
      </div>
    </div>
  );
};
