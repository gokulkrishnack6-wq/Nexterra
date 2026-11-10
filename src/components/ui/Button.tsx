import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-medium rounded-md transition-colors active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

  const sizeStyles = {
    sm: 'px-2.5 py-1 min-h-[32px] text-xs gap-1.5',
    md: 'px-3.5 py-1.5 min-h-[38px] text-xs sm:text-sm gap-2',
    lg: 'px-4 py-2 min-h-[42px] text-sm gap-2',
  };

  const variantStyles = {
    primary: 'bg-[#103D2A] text-white hover:bg-[#08291D] shadow-2xs',
    secondary: 'bg-[#EAE4D8]/60 text-[#103D2A] hover:bg-[#EAE4D8] border border-[#E8E4DA]',
    subtle: 'bg-white text-[#18251F] hover:bg-[#FAF8F2] border border-[#E8E4DA]',
    outline: 'bg-transparent text-[#18251F] border border-[#E8E4DA] hover:bg-[#FAF8F2] hover:border-[#8BA681]',
    danger: 'bg-rose-50 text-[#C74738] hover:bg-[#C74738] hover:text-white border border-[#C74738]/20',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 shrink-0 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
