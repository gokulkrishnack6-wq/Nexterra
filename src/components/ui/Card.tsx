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
    elevated: 'bg-white border border-gl-border shadow-card',
    flat: 'bg-white border border-gl-border',
    low: 'bg-gl-cream border border-gl-border',
  };

  const hoverStyles = hoverEffect ? 'hover:shadow-card-hover hover:border-gl-sage transition-all duration-200' : '';

  return (
    <div
      className={`rounded-xl p-space-md ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

