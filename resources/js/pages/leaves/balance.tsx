import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { router } from '@inertiajs/react';
import { Calendar, TrendingUp, TrendingDown, Clock, History } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

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

interface HistoryItem {
    id: number;
    date: string;
    type: string;
    type_label: string;
    amount: number;
    notes: string | null;
    reference_number: string | null;
    created_by: string;
}

export default function LeaveBalancePage({ balances, year, availableYears, error }: BalancePageProps) {
    const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveBalance | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const handleYearChange = (newYear: string) => {
        router.get('/leaves/balance', { year: parseInt(newYear) }, { preserveState: true });
    };

    const handleCardClick = async (item: LeaveBalance) => {
        setSelectedLeaveType(item);
        setIsHistoryOpen(true);
        setIsLoadingHistory(true);

        try {
            const response = await axios.get('/api/leaves/history', {
                params: {
                    leave_type_id: item.leave_type.id,
                    year: year,
                },
            });

            setHistory(response.data.history || []);
        } catch (error: any) {
            toast.error('Failed to load leave history');
            console.error('Error loading history:', error);
            setHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
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
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-20 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">My Leave Balance</h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">View your leave entitlements and usage</p>
                    </div>
                    <Select value={year.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
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

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {balances.map((item) => (
                        <Card
                            key={item.leave_type.id}
                            className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleCardClick(item)}
                        >
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
                                        <span className="font-semibold text-2xl">{(Number(item.available) || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Entitled
                                        </span>
                                        <span>{(Number(item.entitled) || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4" />
                                            Used
                                        </span>
                                        <span>{(Number(item.used) || 0).toFixed(2)}</span>
                                    </div>
                                    {(Number(item.pending) || 0) > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Pending
                                            </span>
                                            <span className="text-amber-600">{(Number(item.pending) || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Accrued this year</span>
                                        <span>{(Number(item.accrued) || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <History className="h-3 w-3" />
                                    <span>Click to view history</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* History Dialog */}
                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[830px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                {selectedLeaveType?.leave_type.name} History - {year}
                            </DialogTitle>
                            <DialogDescription>
                                View all earned and spent leave credits for this leave type
                            </DialogDescription>
                        </DialogHeader>
                        {isLoadingHistory ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No history found for {year}</p>
                                <p className="text-sm mt-2">No transactions have been recorded yet.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-1 mt-4">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Notes</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(item.date).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {item.type_label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <span
                                                        className={
                                                            item.amount >= 0
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                        }
                                                    >
                                                        {item.amount >= 0 ? '+' : ''}
                                                        {item.amount.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="truncate" title={item.notes || ''}>
                                                        {item.notes || (
                                                            <span className="text-muted-foreground italic">No notes</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {item.reference_number || (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {item.created_by}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

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

