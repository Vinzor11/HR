import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

interface Client {
    id: string;
    name: string;
    redirect_uris: string[];
    post_logout_redirect_uris: string[];
}

interface EditClientProps {
    client: Client;
}

export default function EditClient({ client }: EditClientProps) {
    const { flash } = usePage().props as any;

    const { data, setData, put, processing, errors, reset } = useForm({
        name: client.name,
        redirect_uris: client.redirect_uris || [''],
        post_logout_redirect_uris: client.post_logout_redirect_uris || [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        put(`/oauth/clients/${client.id}`, {
            onSuccess: () => {
                toast.success('OAuth client updated successfully!');
                router.visit('/oauth/clients');
            },
            onError: () => {
                toast.error('Failed to update OAuth client');
            },
        });
    };

    const addRedirectUri = () => {
        setData('redirect_uris', [...data.redirect_uris, '']);
    };

    const removeRedirectUri = (index: number) => {
        const newUris = data.redirect_uris.filter((_, i) => i !== index);
        setData('redirect_uris', newUris.length > 0 ? newUris : ['']);
    };

    const updateRedirectUri = (index: number, value: string) => {
        const newUris = [...data.redirect_uris];
        newUris[index] = value;
        setData('redirect_uris', newUris);
    };

    const addPostLogoutRedirectUri = () => {
        setData('post_logout_redirect_uris', [...data.post_logout_redirect_uris, '']);
    };

    const removePostLogoutRedirectUri = (index: number) => {
        const newUris = data.post_logout_redirect_uris.filter((_, i) => i !== index);
        setData('post_logout_redirect_uris', newUris);
    };

    const updatePostLogoutRedirectUri = (index: number, value: string) => {
        const newUris = [...data.post_logout_redirect_uris];
        newUris[index] = value;
        setData('post_logout_redirect_uris', newUris);
    };

    return (
        <AppLayout>
            <Head title="Edit OAuth Client" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Edit OAuth Client</h1>
                        <p className="text-muted-foreground mt-1">
                            Update client configuration and redirect URIs
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/oauth/clients')}>
                        Back to Clients
                    </Button>
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        <CardHeader>
                            <CardTitle>Client Configuration</CardTitle>
                            <CardDescription>
                                Modify the OAuth client settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Redirect URIs</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addRedirectUri}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add URI
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {data.redirect_uris.map((uri, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                type="url"
                                                value={uri}
                                                onChange={(e) => updateRedirectUri(index, e.target.value)}
                                                placeholder="https://example.com/oauth/callback"
                                                required
                                            />
                                            {data.redirect_uris.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => removeRedirectUri(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {errors['redirect_uris'] && (
                                    <p className="text-sm text-destructive">{errors['redirect_uris']}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    URIs where users are redirected after successful OAuth authentication
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Post-Logout Redirect URIs (Optional)</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addPostLogoutRedirectUri}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add URI
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {data.post_logout_redirect_uris.map((uri, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                type="url"
                                                value={uri}
                                                onChange={(e) => updatePostLogoutRedirectUri(index, e.target.value)}
                                                placeholder="https://example.com/logged-out"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removePostLogoutRedirectUri(index)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {errors['post_logout_redirect_uris'] && (
                                    <p className="text-sm text-destructive">{errors['post_logout_redirect_uris']}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    URIs where users are redirected after SSO logout. Leave empty to redirect to HR home page.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="submit" disabled={processing}>
                                    Update Client
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit('/oauth/clients')}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
