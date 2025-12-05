import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  className?: string;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ label, value, onChange, options = [], error, className, disabled, orientation = 'horizontal', ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            <span className="text-destructive ml-1">*</span>
          </label>
        )}
        <div className={cn(
          "flex gap-4",
          orientation === 'vertical' && "flex-col gap-2"
        )}>
          {(options || []).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => !disabled && onChange(e.target.value)}
                disabled={disabled}
                className="h-4 w-4 text-primary border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1.5 px-1">{error}</p>
        )}
      </div>
    );
  }
);
RadioGroup.displayName = "RadioGroup";






