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
    elevated: 'bg-white border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)]',
    flat: 'bg-white border border-[#E8E4DA]',
    low: 'bg-[#F8F6EF] border border-[#E8E4DA]',
  };

  const hoverStyles = hoverEffect ? 'hover:shadow-card-hover hover:border-[#8BA681] transition-all duration-200' : '';

  return (
    <div
      className={`rounded-[18px] p-5 sm:p-6 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

