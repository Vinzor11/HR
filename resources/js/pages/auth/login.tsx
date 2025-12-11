import { Head, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    hasOAuthRedirect?: boolean;
}

export default function Login({ status, canResetPassword, hasOAuthRedirect }: LoginProps) {
    const { csrf } = usePage().props as { csrf: string };
    const formRef = useRef<HTMLFormElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    // Check for OAuth indicators - use multiple methods to ensure we catch it
    // This ensures we use traditional form submission even if the prop wasn't passed correctly
    const shouldUseTraditionalSubmit = hasOAuthRedirect || 
        (typeof window !== 'undefined' && (
            document.referrer.includes('/oauth/authorize') ||
            window.location.search.includes('oauth') ||
            sessionStorage.getItem('oauth_redirect')
        ));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (processing || isSubmitting) {
            return;
        }
        
        // If there's an OAuth redirect pending, ALWAYS use traditional form submission
        // This prevents CORS issues when redirecting to external OAuth callback URLs
        // Traditional form submission bypasses Inertia entirely, preventing XHR redirect chains
        if (shouldUseTraditionalSubmit && formRef.current) {
            setIsSubmitting(true);
            const form = formRef.current;
            
            // Ensure all form values are properly set in the DOM for traditional submission
            // React controlled components sync values, but we set them explicitly to be safe
            const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
            const passwordInput = form.querySelector<HTMLInputElement>('input[name="password"]');
            const rememberInput = form.querySelector<HTMLInputElement>('input[name="remember"]');
            
            if (emailInput) emailInput.value = data.email;
            if (passwordInput) passwordInput.value = data.password;
            if (rememberInput) rememberInput.checked = data.remember;
            
            // Submit the form directly - this bypasses Inertia completely
            // The server-side HandleExternalRedirects middleware will also handle
            // any redirects to /oauth/authorize by converting them to full page redirects
            form.submit();
            return;
        }
        
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Log in to your account" description="Enter your email and password below to log in">
            <Head title="Log in" />

            <form 
                ref={formRef}
                className="flex flex-col gap-6" 
                onSubmit={submit}
                method="POST"
                action={route('login')}
            >
                {/* CSRF token for traditional form submission */}
                <input type="hidden" name="_token" value={csrf} />
                
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onClick={() => setData('remember', !data.remember)}
                            tabIndex={3}
                        />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing || isSubmitting}>
                        {(processing || isSubmitting) && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Log in
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Don't have an account?{' '}
                    <TextLink href={route('register')} tabIndex={5}>
                        Sign up
                    </TextLink>
                </div>
            </form>

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}
        </AuthLayout>
    );
}
