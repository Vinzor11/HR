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
import { Plus, Key, Copy, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Client {
    id: string;
    name: string;
    redirect: string;
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

    useEffect(() => {
        if (flash?.newClient) {
            setNewClient(flash.newClient);
        }
    }, [flash]);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        redirect: '',
        type: 'other',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                                    <CardTitle>{client.name}</CardTitle>
                                    <CardDescription>
                                        Created {new Date(client.created_at).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Client ID</Label>
                                            <p className="font-mono text-sm">{client.id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Redirect URI</Label>
                                            <p className="text-sm break-all">{client.redirect}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

