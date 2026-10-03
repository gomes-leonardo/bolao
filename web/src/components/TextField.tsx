import { forwardRef, type InputHTMLAttributes, useId } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, className = "", ...props }, ref) {
    const id = useId();
    const messageId = `${id}-message`;
    const message = error ?? hint;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="text-[13px] font-bold tracking-[0.08em] text-muted uppercase"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`h-[52px] border-2 bg-surface px-3.5 text-base text-paper outline-none focus:border-fluor-orange ${
            error ? "border-fluor-pink" : "border-line"
          } ${className}`}
          {...props}
        />
        {message && (
          <span
            id={messageId}
            className={`text-sm ${error ? "text-fluor-pink" : "text-muted"}`}
          >
            {message}
          </span>
        )}
      </div>
    );
  },
);
