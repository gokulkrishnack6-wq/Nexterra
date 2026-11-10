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
    elevated: 'bg-white border border-[#E8E4DA] shadow-subtle',
    flat: 'bg-white border border-[#E8E4DA]',
    low: 'bg-[#F8F6EF] border border-[#E8E4DA]',
  };

  const hoverStyles = hoverEffect ? 'hover:border-[#8BA681] transition-colors' : '';

  return (
    <div
      className={`rounded-lg p-4 sm:p-5 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

