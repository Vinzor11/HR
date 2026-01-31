import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';

const nativeSelectClassName =
    'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

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

interface ClientOption {
    id: string;
    name: string;
}

interface CreateClientTestProps {
    units: Unit[];
    positions: Position[];
    clients: ClientOption[];
}

interface PositionRoleRow {
    position_id: string;
    role: 'admin' | 'user';
}

/** One allowed unit: either a specific unit with position_roles, or "any unit" with role */
interface AllowedUnitEntry {
    unit_id: string; // '' or 'any' or number as string
    position_roles: PositionRoleRow[];
    role: 'admin' | 'user';
}

interface CrossUnitRow {
    position_id: string;
    role: 'admin' | 'user';
    unit_type_filter: string;
}

function groupUnitsByType(units: Unit[]) {
    const colleges = units.filter((u) => u.unit_type === 'college');
    const programs = units.filter((u) => u.unit_type === 'program');
    const offices = units.filter((u) => u.unit_type === 'office');
    const other = units.filter((u) => !['college', 'program', 'office'].includes(u.unit_type));
    return { colleges, programs, offices, other };
}

export default function CreateClientTest({ units, positions, clients }: CreateClientTestProps) {
    const { flash } = usePage().props as { flash?: { newClient?: { client_id: string; client_secret: string; redirect_uri: string } } };
    const [newClient, setNewClient] = useState<typeof flash.newClient | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [userinfoJson, setUserinfoJson] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        if (flash?.newClient) setNewClient(flash.newClient);
    }, [flash]);

    const { data, setData, post, processing, errors, reset } = useForm(
        {
            name: '',
            redirect: '',
            post_logout_redirect: '',
            allowed_units: [
                { unit_id: '', position_roles: [{ position_id: '', role: 'user' as const }], role: 'user' as const },
            ] as AllowedUnitEntry[],
            cross_unit_positions: [] as CrossUnitRow[],
        },
        {
            transform: (d) => ({
                name: d.name,
                redirect: d.redirect,
                post_logout_redirect: d.post_logout_redirect || null,
                allowed_units: d.allowed_units
                    .filter((entry) => entry.unit_id === 'any' || (entry.unit_id !== '' && entry.unit_id !== 'any'))
                    .map((entry) => {
                        if (entry.unit_id === 'any') {
                            return { unit_id: null, role: entry.role, position_roles: [] };
                        }
                        return {
                            unit_id: Number(entry.unit_id),
                            position_roles: (entry.position_roles || []).filter((r) => r.position_id !== '').map((r) => ({ position_id: Number(r.position_id), role: r.role })),
                        };
                    }),
                cross_unit_positions: (d.cross_unit_positions || []).filter((r) => r.position_id !== '').map((r) => ({
                    position_id: Number(r.position_id),
                    role: r.role,
                    unit_type_filter: r.unit_type_filter || null,
                })),
            }),
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        post('/oauth/clients?redirect=test', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('OAuth client created successfully!');
                reset();
            },
            onError: (errors) => {
                toast.error(typeof errors === 'object' && errors && 'message' in errors ? String((errors as { message?: string }).message) : 'Failed to create OAuth client');
            },
        });
    };

    const loadUserinfoPreview = async () => {
        if (!selectedClientId) {
            toast.error('Select a client first');
            return;
        }
        setLoadingPreview(true);
        setUserinfoJson(null);
        try {
            const res = await fetch(`/oauth/clients/userinfo-preview?client_id=${encodeURIComponent(selectedClientId)}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include',
            });
            const json = await res.json();
            setUserinfoJson(JSON.stringify(json, null, 2));
        } catch {
            toast.error('Failed to load preview');
        } finally {
            setLoadingPreview(false);
        }
    };

    const copyJson = () => {
        if (userinfoJson) {
            navigator.clipboard.writeText(userinfoJson);
            toast.success('Copied to clipboard');
        }
    };

    return (
        <AppLayout>
            <Head title="OAuth Client Test – Create & UserInfo Preview" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">OAuth Client Test</h1>
                        <p className="text-muted-foreground mt-1">
                            Create clients with unit/position roles and preview the userinfo JSON sent when OAuth is authorized
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/oauth/clients')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Back to OAuth Clients
                    </Button>
                </div>

                {/* Create Client Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create OAuth Client (New Flow)</CardTitle>
                        <CardDescription>
                            Add multiple allowed units. First add a specific unit (e.g. Unit X) with positions (Director=admin); then add &quot;Any unit&quot; so employees from other units get user role. Unit X employees whose position is not configured are still denied.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {Object.keys(errors).length > 0 && (
                                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                    <p className="font-medium">Please fix the following:</p>
                                    <ul className="mt-1 list-inside list-disc">
                                        {Object.entries(errors).map(([key, msg]) => (
                                            <li key={key}>{typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : String(msg)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="name">Application Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g., Research Office System"
                                    required
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="redirect">Redirect URI</Label>
                                <Input
                                    id="redirect"
                                    type="url"
                                    value={data.redirect}
                                    onChange={(e) => setData('redirect', e.target.value)}
                                    placeholder="https://example.com/oauth/callback"
                                    required
                                />
                                {errors.redirect && <p className="text-sm text-destructive">{errors.redirect}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="post_logout_redirect">Post-Logout Redirect URI (optional)</Label>
                                <Input
                                    id="post_logout_redirect"
                                    type="url"
                                    value={data.post_logout_redirect}
                                    onChange={(e) => setData('post_logout_redirect', e.target.value)}
                                    placeholder="https://example.com/logged-out"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Allowed units (order matters: specific units first, then &quot;Any unit&quot;)</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addAllowedUnit}>
                                        <Plus className="h-4 w-4 mr-1" /> Add unit
                                    </Button>
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
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="user">User</option>
                                                    </select>
                                                </div>
                                            )}
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAllowedUnit(unitIndex)} title="Remove this allowed unit">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        {entry.unit_id !== 'any' && entry.unit_id !== '' && (
                                            <div className="space-y-2 pl-2 border-l-2 border-muted">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Position → Role (this unit only)</span>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => addPositionRole(unitIndex)}>
                                                        <Plus className="h-4 w-4 mr-1" /> Add
                                                    </Button>
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
                                                            >
                                                                <option value="admin">Admin</option>
                                                                <option value="user">User</option>
                                                            </select>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePositionRole(unitIndex, roleIndex)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
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
                                    <Label>Cross-unit positions (optional, e.g. Research Coordinator from academic)</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addCrossUnit}>
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
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
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="user">User</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2 w-[140px]">
                                            <Label htmlFor={`cross-type-${index}`} className="sr-only">Unit type</Label>
                                            <Input
                                                id={`cross-type-${index}`}
                                                className="h-10"
                                                placeholder="unit_type e.g. academic"
                                                value={row.unit_type_filter}
                                                onChange={(e) => updateCrossUnit(index, 'unit_type_filter', e.target.value)}
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCrossUnit(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                    Allow this position from other units. Use &quot;academic&quot; to allow college/program only.
                                </p>
                            </div>

                            <Button type="submit" disabled={processing}>Create Client</Button>
                        </form>
                    </CardContent>
                </Card>

                {newClient && (
                    <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Client Created
                            </CardTitle>
                            <CardDescription>Save these credentials. The client secret will not be shown again.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex gap-2">
                                <Input value={newClient.client_id} readOnly className="font-mono" />
                                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newClient.client_id); toast.success('Copied'); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Input value={newClient.client_secret} readOnly className="font-mono" />
                                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newClient.client_secret); toast.success('Copied'); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="outline" onClick={() => setNewClient(null)}>Dismiss</Button>
                        </CardContent>
                    </Card>
                )}

                {/* UserInfo JSON Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>UserInfo JSON Preview</CardTitle>
                        <CardDescription>
                            Select a client and load to see the exact JSON sent to the application when a user is authorized via OAuth (including client_role).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select client" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={loadUserinfoPreview} disabled={loadingPreview || !selectedClientId}>
                                {loadingPreview ? 'Loading…' : 'Load Preview'}
                            </Button>
                            {userinfoJson && (
                                <Button variant="outline" size="icon" onClick={copyJson}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {userinfoJson && (
                            <pre className="p-4 rounded-lg bg-muted text-sm overflow-auto max-h-[480px] whitespace-pre-wrap break-words">
                                {userinfoJson}
                            </pre>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
