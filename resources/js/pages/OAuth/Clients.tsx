import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Key, Copy, CheckCircle2, Eye, Trash2, Edit } from 'lucide-react';
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

interface Client {
    id: string;
    name: string;
    redirect: string;
    post_logout_redirect: string;
    created_at: string;
}

interface ClientsProps {
    clients: Client[];
}

export default function Clients({ clients }: ClientsProps) {
    const { flash } = usePage().props as any;
    const [open, setOpen] = useState(false);
    const [newClient, setNewClient] = useState<{
        client_id?: string;
        client_secret?: string;
        redirect_uri?: string;
    } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);

    useEffect(() => {
        if (flash?.newClient) {
            setNewClient(flash.newClient);
        }
    }, [flash]);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        redirect: '',
        post_logout_redirect: '',
        type: 'other',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }
        
        post('/oauth/clients', {
            onSuccess: () => {
                reset();
                setOpen(false);
                toast.success('OAuth client created successfully!');
            },
            onError: () => {
                toast.error('Failed to create OAuth client');
            },
        });
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
        if (clientToDelete) {
            router.delete(`/oauth/clients/${clientToDelete.id}`, {
                onSuccess: () => {
                    toast.success('OAuth client deleted successfully');
                    setDeleteDialogOpen(false);
                    setClientToDelete(null);
                },
                onError: () => {
                    toast.error('Failed to delete OAuth client');
                },
            });
        }
    };

    const handleView = (client: Client) => {
        setViewingClient(client);
        setViewDialogOpen(true);
    };

    return (
        <AppLayout>
            <Head title="OAuth Clients" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">OAuth Clients</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage applications that can authenticate users through your HR system
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Create OAuth Client</DialogTitle>
                                    <DialogDescription>
                                        Register a new application that will use your HR system for authentication
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Application Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="e.g., Accounting System"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive">{errors.name}</p>
                                        )}
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
                                        {errors.redirect && (
                                            <p className="text-sm text-destructive">{errors.redirect}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="post_logout_redirect">Post-Logout Redirect URI (Optional)</Label>
                                        <Input
                                            id="post_logout_redirect"
                                            type="url"
                                            value={data.post_logout_redirect}
                                            onChange={(e) => setData('post_logout_redirect', e.target.value)}
                                            placeholder="https://example.com/logged-out"
                                        />
                                        {errors.post_logout_redirect && (
                                            <p className="text-sm text-destructive">{errors.post_logout_redirect}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Where users are redirected after SSO logout. Leave empty to redirect to HR home page.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Application Type</Label>
                                        <Select
                                            value={data.type}
                                            onValueChange={(value) => setData('type', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="accounting">Accounting System</SelectItem>
                                                <SelectItem value="payroll">Payroll System</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setOpen(false);
                                            reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Create Client
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {newClient && (
                    <Card className="border-green-500 bg-green-50 dark:bg-green-950">
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

                <div className="grid gap-4">
                    {clients.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <CardTitle className="mb-2">No OAuth Clients</CardTitle>
                                <CardDescription>
                                    Create your first OAuth client to enable SSO for other applications
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ) : (
                        clients.map((client) => (
                            <Card key={client.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{client.name}</CardTitle>
                                            <CardDescription>
                                                Created {new Date(client.created_at).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => router.visit(`/oauth/clients/${client.id}/edit`)}
                                                title="Edit Client"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleView(client)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDelete(client)}
                                                title="Delete Client"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Client ID</Label>
                                            <div className="flex items-center gap-2">
                                                <p className="font-mono text-sm">{client.id}</p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(client.id, `client_id_${client.id}`)}
                                                >
                                                    {copied === `client_id_${client.id}` ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Redirect URI</Label>
                                            <p className="text-sm break-all">{client.redirect}</p>
                                        </div>
                                        {client.post_logout_redirect && (
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Post-Logout Redirect URI</Label>
                                                <p className="text-sm break-all">{client.post_logout_redirect}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

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

            {/* View Client Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>OAuth Client Details</DialogTitle>
                        <DialogDescription>
                            View details for {viewingClient?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingClient && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Client ID</Label>
                                <div className="flex gap-2">
                                    <Input value={viewingClient.id} readOnly className="font-mono" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(viewingClient.id, 'view_client_id')}
                                    >
                                        {copied === 'view_client_id' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Application Name</Label>
                                <Input value={viewingClient.name} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label>Redirect URI</Label>
                                <Input value={viewingClient.redirect} readOnly className="break-all" />
                            </div>
                            {viewingClient.post_logout_redirect && (
                                <div className="space-y-2">
                                    <Label>Post-Logout Redirect URI</Label>
                                    <Input value={viewingClient.post_logout_redirect} readOnly className="break-all" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Created At</Label>
                                <Input
                                    value={new Date(viewingClient.created_at).toLocaleString()}
                                    readOnly
                                />
                            </div>
                            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Note:</strong> The client secret cannot be retrieved after creation.
                                    If you need a new secret, delete and recreate this client.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

