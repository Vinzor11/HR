import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { LayoutProvider } from './contexts/LayoutContext';
import { initializeTheme } from './hooks/use-appearance';

// Force HTTPS for all HTTP requests only in production or when already using HTTPS
if (typeof window !== 'undefined') {
    const isProduction = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
    const isHttps = window.location.protocol === 'https:';
    const shouldForceHttps = isProduction || isHttps;
    
    // Patch router.visit immediately if router is available (for development)
    // This must happen BEFORE any routes are used
    if (!shouldForceHttps) {
        // Wrap in a try-catch in case router isn't available yet
        try {
            if (router && typeof router.visit === 'function') {
                const originalVisit = router.visit.bind(router);
                (router.visit as any).__original = originalVisit;
                router.visit = function(url: string | URL, options?: any) {
                    let normalizedUrl = url;
                    if (typeof url === 'string') {
                        // Convert ANY HTTPS URL to HTTP in development (be very aggressive)
                        // Check for any HTTPS URL on localhost, 127.0.0.1, or any port 8000
                        if (url.startsWith('https://') && (url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':8000'))) {
                            normalizedUrl = url.replace(/^https:\/\//, 'http://');
                            console.log('[DEV] Router (sync): Normalized HTTPS URL:', url, '→', normalizedUrl);
                        }
                    } else if (url instanceof URL) {
                        if (url.protocol === 'https:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.port === '8000')) {
                            normalizedUrl = new URL(url.href.replace('https://', 'http://'));
                            console.log('[DEV] Router (sync): Normalized HTTPS URL object:', url.href, '→', normalizedUrl.href);
                        }
                    }
                    return originalVisit(normalizedUrl, options);
                };
                (router.visit as any).__patched = true;
                console.log('[DEV] Router.visit patched immediately');
            }
        } catch (e) {
            console.warn('[DEV] Could not patch router.visit immediately:', e);
        }
    }
    
    if (shouldForceHttps) {
        // Patch fetch to force HTTPS
        const originalFetch = window.fetch;
        window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            if (typeof input === 'string' && input.startsWith('http://')) {
                input = input.replace('http://', 'https://');
            } else if (input instanceof Request && input.url.startsWith('http://')) {
                input = new Request(input.url.replace('http://', 'https://'), input);
            }
            return originalFetch(input, init);
        };
        
        // Patch XMLHttpRequest to force HTTPS (more comprehensive)
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
            if (typeof url === 'string' && url.startsWith('http://')) {
                url = url.replace('http://', 'https://');
            } else if (url instanceof URL && url.protocol === 'http:') {
                url = new URL(url.href.replace('http://', 'https://'));
            }
            return originalOpen.call(this, method, url, ...args);
        };
        
        // Also patch send to catch any URLs set after open
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body?: any) {
            // Double-check the URL one more time before sending
            if (this.responseURL && this.responseURL.startsWith('http://')) {
                // Can't change responseURL, but we can log it
                console.warn('XHR request to HTTP URL detected:', this.responseURL);
            }
            return originalSend.call(this, body);
        };
        
        // Configure axios to always use current origin (HTTPS)
        axios.defaults.baseURL = window.location.origin;
        
        // Add interceptor to force HTTPS for all axios requests
        axios.interceptors.request.use((config) => {
            if (config.url && typeof config.url === 'string') {
                if (config.url.startsWith('http://')) {
                    config.url = config.url.replace('http://', 'https://');
                }
            }
            if (config.baseURL && typeof config.baseURL === 'string') {
                if (config.baseURL.startsWith('http://')) {
                    config.baseURL = config.baseURL.replace('http://', 'https://');
                }
            }
            return config;
        });
        
        // Patch route helper immediately to force HTTPS
        // This runs before Inertia initializes, so all route() calls will use HTTPS
        const patchRouteHelper = () => {
            if ((window as any).route) {
                const originalRoute = (window as any).route;
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    const url = originalRoute(name, params, absolute);
                    if (typeof url === 'string' && url.startsWith('http://')) {
                        return url.replace('http://', 'https://');
                    }
                    return url;
                };
            }
        };
        
        // Patch immediately if route exists, or wait for DOMContentLoaded
        if ((window as any).route) {
            patchRouteHelper();
        } else {
            window.addEventListener('DOMContentLoaded', patchRouteHelper);
        }
    } else {
        // In development, just configure axios to use current origin (HTTP)
        // Normalize baseURL to ensure HTTP (not HTTPS)
        const currentOrigin = window.location.origin;
        const normalizedOrigin = currentOrigin.startsWith('https://') && (currentOrigin.includes('127.0.0.1') || currentOrigin.includes('localhost'))
            ? currentOrigin.replace('https://', 'http://')
            : currentOrigin;
        axios.defaults.baseURL = normalizedOrigin;
        console.log('[DEV] Axios baseURL set to:', axios.defaults.baseURL);
        
        // Add axios interceptor to normalize any URLs (including relative ones)
        axios.interceptors.request.use((config) => {
            // Normalize baseURL if it's HTTPS
            if (config.baseURL && typeof config.baseURL === 'string') {
                if (config.baseURL.startsWith('https://') && (config.baseURL.includes('127.0.0.1') || config.baseURL.includes('localhost') || config.baseURL.includes(':8000'))) {
                    config.baseURL = config.baseURL.replace(/^https:\/\//, 'http://');
                    console.log('[DEV] Axios: Normalized HTTPS baseURL:', config.baseURL);
                }
            }
            
            // Normalize URL if it's HTTPS
            if (config.url && typeof config.url === 'string') {
                // Check if it's an absolute HTTPS URL
                if (config.url.startsWith('https://') && (config.url.includes('127.0.0.1') || config.url.includes('localhost') || config.url.includes(':8000'))) {
                    config.url = config.url.replace(/^https:\/\//, 'http://');
                    console.log('[DEV] Axios: Normalized HTTPS URL:', config.url);
                }
            }
            
            // Automatically add CSRF token if not already present (for POST/PUT/DELETE requests)
            const method = (config.method || 'get').toLowerCase();
            if (['post', 'put', 'patch', 'delete'].includes(method)) {
                if (!config.headers['X-CSRF-TOKEN'] && !config.headers['x-csrf-token']) {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                                      (document.cookie.match(/XSRF-TOKEN=([^;]+)/) ? decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1]) : null);
                    if (csrfToken) {
                        config.headers['X-CSRF-TOKEN'] = csrfToken;
                    }
                }
            }
            
            return config;
        });
        
        // Patch XMLHttpRequest at the lowest level to catch HTTPS URLs in development
        // This is the most important patch - it catches everything at the lowest level
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
            let normalizedUrl = url;
            if (typeof url === 'string') {
                // Convert ANY HTTPS URL to HTTP if it contains localhost, 127.0.0.1, or port 8000
                if (url.startsWith('https://') && (url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':8000'))) {
                    normalizedUrl = url.replace(/^https:\/\//, 'http://');
                    console.log('[DEV] XHR (LOW-LEVEL): Normalized HTTPS URL:', url, '→', normalizedUrl);
                }
            } else if (url instanceof URL) {
                if (url.protocol === 'https:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.port === '8000')) {
                    normalizedUrl = new URL(url.href.replace('https://', 'http://'));
                    console.log('[DEV] XHR (LOW-LEVEL): Normalized HTTPS URL object:', url.href, '→', normalizedUrl.href);
                }
            }
            return originalXHROpen.call(this, method, normalizedUrl, ...args);
        };
        
        // Patch Inertia router again in setTimeout as fallback (in case router wasn't available earlier)
        setTimeout(() => {
            if (router && typeof router.visit === 'function') {
                // Check if already patched by checking for __patched property
                if (!(router.visit as any).__patched) {
                    const originalVisit = (router.visit as any).__original || router.visit.bind(router);
                    router.visit = function(url: string | URL, options?: any) {
                        let normalizedUrl = url;
                        if (typeof url === 'string') {
                            // Convert ANY HTTPS URL to HTTP in development (be very aggressive)
                            // Check for any HTTPS URL on localhost, 127.0.0.1, or any port 8000
                            if (url.startsWith('https://') && (url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':8000'))) {
                                normalizedUrl = url.replace(/^https:\/\//, 'http://');
                                console.log('[DEV] Router (async): Normalized HTTPS URL:', url, '→', normalizedUrl);
                            }
                        } else if (url instanceof URL) {
                            if (url.protocol === 'https:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.port === '8000')) {
                                normalizedUrl = new URL(url.href.replace('https://', 'http://'));
                                console.log('[DEV] Router (async): Normalized HTTPS URL object:', url.href, '→', normalizedUrl.href);
                            }
                        }
                        return originalVisit(normalizedUrl, options);
                    };
                    (router.visit as any).__patched = true;
                    console.log('[DEV] Router.visit patched in setTimeout');
                }
            }
        }, 100);
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'ESSU HRMS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Patch Ziggy route helper to normalize URLs based on current protocol
        if (props.initialPage.props.ziggy && typeof window !== 'undefined') {
            const ziggy = props.initialPage.props.ziggy;
            const isProduction = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';
            const isHttps = window.location.protocol === 'https:';
            const shouldForceHttps = isProduction || isHttps;
            const currentProtocol = window.location.protocol;
            const currentHost = window.location.host;
            
            // Normalize Ziggy base URLs to match current protocol
            if (ziggy.location && typeof ziggy.location === 'string') {
                if (currentProtocol === 'http:' && ziggy.location.startsWith('https://')) {
                    ziggy.location = ziggy.location.replace('https://', 'http://');
                    // Also replace host if it's 127.0.0.1 or localhost
                    ziggy.location = ziggy.location.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                } else if (shouldForceHttps && ziggy.location.startsWith('http://')) {
                    ziggy.location = ziggy.location.replace('http://', 'https://');
                }
            }
            if (ziggy.url && typeof ziggy.url === 'string') {
                if (currentProtocol === 'http:' && ziggy.url.startsWith('https://')) {
                    ziggy.url = ziggy.url.replace('https://', 'http://');
                    // Also replace host if it's 127.0.0.1 or localhost
                    ziggy.url = ziggy.url.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                } else if (shouldForceHttps && ziggy.url.startsWith('http://')) {
                    ziggy.url = ziggy.url.replace('http://', 'https://');
                }
            }
            
            // Override the route function to normalize URLs
            const originalRoute = (window as any).route;
            if (originalRoute) {
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    let url = originalRoute(name, params, absolute);
                    if (typeof url === 'string') {
                        // In development (HTTP), convert HTTPS to HTTP
                        if (currentProtocol === 'http:' && url.startsWith('https://')) {
                            url = url.replace('https://', 'http://');
                            // Replace host to match current
                            url = url.replace(/https?:\/\/[^\/]+/, `${currentProtocol}//${currentHost}`);
                        } else if (shouldForceHttps && url.startsWith('http://')) {
                            url = url.replace('http://', 'https://');
                        }
                    }
                    return url;
                };
            } else {
                // Fallback: create route function using ziggyRoute directly
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    let url = ziggyRoute(name, params, absolute, ziggy);
                    if (typeof url === 'string') {
                        // In development (HTTP), convert HTTPS to HTTP
                        if (currentProtocol === 'http:' && url.startsWith('https://')) {
                            url = url.replace('https://', 'http://');
                            // Replace host to match current
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
            </LayoutProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
