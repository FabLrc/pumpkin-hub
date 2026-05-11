"use client";

import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly error: string | null;
  readonly hint?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label
          htmlFor={htmlFor}
          className="block font-mono text-xs text-text-muted uppercase tracking-widest"
        >
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </label>
        {hint && (
          <span className="font-mono text-xs text-text-muted">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="mt-1 font-mono text-xs text-error flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
