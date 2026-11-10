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
    sm: 'px-2 py-0.5 text-[11px] font-sans font-medium',
    md: 'px-2.5 py-1 text-xs font-sans font-medium',
  };

  const variantStyles = {
    brand: 'bg-[#103D2A] text-white',
    active: 'bg-[#E7EEDC] text-[#103D2A]',
    success: 'bg-[#E7EEDC] text-[#315F3B]',
    pending: 'bg-[#FAF0E6] text-[#92400E]',
    neutral: 'bg-white text-[#6F776F] border border-[#E8E4DA]',
    error: 'bg-rose-50 text-[#C74738] border border-rose-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

