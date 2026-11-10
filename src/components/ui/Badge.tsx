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
    sm: 'px-2.5 py-0.5 text-[10px] font-sans font-bold leading-none',
    md: 'px-3 py-1 text-xs font-sans font-semibold',
  };

  const variantStyles = {
    brand: 'bg-[#103D2A] text-white',
    active: 'bg-[#E7EEDC] text-[#103D2A] font-semibold',
    success: 'bg-[#E7EEDC] text-[#315F3B] font-semibold',
    pending: 'bg-amber-100 text-amber-900 font-semibold',
    neutral: 'bg-[#F8F6EF] text-[#6F776F] border border-[#E8E4DA]',
    error: 'bg-rose-50 text-[#C74738] font-semibold',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full uppercase tracking-wider ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

