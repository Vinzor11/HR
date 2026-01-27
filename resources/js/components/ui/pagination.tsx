import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

    return (
        <div className="flex-shrink-0 bg-card border-t border-border z-30">
            <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                {/* Total count - Left */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        of {meta.total}
                    </span>
                </div>

                {/* Pagination Controls - Right (only show when more than 1 page) */}
                {lastPage > 1 && (
                    <div className="flex items-center gap-1">
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
                            {pageLinks.slice(0, 7).map((link, index) => (
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
                            ))}
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
                    </div>
                )}
            </div>
        </div>
    );
};
