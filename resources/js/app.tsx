import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { LayoutProvider } from './contexts/LayoutContext';
import { initializeTheme } from './hooks/use-appearance';

// Force HTTPS for all HTTP requests (patches fetch and XMLHttpRequest)
if (typeof window !== 'undefined') {
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
}

const appName = import.meta.env.VITE_APP_NAME || 'ESSU HRMS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Patch Ziggy route helper to always use HTTPS
        if (props.initialPage.props.ziggy && typeof window !== 'undefined') {
            const ziggy = props.initialPage.props.ziggy;
            
            // Force HTTPS for location and URL
            if (ziggy.location && typeof ziggy.location === 'string' && ziggy.location.startsWith('http://')) {
                ziggy.location = ziggy.location.replace('http://', 'https://');
            }
            if (ziggy.url && typeof ziggy.url === 'string' && ziggy.url.startsWith('http://')) {
                ziggy.url = ziggy.url.replace('http://', 'https://');
            }
            
            // Override the route function to force HTTPS
            // Ziggy's @routes directive sets up window.route, so we override it here
            const originalRoute = (window as any).route;
            if (originalRoute) {
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    const url = originalRoute(name, params, absolute);
                    // Ensure HTTPS
                    if (typeof url === 'string' && url.startsWith('http://')) {
                        return url.replace('http://', 'https://');
                    }
                    return url;
                };
            } else {
                // Fallback: create route function using ziggyRoute directly
                (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                    const url = ziggyRoute(name, params, absolute, ziggy);
                    // Ensure HTTPS
                    if (typeof url === 'string' && url.startsWith('http://')) {
                        return url.replace('http://', 'https://');
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
