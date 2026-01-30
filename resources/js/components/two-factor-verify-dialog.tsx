import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

interface TwoFactorVerifyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onVerify: (code: string) => void;
    title?: string;
    description?: string;
    verifyButtonLabel?: string;
    processing?: boolean;
    error?: string | null;
}

export function TwoFactorVerifyDialog({
    open,
    onOpenChange,
    onVerify,
    title = 'Two-Factor Verification',
    description = 'Enter the 6-digit code from your authenticator app to continue.',
    verifyButtonLabel = 'Verify',
    processing = false,
    error = null,
}: TwoFactorVerifyDialogProps) {
    const [code, setCode] = useState('');

    const handleVerify = useCallback(() => {
        const trimmed = code.replace(/\s/g, '');
        if (trimmed.length !== 6 || !/^\d+$/.test(trimmed)) {
            return;
        }
        onVerify(trimmed);
    }, [code, onVerify]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleVerify();
        }
    };

    // Reset code and focus when dialog opens
    useEffect(() => {
        if (open) {
            setCode('');
        }
    }, [open]);

    const isValid = /^\d{0,6}$/.test(code.replace(/\s/g, '')) && code.replace(/\s/g, '').length === 6;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="two-factor-code">Verification code</Label>
                        <Input
                            id="two-factor-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="font-mono text-lg tracking-widest text-center"
                            disabled={processing}
                            aria-invalid={!!error}
                        />
                        {error && (
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleVerify}
                        disabled={!isValid || processing}
                    >
                        {processing ? 'Verifying…' : verifyButtonLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
