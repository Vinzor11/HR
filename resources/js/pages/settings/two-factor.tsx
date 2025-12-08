import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Two Factor Authentication',
        href: '/settings/two-factor',
    },
];

interface TwoFactorProps {
    qrCode: string;
    secret: string;
    enabled: boolean;
    recoveryCodes: string[];
    status?: string;
}

export default function TwoFactor({ qrCode, secret, enabled, recoveryCodes, status }: TwoFactorProps) {
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
    const [copied, setCopied] = useState(false);

    const enableForm = useForm({
        code: '',
    });

    const disableForm = useForm({
        password: '',
    });

    const regenerateForm = useForm({
        password: '',
    });

    const enable2FA: FormEventHandler = (e) => {
        e.preventDefault();
        if (enableForm.processing) return;

        enableForm.post(route('two-factor.enable'), {
            preserveScroll: true,
            onSuccess: () => {
                enableForm.reset();
                setShowRecoveryCodes(true);
            },
        });
    };

    const disable2FA: FormEventHandler = (e) => {
        e.preventDefault();
        if (disableForm.processing) return;

        disableForm.post(route('two-factor.disable'), {
            preserveScroll: true,
            onSuccess: () => {
                disableForm.reset();
                setShowRecoveryCodes(false);
            },
        });
    };

    const regenerateCodes: FormEventHandler = (e) => {
        e.preventDefault();
        if (regenerateForm.processing) return;

        regenerateForm.post(route('two-factor.recovery-codes'), {
            preserveScroll: true,
            onSuccess: () => {
                regenerateForm.reset();
                setShowRecoveryCodes(true);
            },
        });
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        toast.success('Secret key copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Two Factor Authentication" />
            <SettingsLayout>
                <div className="space-y-6">
                    <div>
                        <HeadingSmall>Two Factor Authentication</HeadingSmall>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Add an additional layer of security to your account by enabling two factor authentication.
                        </p>
                    </div>

                    {status && (
                        <Alert>
                            <AlertDescription>{status}</AlertDescription>
                        </Alert>
                    )}

                    {!enabled ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label>Step 1: Scan QR Code</Label>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                    </p>
                                    <div className="mt-4 flex justify-center p-4 bg-white rounded-lg border">
                                        <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                    </div>
                                </div>

                                <div>
                                    <Label>Secret Key</Label>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        Can't scan? Enter this code manually in your authenticator app
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Input value={secret} readOnly className="font-mono" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copySecret}
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={enable2FA} className="space-y-4">
                                <div>
                                    <Label htmlFor="code">Step 2: Enter Verification Code</Label>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        Enter the 6-digit code from your authenticator app to enable two factor authentication.
                                    </p>
                                    <Input
                                        id="code"
                                        type="text"
                                        maxLength={6}
                                        value={enableForm.data.code}
                                        onChange={(e) => enableForm.setData('code', e.target.value.replace(/\D/g, ''))}
                                        className="mt-2"
                                        placeholder="000000"
                                        autoComplete="one-time-code"
                                    />
                                    <InputError message={enableForm.errors.code} />
                                </div>

                                <Button type="submit" disabled={enableForm.processing}>
                                    {enableForm.processing ? 'Enabling...' : 'Enable Two Factor Authentication'}
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertDescription>
                                    Two factor authentication is currently enabled on your account.
                                </AlertDescription>
                            </Alert>

                            {showRecoveryCodes && recoveryCodes.length > 0 && (
                                <div className="space-y-4">
                                    <div>
                                        <Label>Recovery Codes</Label>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            Store these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
                                        </p>
                                        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                                            {recoveryCodes.map((code, index) => (
                                                <div key={index} className="font-mono text-sm">
                                                    {code}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <form onSubmit={regenerateCodes} className="space-y-4">
                                    <div>
                                        <Label htmlFor="regenerate_password">Current Password</Label>
                                        <Input
                                            id="regenerate_password"
                                            type="password"
                                            value={regenerateForm.data.password}
                                            onChange={(e) => regenerateForm.setData('password', e.target.value)}
                                            className="mt-2"
                                        />
                                        <InputError message={regenerateForm.errors.password} />
                                    </div>
                                    <Button type="submit" variant="outline" disabled={regenerateForm.processing}>
                                        {regenerateForm.processing ? 'Regenerating...' : 'Regenerate Recovery Codes'}
                                    </Button>
                                </form>

                                <form onSubmit={disable2FA} className="space-y-4">
                                    <div>
                                        <Label htmlFor="disable_password">Current Password</Label>
                                        <Input
                                            id="disable_password"
                                            type="password"
                                            value={disableForm.data.password}
                                            onChange={(e) => disableForm.setData('password', e.target.value)}
                                            className="mt-2"
                                        />
                                        <InputError message={disableForm.errors.password} />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={disableForm.processing}
                                    >
                                        {disableForm.processing ? 'Disabling...' : 'Disable Two Factor Authentication'}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

