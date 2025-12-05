import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';

interface AuthorizeProps {
    client: {
        id: string;
        name: string;
    };
    scopes: (string | { id: string; description?: string })[];
    request: {
        client_id: string;
        redirect_uri: string;
        response_type: string;
        scope: string;
        state: string;
    };
    authToken: string;
}

const scopeDescriptions: Record<string, string> = {
    openid: 'Verify your identity',
    profile: 'Access your profile information',
    email: 'Access your email address',
    accounting: 'Access accounting system',
    payroll: 'Access payroll system',
    hr: 'Access HR system',
};

export default function Authorize({ client, scopes, request, authToken }: AuthorizeProps) {
    const submitForm = (method: 'POST' | 'DELETE') => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/oauth/authorize';

        if (method === 'DELETE') {
            const methodInput = document.createElement('input');
            methodInput.type = 'hidden';
            methodInput.name = '_method';
            methodInput.value = 'DELETE';
            form.appendChild(methodInput);
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }

        const authTokenInput = document.createElement('input');
        authTokenInput.type = 'hidden';
        authTokenInput.name = 'auth_token';
        authTokenInput.value = authToken;
        form.appendChild(authTokenInput);

        Object.entries(request).forEach(([key, value]) => {
            if (!value) {
                return;
            }
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
    };

    const approve = () => submitForm('POST');
    const deny = () => submitForm('DELETE');

    return (
        <>
            <Head title="Authorize Application" />
            <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Authorize Application</CardTitle>
                        <CardDescription>
                            <strong>{client.name}</strong> wants to access your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-2">This application will be able to:</p>
                            <ul className="space-y-2">
                                {scopes.length > 0 ? (
                                    scopes.map((scope, index) => {
                                        const scopeId = typeof scope === 'string' ? scope : scope.id;
                                        const scopeDescription = typeof scope === 'string' 
                                            ? (scopeDescriptions[scope] || scope)
                                            : (scope.description || scopeDescriptions[scopeId] || scopeId);
                                        
                                        return (
                                            <li key={scopeId || index} className="flex items-start gap-2 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                <span className="text-muted-foreground">
                                                    {scopeDescription}
                                                </span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <li className="text-sm text-muted-foreground">
                                        No specific permissions requested
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex gap-2">
                                <Button onClick={approve} className="flex-1" size="lg">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Authorize
                                </Button>
                                <Button onClick={deny} variant="outline" className="flex-1" size="lg">
                                    <XCircle className="h-4 w-4" />
                                    Deny
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

