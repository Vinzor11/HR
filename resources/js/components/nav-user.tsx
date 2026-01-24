import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type SharedData } from '@/types';
import { usePage, router } from '@inertiajs/react';

export function NavUser({ position }: { position: 'left' | 'right' }) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    
    // Check if user has employee_id
    const hasEmployeeId = (auth.user as any)?.employee_id;
    
    // Handle username button click
    const handleProfileClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (hasEmployeeId) {
            router.visit(route('employees.my-profile'));
        } else {
            router.visit(route('profile.edit'));
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <div className="w-full px-2 py-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 h-auto py-2 text-white hover:text-white hover:bg-white/10 transition-all"
                        onClick={handleProfileClick}
                    >
                        <Avatar className="size-8 overflow-hidden rounded-full border-2 border-white/30">
                            <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                            <AvatarFallback className="rounded-full bg-white/20 text-white font-semibold text-sm border border-white/30">
                                {getInitials(auth.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-white truncate flex-1 text-left">
                            {auth.user.name}
                        </span>
                    </Button>
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
