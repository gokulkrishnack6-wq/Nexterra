import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="font-sans text-[13px] font-medium text-[#18251F]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[#6F776F] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-white text-[#18251F] placeholder:text-[#6F776F]/60 text-sm font-sans rounded-md border min-h-[38px] ${
            error ? 'border-[#C74738] ring-1 ring-[#C74738]' : 'border-[#DCD6CB] hover:border-[#8BA681]'
          } focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 py-1.5 px-3 ${
            leftIcon ? 'pl-8' : 'pl-3'
          } ${rightIcon ? 'pr-8' : 'pr-3'} transition-colors disabled:opacity-50 disabled:bg-[#F8F6EF] ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-[#6F776F] flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="font-sans text-xs text-[#C74738]">{error}</span>}
      {!error && helperText && <span className="font-sans text-xs text-[#6F776F]">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="font-sans text-[13px] font-medium text-[#18251F]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full bg-white text-[#18251F] placeholder:text-[#6F776F]/60 text-sm font-sans rounded-md border ${
          error ? 'border-[#C74738] ring-1 ring-[#C74738]' : 'border-[#DCD6CB] hover:border-[#8BA681]'
        } focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 p-2.5 transition-colors disabled:opacity-50 disabled:bg-[#F8F6EF] ${className}`}
        {...props}
      />
      {error && <span className="font-sans text-xs text-[#C74738]">{error}</span>}
      {!error && helperText && <span className="font-sans text-xs text-[#6F776F]">{helperText}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

