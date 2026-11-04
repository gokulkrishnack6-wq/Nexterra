import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-label-md text-label-md rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-body-sm gap-1.5',
    md: 'px-4 py-2 text-label-md gap-2',
    lg: 'px-5 py-2.5 text-body-lg font-medium gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-primary-container text-on-primary hover:bg-primary shadow-sm hover:shadow',
    secondary: 'bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant/40',
    subtle: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-outline-variant shadow-sm',
    outline: 'bg-transparent text-primary border border-outline-variant hover:bg-surface-container-low hover:border-outline',
    danger: 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error border border-error/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};

