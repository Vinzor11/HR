import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { User, Lock, Shield, Palette, UserCheck } from 'lucide-react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: '/settings/profile',
        icon: User,
    },
    {
        title: 'Password',
        href: '/settings/password',
        icon: Lock,
    },
    {
        title: 'Two Factor',
        href: '/settings/two-factor',
        icon: Shield,
    },
    {
        title: 'Appearance',
        href: '/settings/appearance',
        icon: Palette,
    },
    {
        title: 'Delegations',
        href: '/settings/delegations',
        icon: UserCheck,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 sm:px-6 py-6 sm:py-8 pb-20 sm:pb-8">
            <div className="mb-8">
                <Heading title="Settings" description="Manage your profile and account settings" />
            </div>

            <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                <aside className="w-full lg:w-64 shrink-0">
                    <Card className="p-2">
                        <nav className="flex flex-row overflow-x-auto gap-1 pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0 lg:gap-1">
                            {sidebarNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPath === item.href;
                                
                                return (
                                    <Button
                                        key={item.href}
                                        size="sm"
                                        variant={isActive ? "secondary" : "ghost"}
                                        asChild
                                        className={cn(
                                            'whitespace-nowrap lg:w-full justify-start gap-2 h-9',
                                            isActive && 'bg-accent text-accent-foreground font-medium'
                                        )}
                                    >
                                        <Link href={item.href} prefetch>
                                            {Icon && <Icon className="h-4 w-4" />}
                                            {item.title}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </nav>
                    </Card>
                </aside>

                <Separator className="lg:hidden" />

                <div className="flex-1 min-w-0">
                    <div className="max-w-3xl">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
