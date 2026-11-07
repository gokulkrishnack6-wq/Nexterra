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
        <label className="font-label-md text-label-md text-on-surface">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-outline pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md rounded-lg border ${
            error ? 'border-error ring-1 ring-error' : 'border-outline-variant hover:border-outline'
          } focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 py-2 ${
            leftIcon ? 'pl-9' : 'pl-3'
          } ${rightIcon ? 'pr-9' : 'pr-3'} transition-all disabled:opacity-50 disabled:bg-surface-container-low ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-outline flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="font-body-sm text-body-sm text-error">{error}</span>}
      {!error && helperText && <span className="font-body-sm text-body-sm text-outline">{helperText}</span>}
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
        <label className="font-label-md text-label-md text-on-surface">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md rounded-lg border ${
          error ? 'border-error ring-1 ring-error' : 'border-outline-variant hover:border-outline'
        } focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 p-3 transition-all disabled:opacity-50 disabled:bg-surface-container-low ${className}`}
        {...props}
      />
      {error && <span className="font-body-sm text-body-sm text-error">{error}</span>}
      {!error && helperText && <span className="font-body-sm text-body-sm text-outline">{helperText}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

