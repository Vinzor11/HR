import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { auth } = usePage().props as any;
    const hasEmployeeId = auth?.user?.employee_id;

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Quick Action Buttons */}
            <div className="px-2 py-2">
                <div className="flex gap-2">
                    {hasEmployeeId ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9"
                            asChild
                        >
                            <Link href={route('employees.my-profile')} onClick={cleanup}>
                                <UserIcon className="h-4 w-4 mr-1.5" />
                                Profile
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9"
                            asChild
                        >
                            <Link href={route('profile.edit')} onClick={cleanup}>
                                <UserIcon className="h-4 w-4 mr-1.5" />
                                Profile
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                        asChild
                    >
                        <Link href={route('profile.edit')} onClick={cleanup}>
                            <Settings className="h-4 w-4 mr-1.5" />
                            Settings
                        </Link>
                    </Button>
                </div>
            </div>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Link className="block w-full" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
