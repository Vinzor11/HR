import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface TableToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    perPage: string;
    onPerPageChange: (value: string) => void;
    isSearching?: boolean;
    actionSlot?: ReactNode;
    searchPlaceholder?: string;
    searchDescription?: string;
}

export function TableToolbar({
    searchValue,
    onSearchChange,
    perPage,
    onPerPageChange,
    isSearching = false,
    actionSlot,
    searchPlaceholder = 'Search...',
    searchDescription,
}: TableToolbarProps) {
    return (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Section */}
            <div className="w-full lg:max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9 pr-9 h-9 text-sm bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                    />
                    {isSearching ? (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : searchValue && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted rounded-md"
                            onClick={() => onSearchChange('')}
                        >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="sr-only">Clear search</span>
                        </Button>
                    )}
                </div>
                {searchDescription && (
                    <p className="mt-1 text-[10px] md:text-xs text-muted-foreground hidden md:block">{searchDescription}</p>
                )}
            </div>

            {/* Actions Section - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0 lg:overflow-visible scrollbar-none">
                <div className="flex items-center gap-1.5 min-w-max">
            {actionSlot}
                </div>
            </div>
        </div>
    );
}

