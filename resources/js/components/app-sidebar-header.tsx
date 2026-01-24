import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type SharedData } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { position } = useLayout();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const cleanup = useMobileNavigation();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    
    // Get notifications from page props if available
    const notifications = (page.props as any).notifications || [];
    
    // Handle logout
    const handleLogout = () => {
        cleanup();
        setUserMenuOpen(false);
        router.post(route('logout'));
    };
    
    // Close user menu when dialog closes
    const handleDialogChange = (open: boolean) => {
        setShowLogoutDialog(open);
        if (!open) {
            // Close the dropdown menu when dialog closes
            setUserMenuOpen(false);
            // Restore pointer events after dialog closes (fixes overlay blocking issue)
            setTimeout(() => {
                document.body.style.pointerEvents = '';
                document.documentElement.style.pointerEvents = '';
            }, 100);
        }
    };
    
    // Cleanup effect to ensure pointer events are restored when dialog closes
    useEffect(() => {
        if (!showLogoutDialog) {
            // Small delay to ensure overlay animation completes
            const timer = setTimeout(() => {
                document.body.style.pointerEvents = '';
                document.documentElement.style.pointerEvents = '';
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showLogoutDialog]);

    return (
        <header className="border-sidebar-border/50 sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-sidebar px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:px-2 md:px-4 overflow-hidden md:rounded-t-xl">
            <div className={`flex w-full items-center gap-2 min-w-0 ${position === 'right' ? 'justify-end' : 'justify-start'}`}>
                {position === 'left' ? (
                    <>
                        <SidebarTrigger className="-ml-1 hidden md:flex" />
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </>
                ) : (
                    <>
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                        <SidebarTrigger className="-mr-1 hidden md:flex" />
                    </>
                )}
            </div>
            
            {/* Right side buttons */}
            <div className="ml-auto flex items-center gap-2">
                {/* Notification Button */}
                <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative h-9 w-9">
                            <Bell className="h-5 w-5" />
                            {notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                                    {notifications.length > 9 ? '9+' : notifications.length}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="p-2">
                            <div className="mb-2 px-2 text-sm font-semibold">Notifications</div>
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((notification: any, idx: number) => (
                                        <Link
                                            key={idx}
                                            href={notification.link || '#'}
                                            className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                                            onClick={() => setNotificationOpen(false)}
                                        >
                                            <div className={`mt-0.5 rounded-full p-1.5 ${
                                                notification.type === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                                                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                                'bg-blue-100 dark:bg-blue-900/30'
                                            }`}>
                                                <Bell className={`h-4 w-4 ${
                                                    notification.type === 'urgent' ? 'text-red-600 dark:text-red-400' :
                                                    notification.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                    'text-blue-600 dark:text-blue-400'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{notification.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No notifications
                                    </div>
                                )}
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Avatar Dropdown */}
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-12 w-12 rounded-full hover:bg-accent/50 transition-all p-0"
                        >
                            <Avatar className="size-10 overflow-hidden rounded-full ring-2 ring-background ring-offset-1">
                                <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm border border-primary/20">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuItem asChild>
                            <Link 
                                href={route('profile.edit')} 
                                onClick={() => {
                                    cleanup();
                                    setUserMenuOpen(false);
                                }} 
                                className="cursor-pointer"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                setUserMenuOpen(false);
                                // Small delay to ensure dropdown closes before dialog opens
                                setTimeout(() => {
                                    setShowLogoutDialog(true);
                                }, 50);
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Logout Confirmation Dialog */}
                <AlertDialog open={showLogoutDialog} onOpenChange={handleDialogChange}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sign Out</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to sign out? You will need to log in again to access your account.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleLogout}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Sign Out
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </header>
    );
}
