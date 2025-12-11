import { Head, useForm, router } from '@inertiajs/react';
import { LoaderCircle, Mail, RefreshCw } from 'lucide-react';
import { FormEventHandler, useRef, useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

interface Props {
    email: string;
}

export default function VerifyEmailCode({ email }: Props) {
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    // Handle countdown for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Update the code whenever digits change
    useEffect(() => {
        const code = digits.join('');
        setData('code', code);
    }, [digits]);

    const handleDigitChange = (index: number, value: string) => {
        // Only allow single digit
        const digit = value.slice(-1);
        if (digit && !/^\d$/.test(digit)) return;

        const newDigits = [...digits];
        newDigits[index] = digit;
        setDigits(newDigits);

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace - move to previous input
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Handle left arrow
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Handle right arrow
        if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length > 0) {
            const newDigits = [...digits];
            for (let i = 0; i < pastedData.length; i++) {
                newDigits[i] = pastedData[i];
            }
            setDigits(newDigits);
            // Focus the last filled input or the next empty one
            const focusIndex = Math.min(pastedData.length, 5);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (processing || data.code.length !== 6) return;
        post(route('verification.code.verify'));
    };

    const handleResend = () => {
        if (resending || countdown > 0) return;
        setResending(true);
        router.post(route('verification.code.resend'), {}, {
            preserveState: true,
            onFinish: () => {
                setResending(false);
                setCountdown(60); // 60 seconds cooldown
            }
        });
    };

    // Mask email for display
    const maskEmail = (email: string) => {
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) return email;
        return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 2, 5))}${localPart.slice(-1)}@${domain}`;
    };

    return (
        <AuthLayout 
            title="Verify your email" 
            description="Enter the 6-digit code sent to your email"
        >
            <Head title="Verify Email" />
            
            <div className="flex flex-col items-center gap-6">
                {/* Email indicator */}
                <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{maskEmail(email)}</span>
                </div>

                <form className="flex flex-col gap-6 w-full" onSubmit={submit}>
                    {/* 6-digit code input */}
                    <div className="flex justify-center gap-2">
                        {digits.map((digit, index) => (
                            <Input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="w-12 h-14 text-center text-xl font-semibold"
                                disabled={processing}
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    <InputError message={errors.code} className="text-center" />

                    <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={processing || data.code.length !== 6}
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                        Verify & Complete Registration
                    </Button>
                </form>

                {/* Resend code section */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                        Didn't receive the code?
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={resending || countdown > 0}
                    >
                        {resending ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                Sending...
                            </>
                        ) : countdown > 0 ? (
                            <>Resend code in {countdown}s</>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend code
                            </>
                        )}
                    </Button>
                </div>

                {/* Back to registration */}
                <div className="text-center">
                    <a 
                        href={route('register')} 
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        ← Back to registration
                    </a>
                </div>
            </div>
        </AuthLayout>
    );
}

