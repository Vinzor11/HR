import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ReactNode
  tooltip?: string
  tooltipSide?: "top" | "bottom" | "left" | "right"
  "aria-label": string
}

export function IconButton({
  icon,
  tooltip,
  tooltipSide = "top",
  className,
  variant = "ghost",
  size = "icon",
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "h-9 w-9 p-0 transition-opacity hover:opacity-80",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border-border hover:bg-muted/50",
        variant === "ghost" && "hover:bg-muted/50",
        className
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </Button>
  )

  if (!tooltip) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide} className="z-50">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
