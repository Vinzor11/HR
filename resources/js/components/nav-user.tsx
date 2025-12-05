import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';

export function NavUser({ position }: { position: 'left' | 'right' }) {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const isCollapsed = state === 'collapsed';
    const getInitials = useInitials();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size={isCollapsed ? 'default' : 'lg'}
                            className={cn(
                                'text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group flex items-center gap-2 w-full',
                                isCollapsed &&
                                    'w-auto justify-center rounded-full bg-transparent text-sidebar-foreground hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0'
                            )}
                            tooltip={isCollapsed ? { children: auth.user.name } : undefined}
                        >
                            {isCollapsed ? (
                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                    <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            ) : position === 'right' ? (
                                <>
                                    <UserInfo user={auth.user} className="text-right" position={position} />
                                    <ChevronsUpDown className="size-4" />
                                </>
                            ) : (
                                <>
                                    <ChevronsUpDown className="size-4" />
                                    <UserInfo user={auth.user} className="text-left" position={position} />
                                </>
                            )}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
