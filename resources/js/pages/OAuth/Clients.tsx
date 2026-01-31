import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Key, Copy, CheckCircle2, Eye, Trash2, Pencil, ExternalLink, LogOut, Users, Building2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
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
import { TwoFactorVerifyDialog } from '@/components/two-factor-verify-dialog';
import { Require2FAPromptDialog } from '@/components/require-2fa-prompt-dialog';
import { route } from 'ziggy-js';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'OAuth Clients', href: '/oauth/clients' }];

interface Unit {
    id: number;
    name: string;
    code: string | null;
    unit_type: string;
}

interface Position {
    id: number;
    pos_name: string;
    pos_code: string | null;
}

interface PositionRoleRow {
    position_id: string;
    role: 'admin' | 'user';
}

interface AllowedUnitEntry {
    unit_id: string;
    position_roles: PositionRoleRow[];
    role: 'admin' | 'user';
}

interface CrossUnitRow {
    position_id: string | number;
    role: 'admin' | 'user';
    unit_type_filter: string;
}

interface ClientFormData {
    id: string;
    name: string;
    redirect_uris: string[];
    post_logout_redirect_uris: string[];
    allowed_units: { unit_id: string | null; position_roles: { position_id: number; role: string }[]; role: string }[];
    cross_unit_positions: { position_id: number; role: string; unit_type_filter: string | null }[];
}

function normalizeAllowedUnitsForForm(entries: { unit_id: string | number | null; position_roles: { position_id: number; role: string }[]; role: string }[] | undefined): AllowedUnitEntry[] {
    if (!entries?.length) return [{ unit_id: 'any', position_roles: [], role: 'user' }];
    return entries.map((e) => ({
        unit_id: e.unit_id === null || e.unit_id === undefined ? 'any' : String(e.unit_id),
        position_roles: (e.position_roles || []).map((r) => ({
            position_id: String(r.position_id),
            role: r.role as 'admin' | 'user',
        })),
        role: (e.role || 'user') as 'admin' | 'user',
    }));
}

function normalizeCrossUnitForForm(rows: { position_id: number; role: string; unit_type_filter: string | null }[] | undefined): CrossUnitRow[] {
    if (!rows?.length) return [];
    return rows.map((r) => ({
        position_id: String(r.position_id),
        role: r.role as 'admin' | 'user',
        unit_type_filter: r.unit_type_filter ?? '',
    }));
}

function groupUnitsByType(units: Unit[]) {
    const colleges = units.filter((u) => u.unit_type === 'college');
    const programs = units.filter((u) => u.unit_type === 'program');
    const offices = units.filter((u) => u.unit_type === 'office');
    const other = units.filter((u) => !['college', 'program', 'office'].includes(u.unit_type));
    return { colleges, programs, offices, other };
}

const nativeSelectClassName =
    'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

interface AccessUnit {
    label: string;
    role: string | null;
    positions: string[];
}

interface CrossUnitPosition {
    position: string;
    role: string;
    unit_type: string | null;
}

interface Client {
    id: string;
    name: string;
    redirect: string;
    post_logout_redirect: string;
    created_at: string;
    access_summary?: {
        allowed_units: AccessUnit[];
        cross_unit_positions: CrossUnitPosition[];
    };
}

interface ClientsProps {
    clients: Client[];
    units: Unit[];
    positions: Position[];
}

export default function Clients({ clients, units, positions }: ClientsProps) {
    const { flash, auth } = usePage().props as {
        flash?: { newClient?: { client_id: string; client_secret: string; redirect_uri: string } };
        auth?: { user?: { two_factor_enabled?: boolean }; permissions?: string[] };
    };
    const twoFactorEnabled = auth?.user?.two_factor_enabled ?? false;
    const permissions = auth?.permissions ?? [];
    const canDeleteClient = permissions.includes('delete-oauth-client');
    const [newClient, setNewClient] = useState<{ client_id?: string; client_secret?: string; redirect_uri?: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [show2FADialog, setShow2FADialog] = useState(false);
    const [showRequire2FADialog, setShowRequire2FADialog] = useState(false);
    const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [loadingClientData, setLoadingClientData] = useState(false);

    useEffect(() => {
        if (flash?.newClient) setNewClient(flash.newClient);
    }, [flash]);

    const { data, setData, post, put, processing, errors, reset } = useForm(
        {
            name: '',
            redirect_uris: [''],
            post_logout_redirect_uris: [''] as string[],
            allowed_units: [
                { unit_id: '', position_roles: [{ position_id: '', role: 'user' as const }], role: 'user' as const },
            ] as AllowedUnitEntry[],
            cross_unit_positions: [] as CrossUnitRow[],
        },
        {
            transform: (d) => {
                const allowed_units = d.allowed_units
                    .filter((entry) => entry.unit_id === 'any' || (entry.unit_id !== '' && entry.unit_id !== 'any'))
                    .map((entry) => {
                        if (entry.unit_id === 'any') {
                            return { unit_id: null, role: entry.role, position_roles: [] };
                        }
                        return {
                            unit_id: Number(entry.unit_id),
                            position_roles: (entry.position_roles || [])
                                .filter(
                                    (r) =>
                                        r.position_id != null &&
                                        r.position_id !== '' &&
                                        String(r.position_id).trim() !== ''
                                )
                                .map((r) => ({ position_id: Number(r.position_id), role: r.role })),
                        };
                    });
                const cross_unit_positions = (d.cross_unit_positions || [])
                    .filter(
                        (r) =>
                            r.position_id != null &&
                            r.position_id !== '' &&
                            String(r.position_id).trim() !== ''
                    )
                    .map((r) => ({
                        position_id: Number(r.position_id),
                        role: r.role,
                        unit_type_filter: r.unit_type_filter || null,
                    }));
                return {
                    name: d.name,
                    redirect_uris: (d.redirect_uris || ['']).filter((u) => u && u.trim()),
                    post_logout_redirect_uris: (d.post_logout_redirect_uris || []).filter((u) => u && u.trim()),
                    allowed_units,
                    cross_unit_positions,
                };
            },
        }
    );

    const addAllowedUnit = () => {
        setData('allowed_units', [...data.allowed_units, { unit_id: '', position_roles: [{ position_id: '', role: 'user' }], role: 'user' }]);
    };
    const removeAllowedUnit = (index: number) => {
        setData('allowed_units', data.allowed_units.filter((_, i) => i !== index));
    };
    const updateAllowedUnit = (index: number, field: keyof AllowedUnitEntry, value: string | PositionRoleRow[]) => {
        const next = [...data.allowed_units];
        if (field === 'position_roles') next[index] = { ...next[index], position_roles: value as PositionRoleRow[] };
        else next[index] = { ...next[index], [field]: value };
        setData('allowed_units', next);
    };
    const addPositionRole = (unitIndex: number) => {
        const next = [...data.allowed_units];
        next[unitIndex].position_roles = [...(next[unitIndex].position_roles || []), { position_id: '', role: 'user' }];
        setData('allowed_units', next);
    };
    const removePositionRole = (unitIndex: number, roleIndex: number) => {
        const next = [...data.allowed_units];
        next[unitIndex].position_roles = next[unitIndex].position_roles.filter((_, i) => i !== roleIndex);
        setData('allowed_units', next);
    };
    const updatePositionRole = (unitIndex: number, roleIndex: number, field: keyof PositionRoleRow, value: string) => {
        const next = [...data.allowed_units];
        const roles = [...(next[unitIndex].position_roles || [])];
        roles[roleIndex] = { ...roles[roleIndex], [field]: value };
        next[unitIndex].position_roles = roles;
        setData('allowed_units', next);
    };
    const addCrossUnit = () => {
        setData('cross_unit_positions', [...data.cross_unit_positions, { position_id: '', role: 'user', unit_type_filter: '' }]);
    };
    const removeCrossUnit = (index: number) => {
        setData('cross_unit_positions', data.cross_unit_positions.filter((_, i) => i !== index));
    };
    const updateCrossUnit = (index: number, field: keyof CrossUnitRow, value: string) => {
        const next = [...data.cross_unit_positions];
        next[index] = { ...next[index], [field]: value };
        setData('cross_unit_positions', next);
    };

    const removeRedirectUri = (index: number) => {
        const next = data.redirect_uris.filter((_, i) => i !== index);
        setData('redirect_uris', next.length ? next : ['']);
    };
    const updateRedirectUri = (index: number, value: string) => {
        const next = [...data.redirect_uris];
        next[index] = value;
        setData('redirect_uris', next);
    };

    const updatePostLogoutUri = (index: number, value: string) => {
        const next = [...(data.post_logout_redirect_uris || [])];
        next[index] = value;
        setData('post_logout_redirect_uris', next);
    };

    const openModalForCreate = () => {
        reset();
        setData({
            name: '',
            redirect_uris: [''],
            post_logout_redirect_uris: [''],
            allowed_units: [{ unit_id: '', position_roles: [{ position_id: '', role: 'user' }], role: 'user' }],
            cross_unit_positions: [],
        });
        setModalMode('create');
        setEditingClientId(null);
        setModalOpen(true);
    };

    const openModalForEdit = async (client: Client) => {
        setLoadingClientData(true);
        setModalOpen(true);
        setModalMode('edit');
        setEditingClientId(client.id);
        try {
            const res = await fetch(`/oauth/clients/${client.id}/form-data`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include',
            });
            const formData: ClientFormData = await res.json();
            setData({
                name: formData.name,
                redirect_uris: formData.redirect_uris?.length ? formData.redirect_uris : [''],
                post_logout_redirect_uris: formData.post_logout_redirect_uris || [],
                allowed_units: normalizeAllowedUnitsForForm(formData.allowed_units),
                cross_unit_positions: normalizeCrossUnitForForm(formData.cross_unit_positions),
            });
        } catch {
            toast.error('Failed to load client data');
            setModalOpen(false);
        } finally {
            setLoadingClientData(false);
        }
    };

    const openModalForView = async (client: Client) => {
        await openModalForEdit(client);
        setModalMode('view');
    };

    const buildPayload = () => ({
        name: data.name,
        redirect_uris: data.redirect_uris?.filter((u) => u?.trim()) || [],
        post_logout_redirect_uris: data.post_logout_redirect_uris?.filter((u) => u?.trim()) || [],
        allowed_units: data.allowed_units
            .filter((entry) => entry.unit_id === 'any' || (entry.unit_id !== '' && entry.unit_id !== 'any'))
            .map((entry) => {
                if (entry.unit_id === 'any') {
                    return { unit_id: null, role: entry.role, position_roles: [] };
                }
                return {
                    unit_id: Number(entry.unit_id),
                    position_roles: (entry.position_roles || [])
                        .filter((r) => r.position_id !== '' && r.position_id != null)
                        .map((r) => ({ position_id: Number(r.position_id), role: r.role })),
                };
            }),
        cross_unit_positions: (data.cross_unit_positions || [])
            .filter((r) => r.position_id !== '' && r.position_id != null)
            .map((r) => ({
                position_id: Number(r.position_id),
                role: r.role,
                unit_type_filter: r.unit_type_filter || null,
            })),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing || modalMode === 'view') return;
        const payload = buildPayload();
        if (modalMode === 'create') {
            router.post('/oauth/clients', {
                name: payload.name,
                redirect: payload.redirect_uris[0] || '',
                post_logout_redirect: payload.post_logout_redirect_uris[0] || null,
                allowed_units: payload.allowed_units,
                cross_unit_positions: payload.cross_unit_positions,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                    toast.success('OAuth client created successfully!');
                },
                onError: () => {
                    toast.error('Failed to create OAuth client');
                },
            });
        } else if (modalMode === 'edit' && editingClientId) {
            router.put(`/oauth/clients/${editingClientId}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setModalOpen(false);
                    setEditingClientId(null);
                    toast.success('OAuth client updated successfully!');
                },
                onError: () => toast.error('Failed to update client'),
            });
        }
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDelete = (client: Client) => {
        setClientToDelete(client);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!clientToDelete) return;
        const client = clientToDelete;
        setDeleteDialogOpen(false);
        setClientToDelete(null);
        if (!twoFactorEnabled) {
            setPendingDeleteClient(client);
            setShowRequire2FADialog(true);
            return;
        }
        setPendingDeleteClient(client);
        setShow2FADialog(true);
    };

    const handle2FADeleteVerify = (code: string) => {
        if (pendingDeleteClient == null) return;
        router.delete(route('oauth.clients.destroy', pendingDeleteClient.id), {
            data: { two_factor_code: code },
            preserveScroll: true,
            onSuccess: (response: { props?: { flash?: { success?: string } } }) => {
                setShow2FADialog(false);
                setPendingDeleteClient(null);
                const msg = response.props?.flash?.success;
                if (msg) toast.success(msg);
            },
            onError: () => toast.error('Failed to delete OAuth client'),
        });
    };

    const handleView = (client: Client) => {
        setViewingClient(client);
        setViewDialogOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="OAuth Clients" />
            <PageLayout
                title="OAuth Clients"
                subtitle="Manage applications that can authenticate users through your HR system."
                primaryAction={{
                    label: 'Create Client',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: openModalForCreate,
                }}
            >
                <div className="space-y-6">
                    {newClient && (
                    <Card className="border-green-500 bg-green-50 dark:bg-green-950 rounded-xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Client Created Successfully
                            </CardTitle>
                            <CardDescription>
                                Save these credentials securely. The client secret will not be shown again.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Client ID</Label>
                                <div className="flex gap-2">
                                    <Input value={newClient.client_id} readOnly className="font-mono" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(newClient.client_id!, 'client_id')}
                                    >
                                        {copied === 'client_id' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Client Secret</Label>
                                <div className="flex gap-2">
                                    <Input value={newClient.client_secret} readOnly className="font-mono" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(newClient.client_secret!, 'client_secret')}
                                    >
                                        {copied === 'client_secret' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setNewClient(null)}
                                className="w-full"
                            >
                                Close
                            </Button>
                        </CardContent>
                    </Card>
                    )}

                    {/* Clients list */}
                    <div className="max-w-4xl mx-auto">
                    <div className="space-y-6">
                        {clients.length === 0 ? (
                            <div className="bg-white rounded-xl border border-border shadow-sm py-12 text-center">
                                <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="font-medium text-foreground mb-1">No OAuth Clients</p>
                                <p className="text-sm text-muted-foreground">
                                    Create your first OAuth client to enable SSO for other applications.
                                </p>
                            </div>
                        ) : (
                            clients.map((client) => (
                                <div
                                    key={client.id}
                                    className="bg-white border border-border rounded-xl shadow-sm p-4"
                                >
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                {/* Header */}
                                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                                    <p className="font-semibold text-foreground">{client.name}</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        Created {new Date(client.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {/* Details Card */}
                                                <div className="border border-border rounded-lg py-2 px-3 bg-muted/30">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground font-semibold shrink-0">Client ID</span>
                                                            <span className="font-mono text-foreground truncate text-sm">{client.id}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0"
                                                                onClick={() => copyToClipboard(client.id, `client_id_${client.id}`)}
                                                                title="Copy Client ID"
                                                            >
                                                                {copied === `client_id_${client.id}` ? (
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <span className="text-muted-foreground font-semibold shrink-0">Redirect URI</span>
                                                            <span className="text-foreground break-all text-sm">{client.redirect || '—'}</span>
                                                        </div>
                                                        {client.post_logout_redirect && (
                                                            <div className="flex items-start gap-2 sm:col-span-2 min-w-0">
                                                                <span className="text-muted-foreground font-semibold shrink-0">Post-logout URI</span>
                                                                <span className="text-foreground break-all text-sm">{client.post_logout_redirect}</span>
                                                            </div>
                                                        )}
                                                        {client.access_summary?.allowed_units?.length > 0 && (
                                                            <div className="flex items-start gap-2 sm:col-span-2 min-w-0">
                                                                <span className="text-muted-foreground font-semibold shrink-0">Access</span>
                                                                <div className="text-foreground space-y-0.5 text-sm">
                                                                    {client.access_summary.allowed_units.map((au, i) => (
                                                                        <div key={i} className="flex items-baseline gap-1">
                                                                            <span className="text-muted-foreground text-base leading-none">·</span>
                                                                            <span>
                                                                                {au.label}
                                                                                {au.role && <span className="text-muted-foreground"> ({au.role})</span>}
                                                                                {au.positions.length > 0 && (
                                                                                    <span className="text-muted-foreground"> — {au.positions.join(', ')}</span>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {client.access_summary?.cross_unit_positions?.length > 0 && (
                                                            <div className="flex items-start gap-2 sm:col-span-2 min-w-0">
                                                                <span className="text-muted-foreground font-semibold shrink-0">Cross-unit</span>
                                                                <div className="text-foreground space-y-0.5 text-sm">
                                                                    {client.access_summary.cross_unit_positions.map((cu, i) => (
                                                                        <div key={i} className="flex items-baseline gap-1">
                                                                            <span className="text-muted-foreground text-base leading-none">·</span>
                                                                            <span>
                                                                                {cu.position} ({cu.role}){cu.unit_type ? ` — ${cu.unit_type}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center gap-1 shrink-0 self-center">
                                                <IconButton
                                                    icon={<Eye className="h-4 w-4 text-sky-600" />}
                                                    tooltip="View"
                                                    variant="ghost"
                                                    onClick={() => openModalForView(client)}
                                                    aria-label="View"
                                                    className="h-9 w-9 rounded-lg"
                                                />
                                                <IconButton
                                                    icon={<Pencil className="h-4 w-4 text-blue-600" />}
                                                    tooltip="Edit"
                                                    variant="ghost"
                                                    onClick={() => openModalForEdit(client)}
                                                    aria-label="Edit"
                                                    className="h-9 w-9 rounded-lg"
                                                />
                                                {canDeleteClient && (
                                                    <IconButton
                                                        icon={<Trash2 className="h-4 w-4 text-red-600" />}
                                                        tooltip="Delete"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(client)}
                                                        aria-label="Delete"
                                                        className="h-9 w-9 rounded-lg"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                </div>
                            ))
                        )}
                    </div>
                    </div>
                </div>
            </PageLayout>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete OAuth Client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be undone.
                            Any applications using this client will no longer be able to authenticate.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Require2FAPromptDialog
                open={showRequire2FADialog}
                onOpenChange={(open) => {
                    setShowRequire2FADialog(open);
                    if (!open) setPendingDeleteClient(null);
                }}
                description="To delete OAuth clients you must enable two-factor authentication (2FA). You can set it up now in just a few steps."
                actionLabel="Let's go"
            />

            <TwoFactorVerifyDialog
                open={show2FADialog}
                onOpenChange={(open) => {
                    setShow2FADialog(open);
                    if (!open) setPendingDeleteClient(null);
                }}
                onVerify={handle2FADeleteVerify}
                title="Verify to delete OAuth client"
                description="Enter your 6-digit verification code to confirm deletion. This action cannot be undone."
                verifyButtonLabel="Verify and delete"
            />

            {/* Create / Edit / View Client Modal */}
            <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingClientId(null); }}>
                <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[830px] max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
                        <DialogTitle>
                            {modalMode === 'create' && 'Create OAuth Client'}
                            {modalMode === 'edit' && 'Edit OAuth Client'}
                            {modalMode === 'view' && 'OAuth Client Details'}
                        </DialogTitle>
                        <DialogDescription>
                            {modalMode === 'view'
                                ? 'View client configuration (read-only).'
                                : 'Add allowed units (specific units with position→role, or &quot;Any unit&quot; for all other employees). Configure redirect URIs and optional cross-unit positions.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                        <div className="overflow-y-auto px-6 py-4 space-y-6">
                            {loadingClientData ? (
                                <div className="py-12 text-center text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                            {Object.keys(errors).length > 0 && modalMode !== 'view' && (
                                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                                    <Label className="text-destructive font-medium">Fix the following:</Label>
                                    <textarea
                                        readOnly
                                        className="mt-2 w-full min-h-[60px] rounded border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive font-mono"
                                        value={Object.entries(errors)
                                            .map(([key, value]) => {
                                                const msg = Array.isArray(value) ? value[0] : typeof value === 'string' ? value : String(value);
                                                return `${key}: ${msg}`;
                                            })
                                            .join('\n')}
                                        rows={4}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="modal-name">Application Name</Label>
                                <Input
                                    id="modal-name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g., Accounting System"
                                    required
                                    readOnly={modalMode === 'view'}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Redirect URIs</Label>
                                {(data.redirect_uris || ['']).map((uri, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            type="url"
                                            value={uri}
                                            onChange={(e) => updateRedirectUri(index, e.target.value)}
                                            placeholder="https://example.com/oauth/callback"
                                            required={index === 0}
                                            readOnly={modalMode === 'view'}
                                            className="flex-1"
                                        />
                                        {modalMode !== 'view' && (data.redirect_uris?.length || 1) > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeRedirectUri(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {errors.redirect && <p className="text-sm text-destructive">{errors.redirect}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Post-Logout Redirect URIs (optional)</Label>
                                {(data.post_logout_redirect_uris || []).length === 0 && modalMode === 'view' ? (
                                    <p className="text-sm text-muted-foreground">None</p>
                                ) : (
                                    (data.post_logout_redirect_uris || []).map((uri, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                type="url"
                                                value={uri}
                                                onChange={(e) => updatePostLogoutUri(index, e.target.value)}
                                                placeholder="https://example.com/logged-out"
                                                readOnly={modalMode === 'view'}
                                                className="flex-1"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Allowed units (specific first, then &quot;Any unit&quot;)</Label>
                                    {modalMode !== 'view' && (
                                        <Button type="button" variant="outline" size="sm" onClick={addAllowedUnit}>
                                            <Plus className="h-4 w-4 mr-2" /> Add unit
                                        </Button>
                                    )}
                                </div>
                                {data.allowed_units.map((entry, unitIndex) => (
                                    <Card key={unitIndex} className="p-4 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="space-y-2 flex-1 min-w-[260px]">
                                                <Label htmlFor={`unit-${unitIndex}`}>Unit <span className="text-destructive">*</span></Label>
                                                <select
                                                    id={`unit-${unitIndex}`}
                                                    value={entry.unit_id === '' ? '' : entry.unit_id}
                                                    onChange={(e) =>
                                                        updateAllowedUnit(unitIndex, 'unit_id', e.target.value === '' ? '' : e.target.value)
                                                    }
                                                    className={nativeSelectClassName}
                                                    disabled={modalMode === 'view'}
                                                >
                                                    <option value="">Select Unit</option>
                                                    {(() => {
                                                        const { colleges, programs, offices, other } = groupUnitsByType(units);
                                                        return (
                                                            <>
                                                                {colleges.length > 0 && (
                                                                    <optgroup label="Colleges">
                                                                        {colleges.map((u) => (
                                                                            <option key={u.id} value={String(u.id)}>{u.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                {programs.length > 0 && (
                                                                    <optgroup label="Programs">
                                                                        {programs.map((u) => (
                                                                            <option key={u.id} value={String(u.id)}>{u.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                {offices.length > 0 && (
                                                                    <optgroup label="Offices">
                                                                        {offices.map((u) => (
                                                                            <option key={u.id} value={String(u.id)}>{u.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                {other.length > 0 && (
                                                                    <optgroup label="Other">
                                                                        {other.map((u) => (
                                                                            <option key={u.id} value={String(u.id)}>{u.name} — {u.unit_type}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                    <option value="any">Any unit (all other employees = role below)</option>
                                                </select>
                                            </div>
                                            {(entry.unit_id === 'any' || entry.unit_id === '') && (
                                                <div className="space-y-2 w-[120px]">
                                                    <Label htmlFor={`role-any-${unitIndex}`} className="sr-only">Role</Label>
                                                    <select
                                                        id={`role-any-${unitIndex}`}
                                                        value={entry.role}
                                                        onChange={(e) => updateAllowedUnit(unitIndex, 'role', e.target.value as 'admin' | 'user')}
                                                        className={nativeSelectClassName}
                                                        disabled={modalMode === 'view'}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="user">User</option>
                                                    </select>
                                                </div>
                                            )}
                                                        {modalMode !== 'view' && (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAllowedUnit(unitIndex)} title="Remove this allowed unit">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                        </div>
                                        {entry.unit_id !== 'any' && entry.unit_id !== '' && (
                                            <div className="space-y-2 pl-2 border-l-2 border-muted">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Position → Role (this unit only)</span>
                                                    {modalMode !== 'view' && (
                                                        <Button type="button" variant="outline" size="sm" onClick={() => addPositionRole(unitIndex)}>
                                                            <Plus className="h-4 w-4 mr-2" /> Add
                                                        </Button>
                                                    )}
                                                </div>
                                                {(entry.position_roles || []).map((row, roleIndex) => (
                                                    <div key={roleIndex} className="flex flex-wrap items-center gap-2">
                                                        <div className="space-y-2 flex-1 min-w-[200px]">
                                                            <Label htmlFor={`pos-${unitIndex}-${roleIndex}`} className="sr-only">Position</Label>
                                                            <select
                                                                id={`pos-${unitIndex}-${roleIndex}`}
                                                                value={row.position_id}
                                                                onChange={(e) => updatePositionRole(unitIndex, roleIndex, 'position_id', e.target.value)}
                                                                className={nativeSelectClassName}
                                                                disabled={modalMode === 'view'}
                                                            >
                                                                <option value="">Select Position</option>
                                                                {positions.map((p) => (
                                                                    <option key={p.id} value={String(p.id)}>{p.pos_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2 w-[120px]">
                                                            <Label htmlFor={`role-${unitIndex}-${roleIndex}`} className="sr-only">Role</Label>
                                                            <select
                                                                id={`role-${unitIndex}-${roleIndex}`}
                                                                value={row.role}
                                                                onChange={(e) => updatePositionRole(unitIndex, roleIndex, 'role', e.target.value as 'admin' | 'user')}
                                                                className={nativeSelectClassName}
                                                                disabled={modalMode === 'view'}
                                                            >
                                                                <option value="admin">Admin</option>
                                                                <option value="user">User</option>
                                                            </select>
                                                        </div>
                                                        {modalMode !== 'view' && (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removePositionRole(unitIndex, roleIndex)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <p className="text-xs text-muted-foreground">
                                                    Only these positions in this unit get access; other positions in this unit are denied.
                                                </p>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Cross-unit positions (optional)</Label>
                                    {modalMode !== 'view' && (
                                        <Button type="button" variant="outline" size="sm" onClick={addCrossUnit}>
                                            <Plus className="h-4 w-4 mr-2" /> Add
                                        </Button>
                                    )}
                                </div>
                                {(data.cross_unit_positions || []).map((row, index) => (
                                    <div key={index} className="flex flex-wrap items-center gap-2">
                                        <div className="space-y-2 flex-1 min-w-[200px]">
                                            <Label htmlFor={`cross-pos-${index}`} className="sr-only">Position</Label>
                                            <select
                                                id={`cross-pos-${index}`}
                                                value={row.position_id}
                                                onChange={(e) => updateCrossUnit(index, 'position_id', e.target.value)}
                                                className={nativeSelectClassName}
                                                disabled={modalMode === 'view'}
                                            >
                                                <option value="">Select Position</option>
                                                {positions.map((p) => (
                                                    <option key={p.id} value={String(p.id)}>{p.pos_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2 w-[120px]">
                                            <Label htmlFor={`cross-role-${index}`} className="sr-only">Role</Label>
                                            <select
                                                id={`cross-role-${index}`}
                                                value={row.role}
                                                onChange={(e) => updateCrossUnit(index, 'role', e.target.value as 'admin' | 'user')}
                                                className={nativeSelectClassName}
                                                disabled={modalMode === 'view'}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="user">User</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2 w-[180px]">
                                            <Label htmlFor={`cross-type-${index}`} className="sr-only">Unit type</Label>
                                            <select
                                                id={`cross-type-${index}`}
                                                value={row.unit_type_filter === 'office' ? 'administrative' : (row.unit_type_filter || 'any')}
                                                onChange={(e) => updateCrossUnit(index, 'unit_type_filter', e.target.value === 'any' ? '' : e.target.value)}
                                                className={nativeSelectClassName}
                                                disabled={modalMode === 'view'}
                                            >
                                                <option value="any">Any</option>
                                                <option value="academic">Academic (college, program)</option>
                                                <option value="administrative">Administrative (office)</option>
                                                <option value="college">College</option>
                                                <option value="program">Program</option>
                                            </select>
                                        </div>
                                        {modalMode !== 'view' && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCrossUnit(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                    Allow this position from other units. Use &quot;academic&quot; for college/program only.
                                </p>
                            </div>
                                </>
                            )}
                        </div>
                        <DialogFooter className="shrink-0 border-t px-6 py-4">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                {modalMode === 'view' ? 'Close' : 'Cancel'}
                            </Button>
                            {modalMode !== 'view' && (
                                <Button type="submit" disabled={processing}>
                                    {modalMode === 'create' ? 'Create Client' : 'Update Client'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

