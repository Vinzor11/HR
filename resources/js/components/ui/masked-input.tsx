import * as React from "react"
import { useIMask } from 'react-imask';
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface MaskedInputProps extends React.ComponentProps<"input"> {
  mask: string;
  label?: string;
  error?: string;
  helperText?: string;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, label, error, helperText, id, value, onChange, ...props }, ref) => {
    const inputId = id || `masked-input-${mask}`;
    
    // Convert react-input-mask format (999-9999-9999) to IMask pattern format
    // IMask uses '0' for digits instead of '9'
    const imaskPattern = mask.replace(/9/g, '0');
    
    const { ref: imaskRef, setValue } = useIMask(
      {
        mask: imaskPattern,
      },
      {
        onAccept: (val: string) => {
          if (onChange) {
            // Create a synthetic event to match the expected onChange signature
            const syntheticEvent = {
              target: { value: val },
              currentTarget: { value: val }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        },
      }
    );
    
    // Sync external value changes with the mask
    React.useEffect(() => {
      if (value !== undefined) {
        const inputElement = typeof imaskRef === 'function' ? null : imaskRef?.current;
        if (inputElement) {
          const currentValue = inputElement.value || '';
          const newValue = value as string || '';
          if (currentValue !== newValue) {
            setValue(newValue);
          }
        } else if (value) {
          // If the ref isn't ready yet, set the initial value
          setValue(value as string);
        }
      }
    }, [value, setValue, imaskRef]);
    
    // Merge refs: combine the forwarded ref with the imask ref
    const inputRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        if (typeof imaskRef === 'function') {
          imaskRef(node);
        } else if (imaskRef) {
          imaskRef.current = node;
        }
      },
      [ref, imaskRef]
    );
    
    return (
      <div className="relative">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium mb-2 block">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <Input
          {...props}
          ref={inputRef}
          id={inputId}
          className={cn("h-12", className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        />
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
MaskedInput.displayName = "MaskedInput";


