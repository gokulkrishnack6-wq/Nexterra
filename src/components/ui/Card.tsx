import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'low';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    elevated: 'bg-surface-container-lowest border border-outline-variant/70 shadow-sm',
    flat: 'bg-surface-container border border-outline-variant/50',
    low: 'bg-surface-container-low border border-outline-variant/40',
  };

  const hoverStyles = hoverEffect ? 'hover:shadow-md hover:border-outline transition-all duration-200' : '';

  return (
    <div
      className={`rounded-xl p-space-md ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

