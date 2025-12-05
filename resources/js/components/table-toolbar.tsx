import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
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
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
                <div className="relative">
                    <Input
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="pr-9 h-8 text-sm"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                </div>
                {searchDescription && (
                    <p className="mt-1 text-xs text-muted-foreground">{searchDescription}</p>
                )}
            </div>

            {actionSlot}
        </div>
    );
}

