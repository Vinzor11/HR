import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  showPasswordToggle?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPasswordToggle = false, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    const isPassword = type === "password" || (showPasswordToggle && type === undefined)
    const inputType = showPasswordToggle ? (visible ? "text" : "password") : type

    const inputElement = (
      <input
        ref={ref}
        type={inputType}
        data-slot="input"
        className={cn(
          "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          showPasswordToggle ? "pr-10" : "",
          className
        )}
        {...props}
      />
    )

    if (!showPasswordToggle || !isPassword) {
      return inputElement
    }

    return (
      <div className="relative">
        {inputElement}
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none absolute inset-y-0 right-2 flex items-center justify-center rounded-md"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
