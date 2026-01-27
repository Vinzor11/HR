import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface PageLayoutProps {
  // Title section
  title: string
  subtitle?: string
  primaryAction?: {
    label: string
    icon?: ReactNode
    onClick: () => void
    permission?: boolean
  }
  
  // Control panel
  searchValue?: string
  onSearchChange?: (value: string) => void
  isSearching?: boolean
  searchPlaceholder?: string
  searchMode?: {
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }
  perPage?: {
    value: string
    options?: string[]
    onChange: (value: string) => void
  }
  filtersSlot?: ReactNode
  actionsSlot?: ReactNode
  
  // Filter chips
  filterChips?: ReactNode
  
  // Content
  children: ReactNode
  
  // Pagination
  pagination?: ReactNode
  
  // Container
  className?: string
  containerHeight?: string
}

export function PageLayout({
  title,
  subtitle,
  primaryAction,
  searchValue,
  onSearchChange,
  isSearching = false,
  searchPlaceholder = "Search...",
  searchMode,
  perPage,
  filtersSlot,
  actionsSlot,
  filterChips,
  children,
  pagination,
  className,
  containerHeight = 'calc(100vh - 80px)',
}: PageLayoutProps) {
  const PER_PAGE_OPTIONS = perPage?.options || ['5', '10', '25', '50', '100']
  
  return (
    <div className={cn("flex flex-col overflow-hidden bg-background", className)} style={{ height: containerHeight }}>
      {/* Title and Subtitle - Without card */}
      <div className="flex-shrink-0 px-3 md:px-6 pt-4 pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-1">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {primaryAction && primaryAction.permission !== false && (
          <Button 
            size="default" 
            className="h-10 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all flex-shrink-0"
            style={{ 
              background: 'hsl(146, 100%, 25%)',
              color: 'white',
            }}
            onClick={primaryAction.onClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(146, 100%, 20%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'hsl(146, 100%, 25%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
            {primaryAction.label}
          </Button>
        )}
      </div>

      {/* Control Panel Card */}
      {(onSearchChange || searchMode || perPage || filtersSlot || actionsSlot) && (
        <div className="flex-shrink-0 p-2 sm:p-4">
          <div className="bg-white rounded-xl border border-[hsl(0,0%,92%)] p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Left: Search + Filters */}
              <div className="flex-1 flex items-center gap-3 flex-wrap w-full lg:w-auto">
                {/* Search - Primary */}
                {onSearchChange && (
                  <div className="relative w-full sm:w-[300px] lg:w-[350px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,55%)] pointer-events-none" />
                    <Input
                      type="text"
                      value={searchValue || ''}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full pl-10 pr-4 h-10 rounded-lg border border-[hsl(0,0%,88%)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(146,100%,27%)]/20 focus:border-[hsl(146,100%,27%)]"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(0,0%,55%)] border-t-transparent" />
                      </div>
                    )}
                  </div>
                )}

                {/* Search Mode Selector */}
                {searchMode && (
                  <Select 
                    value={searchMode.value} 
                    onValueChange={searchMode.onChange}
                  >
                    <SelectTrigger className="h-10 w-[100px] sm:w-[140px] text-xs sm:text-sm border border-[hsl(0,0%,88%)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {searchMode.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}


                {/* Additional Filters Slot */}
                {filtersSlot && (
                  <div className="flex items-center gap-2">
                    {filtersSlot}
                  </div>
                )}
              </div>

              {/* Right: Action Buttons */}
              {actionsSlot && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {actionsSlot}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips - Scrollable on mobile */}
      {filterChips && (
        <div className="flex-shrink-0 px-2 sm:px-4 py-2 sm:py-3 border-t border-border bg-background">
          {filterChips}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-background p-2 sm:p-4 overflow-y-auto">
        {children}
      </div>

      {/* Pagination - Fixed at bottom */}
      {pagination && pagination}
    </div>
  )
}
