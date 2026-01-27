import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface CompactPaginationProps {
    currentPage: number;
    lastPage: number;
    perPage: string;
    total: number;
    from?: number;
    to?: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (value: string) => void;
    perPageOptions?: readonly string[] | string[];
    isLoading?: boolean;
    className?: string;
}

export function CompactPagination({
    currentPage,
    lastPage,
    perPage,
    total,
    from,
    to,
    onPageChange,
    onPerPageChange,
    perPageOptions = ['10', '25', '50', '100'],
    isLoading = false,
    className = '',
}: CompactPaginationProps) {
    // Calculate from/to if not provided
    const perPageNum = parseInt(perPage, 10);
    const calculatedFrom = from ?? ((currentPage - 1) * perPageNum + 1);
    const calculatedTo = to ?? Math.min(currentPage * perPageNum, total);

    return (
        <div className={`flex-shrink-0 bg-card border-t border-border z-30 ${className}`}>
            <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                {/* Per Page Selector & Showing Info - Left */}
                <div className="flex items-center gap-2">
                    <Select value={perPage} onValueChange={onPerPageChange}>
                        <SelectTrigger className="h-7 w-[70px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Showing <span className="font-medium text-foreground">{calculatedFrom}</span> to <span className="font-medium text-foreground">{calculatedTo}</span> of <span className="font-medium text-foreground">{total}</span>
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                        {calculatedFrom}-{calculatedTo} of {total}
                    </span>
                </div>

                {/* Pagination Controls - Right (only show when more than 1 page) */}
                {lastPage > 1 && (
                    <div className="flex items-center gap-1">
                        {/* First Page Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1 || isLoading}
                            className="h-7 px-1.5 hidden sm:flex"
                            aria-label="First page"
                        >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            className="h-7 px-2"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        {/* Page Numbers - Desktop */}
                        <div className="hidden sm:flex items-center gap-1">
                            {/* First page button if not in range */}
                            {lastPage > 7 && currentPage > 4 && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onPageChange(1)}
                                        disabled={isLoading}
                                        className="min-w-[32px] h-7 text-xs"
                                    >
                                        1
                                    </Button>
                                    {currentPage > 5 && (
                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                    )}
                                </>
                            )}
                            {/* Middle page numbers */}
                            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
                                let page: number;
                                if (lastPage <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= lastPage - 2) {
                                    page = lastPage - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                // Skip if page is 1 or lastPage (shown separately)
                                if (lastPage > 7 && (page === 1 || page === lastPage)) {
                                    return null;
                                }
                                return (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => onPageChange(page)}
                                        disabled={isLoading}
                                        className="min-w-[32px] h-7 text-xs"
                                    >
                                        {page}
                                    </Button>
                                );
                            })}
                            {/* Last page button if not in range */}
                            {lastPage > 7 && currentPage < lastPage - 3 && (
                                <>
                                    {currentPage < lastPage - 4 && (
                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                    )}
                                    <Button
                                        variant={currentPage === lastPage ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => onPageChange(lastPage)}
                                        disabled={isLoading}
                                        className="min-w-[32px] h-7 text-xs"
                                    >
                                        {lastPage}
                                    </Button>
                                </>
                            )}
                        </div>
                        {/* Page Indicator - Mobile */}
                        <div className="flex sm:hidden items-center gap-1 px-2 text-xs">
                            <span className="font-semibold text-foreground">{currentPage}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">{lastPage}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === lastPage || isLoading}
                            className="h-7 px-2"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        {/* Last Page Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(lastPage)}
                            disabled={currentPage === lastPage || isLoading}
                            className="h-7 px-1.5 hidden sm:flex"
                            aria-label="Last page"
                        >
                            <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompactPagination;
