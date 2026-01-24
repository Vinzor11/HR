import * as React from "react"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  isSearching?: boolean
  searchPlaceholder?: string
  filtersSlot?: ReactNode
  actionsSlot?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  isSearching = false,
  searchPlaceholder = "Search...",
  filtersSlot,
  actionsSlot,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex-shrink-0 bg-card border-b border-border shadow-sm z-40", className)}>
      <div className="px-3 md:px-6 py-2 md:py-3">
        {/* Title and Subtitle - Left aligned */}
        <div className="mb-3 md:mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Single row: Filters/Search on left, Actions on right */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Left side: Filters, Search, Dropdowns */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Field */}
            {onSearchChange && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchValue || ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-9 h-9 text-sm bg-background/50 border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : searchValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted rounded-md"
                    onClick={() => onSearchChange("")}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
            )}

            {/* Filters Slot - Dropdowns, Selects, etc. */}
            {filtersSlot && (
              <div className="flex items-center gap-2">
                {filtersSlot}
              </div>
            )}
          </div>

          {/* Right side: Action Buttons (icon-only) */}
          {actionsSlot && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {actionsSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
