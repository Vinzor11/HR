import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export function NavMain({ items = [], position }: { items: NavItem[]; position: 'left' | 'right' }) {
    const page = usePage();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
        // Initialize from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar_open_items');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return {};
                }
            }
        }
        return {};
    });

    const handleToggle = (id: string, open: boolean) => {
        setOpenItems((prev) => {
            const newState = {
                ...prev,
                [id]: open,
            };
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('sidebar_open_items', JSON.stringify(newState));
            }
            return newState;
        });
    };

    // Auto-open parent when navigating to a child (only if not explicitly closed)
    useEffect(() => {
        items.forEach((item) => {
            if (item.children?.length) {
                const childActive = item.children.some((child) => child.href === page.url);
                if (childActive) {
                    setOpenItems((prev) => {
                        // Only auto-open if state is undefined (not explicitly set)
                        // If user manually closed it (false), respect that
                        // If it's already open (true), keep it open
                        // Only auto-open if it's undefined/null
                        if (prev[item.title] !== undefined) {
                            return prev;
                        }
                        const newState = {
                            ...prev,
                            [item.title]: true,
                        };
                        // Persist to localStorage
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('sidebar_open_items', JSON.stringify(newState));
                        }
                        return newState;
                    });
                }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.url]);

    const renderLabel = (item: NavItem) => {
        if (position === 'right') {
            return (
                <>
                    <span>{item.title}</span>
                    {item.icon && <item.icon className="h-5 w-5" />}
                </>
            );
        }

        return (
            <>
                {item.icon && <item.icon className="h-5 w-5" />}
                <span>{item.title}</span>
            </>
        );
    };

    return (
        <SidebarGroup className="px-2 py-0 group-data-[collapsible=icon]:px-1">
            <SidebarGroupLabel className={`flex w-full ${position === 'right' ? 'justify-end' : 'justify-start'}`}>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const hasChildren = !!item.children?.length;
                    const childActive = hasChildren ? item.children.some((child) => child.href === page.url) : false;
                    // Use manually set state if available, otherwise default to open if child is active
                    // This allows manual collapse even when on a child page
                    const isOpen = openItems[item.title] ?? (childActive ? true : false);

                    if (hasChildren) {
                        // When sidebar is collapsed, use DropdownMenu to show submenu items
                        if (isCollapsed) {
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <SidebarMenuButton isActive={childActive} tooltip={{ children: item.title }}>
                                                <div className={cn(
                                                    'flex w-full items-center gap-2',
                                                    position === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                                                )}>
                                                    {item.icon && <item.icon className="h-5 w-5" />}
                                                </div>
                                            </SidebarMenuButton>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            side={position === 'right' ? 'left' : 'right'}
                                            align="start"
                                            className="min-w-[200px]"
                                        >
                                            {item.children?.map((child) => (
                                                child.href ? (
                                                    <DropdownMenuItem 
                                                        key={child.title}
                                                        onClick={() => {
                                                            router.visit(child.href!);
                                                        }}
                                                        className={cn(
                                                            'flex items-center gap-2 cursor-pointer',
                                                            position === 'right'
                                                                ? 'justify-end text-right'
                                                                : 'justify-start text-left',
                                                            child.href === page.url && 'bg-accent text-accent-foreground',
                                                        )}
                                                    >
                                                        {child.icon && <child.icon className="h-4 w-4" />}
                                                        <span>{child.title}</span>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <div key={child.title} className="px-2 py-1.5 text-xs text-muted-foreground">
                                                        {child.title}
                                                    </div>
                                                )
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </SidebarMenuItem>
                            );
                        }

                        // When sidebar is expanded, use Collapsible as before
                        return (
                            <Collapsible
                                key={item.title}
                                open={isOpen}
                                onOpenChange={(open) => handleToggle(item.title, open)}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={childActive} tooltip={{ children: item.title }}>
                                        <CollapsibleTrigger
                                            className={cn(
                                                'flex w-full items-center gap-2',
                                                position === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                                            )}
                                        >
                                            <span className="flex flex-1 items-center gap-2">
                                                {renderLabel(item)}
                                            </span>
                                            <ChevronRight
                                                className={cn(
                                                    'h-4 w-4 transition-transform',
                                                    position === 'right' ? '-rotate-90' : '',
                                                    isOpen && (position === 'right' ? 'rotate-0' : 'rotate-90'),
                                                )}
                                            />
                                        </CollapsibleTrigger>
                                    </SidebarMenuButton>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.children?.map((child) => (
                                                <SidebarMenuSubItem key={child.title}>
                                                    {child.href ? (
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={child.href === page.url}
                                                            size="md"
                                                        >
                                                            <Link
                                                                href={child.href}
                                                                prefetch
                                                                className={cn(
                                                                    'flex items-center gap-2',
                                                                    position === 'right'
                                                                        ? 'justify-end text-right'
                                                                        : 'justify-start text-left',
                                                                )}
                                                            >
                                                                {renderLabel(child)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    ) : (
                                                        <div className="px-2 text-xs text-muted-foreground">{child.title}</div>
                                                    )}
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    }

                    if (!item.href) {
                        return null;
                    }

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={item.href === page.url} tooltip={{ children: item.title }}>
                                <Link
                                    href={item.href}
                                    prefetch
                                    className={`flex items-center gap-2 ${position === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
                                >
                                    {renderLabel(item)}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
