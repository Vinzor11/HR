import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface PaginationData {
    links: LinkProps[];
    from: number;
    to: number;
    total: number;
}

interface PaginationProps {
    meta: PaginationData;
}

export const TablePagination = ({ meta }: PaginationProps) => {
    if (!meta.links?.length) {
        return null;
    }

    // Filter out prev/next links and get page numbers
    const pageLinks = meta.links.filter(
        (link) => link.label !== '&laquo; Previous' && link.label !== 'Next &raquo;'
    );
    const prevLink = meta.links.find((link) => link.label === '&laquo; Previous');
    const nextLink = meta.links.find((link) => link.label === 'Next &raquo;');
    const currentPage = pageLinks.findIndex((link) => link.active) + 1;
    const lastPage = pageLinks.length;
    const firstPageLink = pageLinks[0];
    const lastPageLink = pageLinks[pageLinks.length - 1];

    return (
        <div className="flex-shrink-0 bg-card border-t border-border z-30">
            <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                {/* Showing info - Left */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Showing <span className="font-medium text-foreground">{meta.from ?? 0}</span> to <span className="font-medium text-foreground">{meta.to ?? 0}</span> of <span className="font-medium text-foreground">{meta.total}</span>
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                        {meta.from ?? 0}-{meta.to ?? 0} of {meta.total}
                    </span>
                </div>

                {/* Pagination Controls - Right (only show when more than 1 page) */}
                {lastPage > 1 && (
                    <div className="flex items-center gap-1">
                        {/* First Page Button */}
                        <Link
                            href={firstPageLink?.url || '#'}
                            preserveState
                            preserveScroll={false}
                            className={`hidden sm:inline-flex items-center justify-center h-7 px-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                                currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                            }`}
                        >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href={prevLink?.url || '#'}
                            preserveState
                            preserveScroll={false}
                            className={`inline-flex items-center justify-center h-7 px-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                                !prevLink?.url ? 'pointer-events-none opacity-50' : ''
                            }`}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Link>
                        {/* Page Numbers - Desktop */}
                        <div className="hidden sm:flex items-center gap-1">
                            {/* First page if not in range */}
                            {lastPage > 7 && currentPage > 4 && (
                                <>
                                    <Link
                                        href={firstPageLink?.url || '#'}
                                        preserveState
                                        preserveScroll={false}
                                        className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                    >
                                        1
                                    </Link>
                                    {currentPage > 5 && (
                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                    )}
                                </>
                            )}
                            {/* Middle page numbers */}
                            {pageLinks.map((link, index) => {
                                const pageNum = index + 1;
                                // Skip first and last if we're showing them separately
                                if (lastPage > 7 && (pageNum === 1 || pageNum === lastPage)) {
                                    return null;
                                }
                                // Only show 5 pages around current
                                if (lastPage > 7) {
                                    if (currentPage <= 3 && pageNum > 5) return null;
                                    if (currentPage >= lastPage - 2 && pageNum < lastPage - 4) return null;
                                    if (currentPage > 3 && currentPage < lastPage - 2) {
                                        if (pageNum < currentPage - 2 || pageNum > currentPage + 2) return null;
                                    }
                                }
                                return (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll={false}
                                        className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 text-xs font-medium rounded-md border ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                                        } ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            })}
                            {/* Last page if not in range */}
                            {lastPage > 7 && currentPage < lastPage - 3 && (
                                <>
                                    {currentPage < lastPage - 4 && (
                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                    )}
                                    <Link
                                        href={lastPageLink?.url || '#'}
                                        preserveState
                                        preserveScroll={false}
                                        className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 text-xs font-medium rounded-md border ${
                                            currentPage === lastPage
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                    >
                                        {lastPage}
                                    </Link>
                                </>
                            )}
                        </div>
                        {/* Page Indicator - Mobile */}
                        <div className="flex sm:hidden items-center gap-1 px-2 text-xs">
                            <span className="font-semibold text-foreground">{currentPage}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">{lastPage}</span>
                        </div>
                        <Link
                            href={nextLink?.url || '#'}
                            preserveState
                            preserveScroll={false}
                            className={`inline-flex items-center justify-center h-7 px-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                                !nextLink?.url ? 'pointer-events-none opacity-50' : ''
                            }`}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        {/* Last Page Button */}
                        <Link
                            href={lastPageLink?.url || '#'}
                            preserveState
                            preserveScroll={false}
                            className={`hidden sm:inline-flex items-center justify-center h-7 px-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                                currentPage === lastPage ? 'pointer-events-none opacity-50' : ''
                            }`}
                        >
                            <ChevronsRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};
