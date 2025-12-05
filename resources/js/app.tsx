import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { LayoutProvider } from './contexts/LayoutContext';
import { initializeTheme } from './hooks/use-appearance';

// Configure axios to always use current origin (HTTPS)
if (typeof window !== 'undefined') {
    axios.defaults.baseURL = window.location.origin;
}

const appName = import.meta.env.VITE_APP_NAME || 'ESSU HRMS';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Patch Ziggy route helper to always use HTTPS
        if (props.initialPage.props.ziggy) {
            const ziggy = props.initialPage.props.ziggy;
            
            // Force HTTPS for location and URL
            if (ziggy.location && ziggy.location.startsWith('http://')) {
                ziggy.location = ziggy.location.replace('http://', 'https://');
            }
            if (ziggy.url && ziggy.url.startsWith('http://')) {
                ziggy.url = ziggy.url.replace('http://', 'https://');
            }
            
            // Override global route function to force HTTPS
            // @ts-ignore
            global.route = (name: string, params?: any, absolute?: boolean) => {
                const url = ziggyRoute(name, params, absolute, ziggy);
                // Ensure HTTPS
                if (typeof url === 'string' && url.startsWith('http://')) {
                    return url.replace('http://', 'https://');
                }
                return url;
            };
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
