import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors
        placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
        ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500'}
        ${className}`}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
