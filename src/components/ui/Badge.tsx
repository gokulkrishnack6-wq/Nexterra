import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'success' | 'pending' | 'neutral' | 'error' | 'brand';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-label-sm font-label-sm leading-none',
    md: 'px-2.5 py-1 text-body-sm font-medium',
  };

  const variantStyles = {
    brand: 'bg-primary-container text-on-primary',
    active: 'bg-tertiary-fixed text-primary font-semibold',
    success: 'bg-secondary-container text-on-secondary-container font-medium',
    pending: 'bg-surface-container-high text-on-surface-variant',
    neutral: 'bg-surface-container text-on-surface-variant border border-outline-variant/50',
    error: 'bg-error-container text-on-error-container font-medium',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full uppercase tracking-wider ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
