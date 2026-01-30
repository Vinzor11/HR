import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { route } from 'ziggy-js';

/**
 * Hook for permanent delete flows. User must have 2FA enabled:
 * - If 2FA not enabled: calls on2FARequired (show "enable 2FA" dialog).
 * - If 2FA enabled: shows code dialog, then deletes with two_factor_code.
 */
export function useForceDeleteWith2FA(
    routeName: string,
    options: {
        twoFactorEnabled: boolean;
        onSuccess?: () => void;
        onError?: (message?: string) => void;
        on2FARequired?: () => void;
    }
) {
    const { twoFactorEnabled, onSuccess, onError, on2FARequired } = options;
    const [show2FADialog, setShow2FADialog] = useState(false);
    const [pendingId, setPendingId] = useState<string | number | null>(null);

    const requestForceDelete = useCallback(
        (id: string | number) => {
            if (!twoFactorEnabled) {
                on2FARequired?.();
                return;
            }
            setPendingId(id);
            setShow2FADialog(true);
        },
        [twoFactorEnabled, on2FARequired]
    );

    const handle2FAVerify = useCallback(
        (code: string) => {
            if (pendingId == null) return;
            router.delete(route(routeName, pendingId), {
                data: { two_factor_code: code },
                preserveScroll: true,
                onSuccess: () => {
                    setShow2FADialog(false);
                    setPendingId(null);
                    onSuccess?.();
                },
                onError: (errors) => {
                    onError?.((errors as { two_factor_code?: string })?.two_factor_code);
                },
            });
        },
        [pendingId, routeName, onSuccess, onError]
    );

    const close2FADialog = useCallback(() => {
        setShow2FADialog(false);
        setPendingId(null);
    }, []);

    return {
        show2FADialog,
        setShow2FADialog,
        pendingId,
        requestForceDelete,
        handle2FAVerify,
        close2FADialog,
    };
}
