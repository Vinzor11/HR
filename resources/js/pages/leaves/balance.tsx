import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Leave Balance', href: '/leaves/balance' },
];

interface LeaveBalance {
    leave_type: {
        id: number;
        name: string;
        code: string;
        color: string;
    };
    balance: {
        entitled: number;
        used: number;
        pending: number;
        balance: number;
        accrued: number;
    };
    available: number;
    entitled: number;
    used: number;
    pending: number;
    accrued: number;
}

interface BalancePageProps {
    balances: LeaveBalance[];
    year: number;
    availableYears: number[];
    error?: string;
}

export default function LeaveBalancePage({ balances, year, availableYears, error }: BalancePageProps) {
    const handleYearChange = (newYear: string) => {
        router.get('/leaves/balance', { year: parseInt(newYear) }, { preserveState: true });
    };

    if (error) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My Leave Balance" />
                <div className="p-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Leave Balance" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">My Leave Balance</h1>
                        <p className="text-muted-foreground mt-1">View your leave entitlements and usage</p>
                    </div>
                    <Select value={year.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {balances.map((item) => (
                        <Card key={item.leave_type.id} className="relative overflow-hidden">
                            <div
                                className="absolute top-0 left-0 right-0 h-1"
                                style={{ backgroundColor: item.leave_type.color }}
                            />
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{item.leave_type.name}</CardTitle>
                                    <Badge
                                        variant={(Number(item.available) || 0) > 0 ? 'default' : 'secondary'}
                                        style={{
                                            backgroundColor: (Number(item.available) || 0) > 0 ? item.leave_type.color : undefined,
                                        }}
                                    >
                                        {item.leave_type.code}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Available
                                        </span>
                                        <span className="font-semibold text-2xl">{(Number(item.available) || 0).toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Entitled
                                        </span>
                                        <span>{(Number(item.entitled) || 0).toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4" />
                                            Used
                                        </span>
                                        <span>{(Number(item.used) || 0).toFixed(1)}</span>
                                    </div>
                                    {(Number(item.pending) || 0) > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Pending
                                            </span>
                                            <span className="text-amber-600">{(Number(item.pending) || 0).toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Accrued this year</span>
                                        <span>{(Number(item.accrued) || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {balances.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            <p>No leave balances found for {year}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

