import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { buttonVariants } from '@/components/ui/button';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4">
                        {auth.user ? (
                            <Link href={route('dashboard')} className={buttonVariants({ size: 'sm' })}>
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className={buttonVariants({ size: 'sm' })}>
                                    Log in
                                </Link>
                                <Link href={route('register')} className={buttonVariants({ size: 'sm' })}>
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                        <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-[20px] shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
                            <div>
                                <h1 className="mb-4 font-medium text-3xl text-[#118d0b]">VISION</h1>
                                <p className="mb-6 leading-relaxed text-black dark:text-[#EDEDEC]">
                                    A technologically-advanced university producing professionals and competitive leaders for local and national development.
                                </p>
                                <h1 className="mb-4 font-medium text-3xl text-[#118d0b]">MISSION</h1>
                                <p className="leading-relaxed text-black dark:text-[#EDEDEC]">
                                    To provide quality education responsive to the national and global needs focused on generating knowledge and technology that will improve the lives of the people.
                                </p>
                            </div>
                        </div>
                        <div className="relative -mb-px aspect-[335/376] w-full shrink-0 overflow-hidden rounded-t-lg bg-[#fff2f2] lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#1D0002]">
                            <img
                                src="/images/essy.png"
                                alt="Eastern Samar State University"
                                className="w-full h-full object-contain translate-y-0 opacity-100 transition-all duration-750 starting:translate-y-6 starting:opacity-0"
                            />
                            <div className="absolute inset-0 rounded-t-lg shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-t-none lg:rounded-r-lg dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]" />
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}
