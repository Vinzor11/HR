import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, FileText, Folder, Key, LayoutGrid, Lock, Shield, Users, IdCard, Landmark , Briefcase, GraduationCap, UserCheck, Clock, List, Calendar, CalendarDays, School, Settings, Wallet, FileSearch } from 'lucide-react';
import AppLogo from './app-logo';

const GROUP_ORDER = ['Overview', 'Administration', 'People', 'Organization', 'Operations', 'System'] as const;

const mainNavItems: NavItem[] = [
    // Overview
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, group: 'Overview' },
    // Administration
    { title: 'Permissions', href: '/permissions', icon: Lock, permission: 'access-permissions-module', group: 'Administration' },
    { title: 'Roles', href: '/roles', icon: Shield, permission: 'access-roles-module', group: 'Administration' },
    {
        title: 'Users',
        icon: Users,
        permission: 'access-users-module',
        group: 'Administration',
        children: [
            { title: 'Manage Users', href: '/users', icon: Users, permission: 'access-users-module' },
            { title: 'User Activities', href: '/users/activities', icon: Clock, permission: 'view-user-activities' },
        ],
    },
    { title: 'OAuth Clients', href: '/oauth/clients', icon: Key, permission: 'access-oauth-clients', group: 'Administration' },
    // People
    {
        title: 'Employees',
        icon: IdCard,
        permission: 'access-employees-module',
        group: 'People',
        children: [
            { title: 'Employees', href: '/employees', icon: IdCard, permission: 'access-employees-module' },
        ],
    },
    // Organization
    {
        title: 'Org Structure',
        icon: Landmark,
        group: 'Organization',
        children: [
            { title: 'Sectors', href: '/sectors', icon: Landmark, permission: 'access-sector' },
            { title: 'Units', href: '/units', icon: School, permission: 'access-unit' },
            { title: 'Positions', href: '/positions', icon: Briefcase, permission: 'access-position' },
            { title: 'Position Whitelist', href: '/unit-positions', icon: Briefcase, permission: 'access-unit-position' },
            { title: 'Academic Ranks', href: '/academic-ranks', icon: GraduationCap, permission: 'access-academic-rank' },
            { title: 'Staff Grades', href: '/staff-grades', icon: Wallet, permission: 'access-staff-grade' },
            { title: '', icon: School, permission: 'access-faculty' },
            { title: '', icon: Landmark, permission: 'access-department' },
        ],
    },
    // Operations
    {
        title: 'Trainings',
        icon: GraduationCap,
        group: 'Operations',
        children: [
            { title: 'Manage Training', href: '/trainings', icon: FileText, permission: 'access-trainings-module' },
            { title: 'Join Training', href: '/trainings/join', icon: UserCheck },
            { title: 'Training History', href: '/trainings/logs', icon: FileText },
            { title: 'Training Logs', href: '/trainings/overview', icon: LayoutGrid, permission: 'access-trainings-module' },
        ],
    },
    {
        title: 'Requests',
        icon: List,
        group: 'Operations',
        children: [
            { title: 'Request Center', href: '/requests', icon: List },
            { title: 'Request Builder', href: '/request-types', icon: FileText, permission: 'access-request-types-module' },
            { title: 'Certificate Templates', href: '/certificate-templates', icon: FileText, permission: 'access-request-types-module' },
        ],
    },
    {
        title: 'Leaves',
        icon: CalendarDays,
        group: 'Operations',
        children: [
            { title: 'My Leave Balance', href: '/leaves/balance', icon: Calendar },
            { title: 'Leave Calendar', href: '/leaves/calendar', icon: CalendarDays, permission: 'access-leave-calendar' },
            { title: 'Leave History', href: '/leaves/history', icon: FileText },
            { title: 'Manage Balances', href: '/admin/leave-balances', icon: Wallet, permission: 'manage-leave-balances' },
        ],
    },
    // System
    { title: 'Audit Logs', href: '/audit-logs', icon: FileSearch, permission: 'view-audit-logs', group: 'System' },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const roles = auth?.roles || [];
    const permissions = auth?.permissions || [];

    const { position } = useLayout();

    // Debug: Check if manage-leave-balances permission exists
    if (process.env.NODE_ENV === 'development') {
        const hasManageLeaveBalances = permissions.includes('manage-leave-balances');
        if (!hasManageLeaveBalances && permissions.length > 0) {
            console.log('[Sidebar Debug] Permission "manage-leave-balances" not found in user permissions');
            console.log('[Sidebar Debug] Available permissions:', permissions);
        }
    }

    const filteredNavItems: NavItem[] = mainNavItems
        .map((item) => {
            // Filter children based on permissions
            const children = item.children
                ?.filter((child) => !child.permission || permissions.includes(child.permission));

            return {
                ...item,
                children,
            };
        })
        .flatMap((item): NavItem[] => {
            // If item has children, check how many are visible
            if (item.children && item.children.length > 0) {
                // If only one child is visible, flatten it - return the child as a direct menu item
                if (item.children.length === 1) {
                    const singleChild = item.children[0];
                    return [{
                        ...singleChild,
                        icon: singleChild.icon || item.icon,
                        group: item.group,
                    }];
                }
                return [item];
            }

            // If item has no children, check permission requirement
            if (item.permission) {
                if (!permissions.includes(item.permission)) {
                    return [];
                }
            }

            return [item];
        })
        .filter((item): item is NavItem => {
            if (item.children && item.children.length > 0) {
                return item.children.length > 0;
            }
            return true;
        });

    // Build groups in fixed order; only include groups that have items
    const byGroup: Record<string, NavItem[]> = {};
    filteredNavItems.forEach((item) => {
        const key = item.group || 'Other';
        if (!byGroup[key]) byGroup[key] = [];
        byGroup[key].push(item);
    });
    const filteredGroups: NavGroup[] = GROUP_ORDER
        .filter((key) => byGroup[key]?.length)
        .map((key) => ({ title: key, items: byGroup[key]! }));
    if (byGroup['Other']?.length) {
        filteredGroups.push({ title: 'Other', items: byGroup['Other'] });
    }

    return (
        <Sidebar side={position} collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo position={position} />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={filteredGroups} position={position} />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" position={position} /> */}
                <NavUser position={position} />
            </SidebarFooter>
        </Sidebar>
    );
}
