import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { LayoutProvider } from './contexts/LayoutContext';
import { initializeTheme } from './hooks/use-appearance';
import { ModalCleanup } from './components/ModalCleanup';

// URL normalization utilities
if (typeof window !== 'undefined') {
    const isProduction = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
    const isHttps = window.location.protocol === 'https:';
    const shouldForceHttps = isProduction || isHttps;
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.port === '8000';

    /**
     * Normalize URL protocol based on environment
     */
    const normalizeUrl = (url: string | URL): string | URL => {
                    if (typeof url === 'string') {
            if (shouldForceHttps && url.startsWith('http://')) {
                return url.replace('http://', 'https://');
            } else if (!shouldForceHttps && url.startsWith('https://') && isLocalhost) {
                return url.replace('https://', 'http://');
            }
            return url;
                    } else if (url instanceof URL) {
            if (shouldForceHttps && url.protocol === 'http:') {
                return new URL(url.href.replace('http://', 'https://'));
            } else if (!shouldForceHttps && url.protocol === 'https:' && isLocalhost) {
                return new URL(url.href.replace('https://', 'http://'));
            }
            return url;
        }
        return url;
        };
        
    /**
     * Check if URL is localhost
     */
    const isLocalhostUrl = (url: string): boolean => {
        return url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':8000');
        };
        
    // Configure axios
        axios.defaults.baseURL = window.location.origin;
        
    // Axios interceptor for URL normalization and CSRF token
        axios.interceptors.request.use((config) => {
        // Normalize URLs
            if (config.url && typeof config.url === 'string') {
            config.url = normalizeUrl(config.url) as string;
            }
            if (config.baseURL && typeof config.baseURL === 'string') {
            config.baseURL = normalizeUrl(config.baseURL) as string;
        }

        // Add CSRF token for state-changing requests
            const method = (config.method || 'get').toLowerCase();
            if (['post', 'put', 'patch', 'delete'].includes(method)) {
                if (!config.headers['X-CSRF-TOKEN'] && !config.headers['x-csrf-token']) {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                    (document.cookie.match(/XSRF-TOKEN=([^;]+)/) ? decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)![1]) : null);
                    if (csrfToken) {
                        config.headers['X-CSRF-TOKEN'] = csrfToken;
                    }
                }
            }
            
            return config;
        });
        
    // Patch XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
        const normalizedUrl = normalizeUrl(url);
        return originalXHROpen.call(this, method, normalizedUrl, ...args);
    };

    // Patch fetch
    if (shouldForceHttps) {
        const originalFetch = window.fetch;
        window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            const normalizedInput = normalizeUrl(input as string | URL);
            if (input instanceof Request && typeof normalizedInput === 'string') {
                input = new Request(normalizedInput, input);
            }
            return originalFetch(normalizedInput as RequestInfo | URL, init);
        };
    }
        
    // Patch Inertia router.visit
    const patchRouterVisit = () => {
        if (router && typeof router.visit === 'function' && !(router.visit as any).__patched) {
            const originalVisit = router.visit.bind(router);
            (router.visit as any).__original = originalVisit;
            
                    router.visit = function(url: string | URL, options?: any) {
                const normalizedUrl = normalizeUrl(url);
                        return originalVisit(normalizedUrl, options);
                    };
            
                    (router.visit as any).__patched = true;
        }
    };

    // Try to patch immediately
    try {
        patchRouterVisit();
    } catch (e) {
        // If router isn't available yet, try again after a short delay
        setTimeout(patchRouterVisit, 100);
    }

    // Patch route helper
    const patchRouteHelper = () => {
        if ((window as any).route) {
            const originalRoute = (window as any).route;
            (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                const url = originalRoute(name, params, absolute);
                if (typeof url === 'string') {
                    return normalizeUrl(url) as string;
                }
                return url;
            };
        }
    };

    if ((window as any).route) {
        patchRouteHelper();
    } else {
        window.addEventListener('DOMContentLoaded', patchRouteHelper);
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'ESSU HRMS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Normalize Ziggy routes based on current protocol
        if (props.initialPage.props.ziggy && typeof window !== 'undefined') {
            const ziggy = props.initialPage.props.ziggy;
            const isProduction = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
            const isHttps = window.location.protocol === 'https:';
            const shouldForceHttps = isProduction || isHttps;
            const currentProtocol = window.location.protocol;
            const currentHost = window.location.host;
            
            // Normalize Ziggy base URLs
            if (ziggy.location && typeof ziggy.location === 'string') {
                if (currentProtocol === 'http:' && ziggy.location.startsWith('https://')) {
                    ziggy.location = ziggy.location.replace('https://', 'http://');
                    ziggy.location = ziggy.location.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                } else if (shouldForceHttps && ziggy.location.startsWith('http://')) {
                    ziggy.location = ziggy.location.replace('http://', 'https://');
                }
            }
            
            if (ziggy.url && typeof ziggy.url === 'string') {
                if (currentProtocol === 'http:' && ziggy.url.startsWith('https://')) {
                    ziggy.url = ziggy.url.replace('https://', 'http://');
                    ziggy.url = ziggy.url.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                } else if (shouldForceHttps && ziggy.url.startsWith('http://')) {
                    ziggy.url = ziggy.url.replace('http://', 'https://');
                }
            }
            
            // Override route function
            const originalRoute = (window as any).route;
            if (originalRoute) {
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    let url = originalRoute(name, params, absolute);
                    if (typeof url === 'string') {
                        if (currentProtocol === 'http:' && url.startsWith('https://')) {
                            url = url.replace('https://', 'http://');
                            url = url.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                        } else if (shouldForceHttps && url.startsWith('http://')) {
                            url = url.replace('http://', 'https://');
                        }
                    }
                    return url;
                };
            } else {
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    let url = ziggyRoute(name, params, absolute, ziggy);
                    if (typeof url === 'string') {
                        if (currentProtocol === 'http:' && url.startsWith('https://')) {
                            url = url.replace('https://', 'http://');
                            url = url.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                        } else if (shouldForceHttps && url.startsWith('http://')) {
                            url = url.replace('http://', 'https://');
                        }
                    }
                    return url;
                };
            }
        }

        root.render(
            <LayoutProvider>
                <App {...props} />
                <ModalCleanup />
            </LayoutProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Initialize theme
initializeTheme();
