import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function Welcome() {

    // Dynamic background based on time
    const [backgroundImage, setBackgroundImage] = useState('/images/landing-page.png');

    useEffect(() => {
        const updateBackground = () => {
            const now = new Date();
            const hours = now.getHours();

            // 6:00 AM to 5:59 PM (6 to 17) = daytime
            // 6:00 PM to 5:59 AM (18 to 5) = nighttime
            if (hours >= 6 && hours < 18) {
                setBackgroundImage('/images/landing-page.png');
            } else {
                setBackgroundImage('/images/landing-page-night.png');
            }
        };

        // Set initial background
        updateBackground();

        // Update every minute to check for time changes
        const interval = setInterval(updateBackground, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-cover bg-[center_top] bg-no-repeat text-[#1b1b18] lg:justify-center relative" style={{backgroundImage: `url("${backgroundImage}")`}}>
                <div className="absolute inset-0 bg-white/15 dark:bg-black/10"></div>

                <div className="relative z-10 flex w-full flex-col items-center">
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow pt-12 starting:opacity-0">
                    <main className="w-full max-w-6xl px-6">
                        {/* Main Heading */}
                        <div className="text-center mb-28">
                            {/* ESSU Logo */}
                            <div className="mb-8">
                                <img
                                    src="/images/essu-removebg-preview.png"
                                    alt="Eastern Samar State University"
                                    className="w-32 h-32 lg:w-40 lg:h-40 mx-auto object-contain drop-shadow-xl"
                                />
                            </div>

                            <h1 className="text-4xl lg:text-6xl font-black text-white mb-6 drop-shadow-2xl" style={{textShadow: '0 0 20px rgba(17,141,11,0.8), 0 0 40px rgba(17,141,11,0.6), 2px 2px 4px rgba(17,141,11,0.9)'}}>
                                One platform, many connections.
                            </h1>
                            <p className="text-xl lg:text-2xl text-white font-semibold drop-shadow-xl max-w-4xl mx-auto" style={{textShadow: '0 0 15px rgba(0,0,0,0.8), 1px 1px 3px rgba(0,0,0,0.9)'}}>
                                Discover all the systems linked to our ERP that make your work faster, smarter, and easier.
                            </p>
                        </div>

                        {/* System Cards (alphabetical) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <a
                                href="https://essu-admission.online/login"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Admission System</h3>
                                    <p className="text-white/80 text-sm">Student admission and enrollment</p>
                                </div>
                            </a>

                            <Link
                                href={route('login')}
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Human Resource System</h3>
                                    <p className="text-white/80 text-sm">Employee and HR management</p>
                                </div>
                            </Link>

                            <a
                                href="https://infirmary.great-site.net"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Infirmary System</h3>
                                    <p className="text-white/80 text-sm">Healthcare management and patient care</p>
                                </div>
                            </a>

                            <a
                                href="https://essu-inventory-system.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Inventory System</h3>
                                    <p className="text-white/80 text-sm">Resource management</p>
                                </div>
                            </a>

                            <a
                                href="https://management.fwh.is"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Maintenance System</h3>
                                    <p className="text-white/80 text-sm">Facility and equipment maintenance</p>
                                </div>
                            </a>

                            <a
                                href="https://erp-rms.42web.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-[#118d0b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#0f7a0a] transition-colors">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Research System</h3>
                                    <p className="text-white/80 text-sm">Research management and collaboration</p>
                                </div>
                            </a>
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
                </div>
            </div>
        </>
    );
}
