import * as React from "react"
import { cn } from "@/lib/utils"

interface FloatingInputProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label = '', error, helperText, id, value, ...props }, ref) => {
    const inputId = id || `floating-input-${(label || 'input').toLowerCase().replace(/\s+/g, '-')}`;
    const hasValue = value !== undefined && value !== null && value !== '';
    const isFocused = React.useRef(false);
    const [isFocusedState, setIsFocusedState] = React.useState(false);

    return (
      <div className="relative">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "peer h-12 w-full rounded-lg border bg-background px-4 pt-6 pb-2 text-sm transition-all",
              "placeholder:text-transparent focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              error 
                ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                : "border-border",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            placeholder=" "
            value={value}
            onFocus={() => setIsFocusedState(true)}
            onBlur={() => setIsFocusedState(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all pointer-events-none",
              "peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2",
              (hasValue || isFocusedState) && "top-3.5 text-xs text-primary",
              error && "text-destructive"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        </div>
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted-foreground px-1">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-destructive px-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";






