import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BentoCardProps {
    className?: string;
    title?: string;
    description?: string;
    header?: ReactNode;
    icon?: ReactNode;
    children?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export function BentoCard({ className, title, description, header, icon, children, size = 'md' }: BentoCardProps) {
    const sizeClasses = {
        sm: 'col-span-1 row-span-1',
        md: 'col-span-1 md:col-span-2 row-span-1',
        lg: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2',
    };

    return (
        <Card
            className={cn(
                'group relative overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-lg',
                sizeClasses[size],
                className,
            )}
        >
            <div className="relative z-10 flex h-full flex-col p-6">
                {header || (
                    <div className="mb-4 flex items-start justify-between">
                        {icon && <div className="text-muted-foreground transition-colors group-hover:text-foreground">{icon}</div>}
                        {title && (
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                            </div>
                        )}
                    </div>
                )}
                {children && <div className="flex-1">{children}</div>}
            </div>
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-tl from-primary/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Card>
    );
}

interface MagicBentoProps {
    children: ReactNode;
    className?: string;
}

export function MagicBento({ children, className }: MagicBentoProps) {
    return (
        <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
            {children}
        </div>
    );
}

