import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Shield } from 'lucide-react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (processing) {
            return;
        }
        
        post(route('two-factor.verify'));
    };

    return (
        <AuthLayout
            title="Two Factor Authentication"
            description="Please confirm access to your account by entering the authentication code provided by your authenticator application."
        >
            <Head title="Two Factor Authentication" />

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="flex items-center justify-center">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="code">Authentication Code or Recovery Code</Label>
                        <Input
                            id="code"
                            type="text"
                            required
                            autoFocus
                            autoComplete="one-time-code"
                            value={data.code}
                            onChange={(e) => {
                                // Allow both 6-digit codes and recovery codes (alphanumeric with hyphens)
                                const value = e.target.value;
                                // If it's a 6-digit code, only allow digits
                                if (/^\d{0,6}$/.test(value)) {
                                    setData('code', value);
                                } else if (/^[a-fA-F0-9-]+$/.test(value)) {
                                    // Allow recovery code format (hex with hyphens)
                                    setData('code', value);
                                }
                            }}
                            placeholder="000000 or xxxx-xxxx"
                            className="text-center text-lg tracking-widest font-mono"
                        />
                        <InputError message={errors.code} />
                        <p className="text-muted-foreground text-sm">
                            Enter the 6-digit code from your authenticator app, or use one of your recovery codes.
                        </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Verifying...' : 'Verify'}
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}

