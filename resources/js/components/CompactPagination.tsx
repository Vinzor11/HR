import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CompactPaginationProps {
    currentPage: number;
    lastPage: number;
    perPage: string;
    total: number;
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
    onPageChange,
    onPerPageChange,
    perPageOptions = ['10', '25', '50', '100'],
    isLoading = false,
    className = '',
}: CompactPaginationProps) {
    return (
        <div className={`flex-shrink-0 bg-card border-t border-border z-30 ${className}`}>
            <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                {/* Per Page Selector - Left */}
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
                        of {total}
                    </span>
                </div>

                {/* Pagination Controls - Right (only show when more than 1 page) */}
                {lastPage > 1 && (
                    <div className="flex items-center gap-1">
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
                            {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
                                let page: number;
                                if (lastPage <= 7) {
                                    page = i + 1;
                                } else if (currentPage <= 4) {
                                    page = i + 1;
                                } else if (currentPage >= lastPage - 3) {
                                    page = lastPage - 6 + i;
                                } else {
                                    page = currentPage - 3 + i;
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
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompactPagination;
