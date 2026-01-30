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
import { ShieldCheck } from 'lucide-react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';

interface Require2FAPromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    cancelLabel?: string;
    actionLabel?: string;
}

/**
 * Dialog shown when a user without 2FA tries to use a feature that requires 2FA.
 * Cancel closes the dialog; action redirects to 2FA setup.
 */
export function Require2FAPromptDialog({
    open,
    onOpenChange,
    title = 'Enable Two-Factor Authentication',
    description = 'To use this feature you must enable two-factor authentication (2FA). Some features require 2FA for added protection. You can set it up now in just a few steps.',
    cancelLabel = 'Cancel',
    actionLabel = "Let's go",
}: Require2FAPromptDialogProps) {
    const handleGoTo2FASetup = () => {
        onOpenChange(false);
        router.visit(route('two-factor.show'));
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGoTo2FASetup}>
                        {actionLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
