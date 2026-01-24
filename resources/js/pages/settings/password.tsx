import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, CheckCircle2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: '/settings/password',
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        // Prevent double submission
        if (processing) {
            return;
        }

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Update Password
                        </CardTitle>
                        <CardDescription>
                            Ensure your account is using a long, random password to stay secure
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={updatePassword} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="current_password" className="text-sm font-medium">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        value={data.current_password}
                                        onChange={(e) => setData('current_password', e.target.value)}
                                        type="password"
                                        showPasswordToggle
                                        className="h-10 pl-9"
                                        autoComplete="current-password"
                                        placeholder="Enter your current password"
                                    />
                                </div>
                                <InputError message={errors.current_password} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        ref={passwordInput}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        type="password"
                                        showPasswordToggle
                                        className="h-10 pl-9"
                                        autoComplete="new-password"
                                        placeholder="Enter your new password"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation" className="text-sm font-medium">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password_confirmation"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        type="password"
                                        showPasswordToggle
                                        className="h-10 pl-9"
                                        autoComplete="new-password"
                                        placeholder="Confirm your new password"
                                    />
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out duration-300"
                                    enterFrom="opacity-0 translate-x-2"
                                    enterTo="opacity-100 translate-x-0"
                                    leave="transition ease-in-out duration-300"
                                    leaveFrom="opacity-100 translate-x-0"
                                    leaveTo="opacity-0 translate-x-2"
                                >
                                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="font-medium">Password updated successfully</span>
                                    </div>
                                </Transition>
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                                    className="ml-auto"
                                >
                                    {processing ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </SettingsLayout>
        </AppLayout>
    );
}
