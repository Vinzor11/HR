import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsivePaginationProps {
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  resourceName?: string;
  className?: string;
}

export function ResponsivePagination({
  currentPage,
  lastPage,
  from,
  to,
  total,
  onPageChange,
  resourceName = 'items',
  className,
}: ResponsivePaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < lastPage;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Max pages to show
    
    if (lastPage <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(lastPage - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < lastPage - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (lastPage > 1) {
        pages.push(lastPage);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      {/* Results Info - Full on desktop, compact on mobile */}
      <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        <span className="hidden sm:inline">
          Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
          <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
          <span className="font-semibold text-foreground">{total || 0}</span> {resourceName}
        </span>
        <span className="sm:hidden">
          <span className="font-semibold text-foreground">{from || 0}</span>-
          <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
          <span className="font-semibold text-foreground">{total || 0}</span>
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {/* First Page - Hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          className="hidden md:flex h-8 w-8 p-0"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First page</span>
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="h-8 px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        {/* Page Numbers - Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }
            
            return (
              <Button
                key={page}
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-8 min-w-[32px] px-2',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                    : 'hover:bg-muted'
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Page Indicator - Mobile */}
        <div className="flex sm:hidden items-center gap-1 px-2 text-sm">
          <span className="font-semibold text-foreground">{currentPage}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{lastPage || 1}</span>
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-8 px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page - Hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(lastPage)}
          disabled={!canGoNext}
          className="hidden md:flex h-8 w-8 p-0"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </div>
  );
}

