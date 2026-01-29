import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Plus, Trash2, UserCheck, Users, Calendar, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    context?: string;
    is_same_unit?: boolean;
}

interface Delegation {
    id: number;
    delegator_id: number;
    delegate_id: number;
    starts_at: string;
    ends_at: string | null;
    reason: string | null;
    is_active: boolean;
    created_at: string;
    delegator: { id: number; name: string; email: string };
    delegate: { id: number; name: string; email: string };
    creator: { id: number; name: string } | null;
}

interface DelegationsProps {
    delegations: {
        data: Delegation[];
        current_page: number;
        last_page: number;
    };
    users: User[];
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Delegation settings',
        href: '/settings/delegations',
    },
];

const APP_TIMEZONE =
    (typeof window !== 'undefined' && (window as any)?.appTimezone) || 'Asia/Manila';

const formatDate = (value?: string | null) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: APP_TIMEZONE,
    }).format(date);
};

export default function Delegations({ delegations, users, canManage }: DelegationsProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    const createForm = useForm({
        delegate_id: '',
        starts_at: new Date().toISOString().split('T')[0],
        ends_at: '',
        reason: '',
    });

    const handleCreate = () => {
        if (createForm.processing) {
            return;
        }

        createForm.post(route('settings.delegations.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setShowCreateForm(false);
                toast.success('Delegation created successfully.');
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error(typeof firstError === 'string' ? firstError : 'Unable to create delegation.');
            },
        });
    };

    const handleDeactivate = (delegation: Delegation) => {
        if (confirm('Are you sure you want to deactivate this delegation?')) {
            router.delete(route('settings.delegations.destroy', delegation.id), {
                preserveScroll: true,
                onSuccess: () => toast.success('Delegation deactivated.'),
                onError: () => toast.error('Unable to deactivate delegation.'),
            });
        }
    };

    const isEffective = (delegation: Delegation) => {
        if (!delegation.is_active) return false;
        const now = new Date();
        const starts = new Date(delegation.starts_at);
        if (starts > now) return false;
        if (delegation.ends_at && new Date(delegation.ends_at) < now) return false;
        return true;
    };

    // Check if user has an active delegation
    const hasActiveDelegation = delegations.data.some(d => d.is_active && isEffective(d));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Delegation settings" />
            <CustomToast />

            <SettingsLayout>
                <div className="space-y-6">
                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5" />
                                Approval Delegations
                            </CardTitle>
                            <CardDescription>
                                Delegate your approval authority to a colleague when you're unavailable (e.g., on leave or traveling).
                                Your delegate will be able to approve or reject requests on your behalf.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!showCreateForm ? (
                                <Button 
                                    onClick={() => setShowCreateForm(true)}
                                    disabled={hasActiveDelegation}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Delegation
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    {users.length === 0 ? (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-foreground">No eligible delegates found</p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        You can only delegate to colleagues in your unit or sector. 
                                                        Please contact HR if you need to delegate to someone outside your area.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <Label className="text-sm font-medium">Delegate To</Label>
                                                <Select
                                                    value={createForm.data.delegate_id}
                                                    onValueChange={(value) => createForm.setData('delegate_id', value)}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue placeholder="Select a colleague" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users.map((user) => (
                                                            <SelectItem key={user.id} value={String(user.id)}>
                                                                <div className="flex flex-col">
                                                                    <span>{user.name}</span>
                                                                    {user.context && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {user.context}
                                                                            {user.is_same_unit && ' • Same Unit'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {createForm.errors.delegate_id && (
                                                    <p className="text-xs text-destructive mt-1">{createForm.errors.delegate_id}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium">Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={createForm.data.starts_at}
                                                        onChange={(e) => createForm.setData('starts_at', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                    {createForm.errors.starts_at && (
                                                        <p className="text-xs text-destructive mt-1">{createForm.errors.starts_at}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium">End Date (Optional)</Label>
                                                    <Input
                                                        type="date"
                                                        value={createForm.data.ends_at}
                                                        onChange={(e) => createForm.setData('ends_at', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                    {createForm.errors.ends_at && (
                                                        <p className="text-xs text-destructive mt-1">{createForm.errors.ends_at}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="text-sm font-medium">Reason (Optional)</Label>
                                                <CustomTextarea
                                                    className="mt-1 text-sm"
                                                    placeholder="e.g., On annual leave from Feb 1-10"
                                                    value={createForm.data.reason}
                                                    onChange={(e) => createForm.setData('reason', e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleCreate} disabled={createForm.processing || !createForm.data.delegate_id}>
                                                    {createForm.processing ? 'Creating...' : 'Create Delegation'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {hasActiveDelegation && !showCreateForm && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    You already have an active delegation. Deactivate it first to create a new one.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Delegations List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="h-4 w-4" />
                                Your Delegations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {delegations.data.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No delegations found.</p>
                                    <p className="text-sm">Create a delegation when you need someone to cover your approvals.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {delegations.data.map((delegation) => (
                                        <div
                                            key={delegation.id}
                                            className={`rounded-lg border p-4 ${
                                                isEffective(delegation)
                                                    ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'
                                                    : delegation.is_active
                                                    ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                                                    : 'border-border bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-foreground">
                                                            {delegation.delegator.name}
                                                        </span>
                                                        <span className="text-muted-foreground">→</span>
                                                        <span className="font-medium text-foreground">
                                                            {delegation.delegate.name}
                                                        </span>
                                                        <Badge
                                                            className={
                                                                isEffective(delegation)
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                                                    : delegation.is_active
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                            }
                                                        >
                                                            {isEffective(delegation)
                                                                ? 'Active'
                                                                : delegation.is_active
                                                                ? 'Scheduled'
                                                                : 'Inactive'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(delegation.starts_at)}
                                                        {delegation.ends_at ? ` — ${formatDate(delegation.ends_at)}` : ' — No end date'}
                                                    </p>
                                                    {delegation.reason && (
                                                        <p className="text-sm text-foreground">{delegation.reason}</p>
                                                    )}
                                                </div>
                                                {delegation.is_active && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeactivate(delegation)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
