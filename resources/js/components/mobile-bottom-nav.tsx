import { Link, usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  Users, 
  FileText, 
  CalendarDays, 
  Menu,
  X,
  ChevronRight,
  IdCard,
  GraduationCap,
  Landmark,
  List,
  Settings,
  LogOut,
  User,
  Lock,
  Shield,
  Clock,
  Briefcase,
  School,
  UserCheck,
  Calendar,
  Wallet,
  FileSearch
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import type { NavItem, SharedData } from '@/types';

// Primary navigation items for bottom bar (max 5)
const primaryNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
  },
  {
    title: 'Employees',
    href: '/employees',
    icon: IdCard,
    permission: 'access-employees-module',
  },
  {
    title: 'Requests',
    href: '/requests',
    icon: List,
  },
  {
    title: 'Leaves',
    href: '/leaves/balance',
    icon: CalendarDays,
  },
];

// Full navigation for mobile menu - matches sidebar structure
const fullNavItems: { title: string; icon: any; items: NavItem[] }[] = [
  {
    title: 'Main',
    icon: LayoutGrid,
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    ],
  },
  {
    title: 'User Management',
    icon: Users,
    items: [
      { title: 'Permissions', href: '/permissions', icon: Lock, permission: 'access-permissions-module' },
      { title: 'Roles', href: '/roles', icon: Shield, permission: 'access-roles-module' },
      { title: 'Manage Users', href: '/users', icon: Users, permission: 'access-users-module' },
      { title: 'User Activities', href: '/users/activities', icon: Clock, permission: 'view-user-activities' },
    ],
  },
  {
    title: 'Employees',
    icon: IdCard,
    items: [
      { title: 'Manage Employees', href: '/employees', icon: IdCard, permission: 'access-employees-module' },
      { title: 'Employee Logs', href: '/employees/logs', icon: Clock, permission: 'view-employee-log' },
    ],
  },
  {
    title: 'Organization',
    icon: Landmark,
    items: [
      { title: 'Faculties', href: '/faculties', icon: School, permission: 'access-faculty' },
      { title: 'Departments & Offices', href: '/departments', icon: Landmark, permission: 'access-department' },
      { title: 'Positions', href: '/positions', icon: Briefcase, permission: 'access-position' },
    ],
  },
  {
    title: 'Trainings',
    icon: GraduationCap,
    items: [
      { title: 'Manage Training', href: '/trainings', icon: FileText, permission: 'access-trainings-module' },
      { title: 'Join Training', href: '/trainings/join', icon: UserCheck },
      { title: 'Training History', href: '/trainings/logs', icon: FileText },
      { title: 'Training Logs', href: '/trainings/overview', icon: LayoutGrid, permission: 'access-trainings-module' },
    ],
  },
  {
    title: 'Requests',
    icon: List,
    items: [
      { title: 'Request Center', href: '/requests', icon: List },
      { title: 'Request Builder', href: '/request-types', icon: FileText, permission: 'access-request-types-module' },
      { title: 'Certificate Templates', href: '/certificate-templates', icon: FileText, permission: 'access-request-types-module' },
    ],
  },
  {
    title: 'Leaves',
    icon: CalendarDays,
    items: [
      { title: 'My Leave Balance', href: '/leaves/balance', icon: Calendar },
      { title: 'Leave Calendar', href: '/leaves/calendar', icon: CalendarDays, permission: 'access-leave-calendar' },
      { title: 'Leave History', href: '/leaves/history', icon: FileText },
      { title: 'Manage Balances', href: '/admin/leave-balances', icon: Wallet, permission: 'manage-leave-balances' },
    ],
  },
  {
    title: 'Audit',
    icon: FileSearch,
    items: [
      { title: 'Audit Logs', href: '/audit-logs', icon: FileSearch, permission: 'view-audit-logs' },
    ],
  },
];

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const page = usePage<SharedData>();
  const { auth } = page.props;
  const permissions = auth?.permissions || [];
  const [menuOpen, setMenuOpen] = useState(false);
  const getInitials = useInitials();

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission);
  };

  // Filter primary nav items based on permissions
  const filteredPrimaryItems = primaryNavItems.filter(item => hasPermission(item.permission));

  // Filter full nav items based on permissions
  const filteredFullNav = fullNavItems
    .map(section => ({
      ...section,
      items: section.items.filter(item => hasPermission(item.permission)),
    }))
    .filter(section => section.items.length > 0);

  const isActive = (href: string) => {
    return page.url === href || page.url.startsWith(href + '/');
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg md:hidden',
        'safe-area-inset-bottom', // For iOS safe area
        className
      )}>
        <div className="flex items-center justify-around h-16 px-2">
          {filteredPrimaryItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href!);
            
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] py-2 px-1 rounded-lg transition-colors',
                  active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-1', active && 'text-primary')} />
                <span className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  active && 'text-primary'
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
          
          {/* More Menu Button */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] py-2 px-1 rounded-lg transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Menu className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent 
              side="bottom" 
              className="h-[85vh] rounded-t-2xl p-0"
            >
              <SheetHeader className="px-4 pt-2 pb-3 border-b border-border">
                <SheetTitle className="text-lg font-semibold">Navigation Menu</SheetTitle>
              </SheetHeader>
              
              {/* User Profile Section */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(auth.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{auth.user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{auth.user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setMenuOpen(false);
                      // Redirect to employee profile if user has employee_id, otherwise settings
                      const hasEmployeeId = (auth.user as any)?.employee_id;
                      if (hasEmployeeId) {
                        router.visit(route('employees.my-profile'));
                      } else {
                        router.visit(route('profile.edit'));
                      }
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setMenuOpen(false);
                      router.visit(route('profile.edit'));
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
              
              {/* Navigation Sections */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {filteredFullNav.map((section) => (
                  <div key={section.title} className="mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      {section.title}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href!);
                        
                        return (
                          <Link
                            key={item.href}
                            href={item.href!}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                              active 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="flex-1 font-medium">{item.title}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Logout Button */}
              <div className="px-4 py-4 border-t border-border">
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      
      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

