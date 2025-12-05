import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { networkInterfaces } from 'node:os';

// Function to get local IP address for HMR
function getLocalIP(): string {
    // Allow override via environment variable
    if (process.env.VITE_HMR_HOST) {
        return process.env.VITE_HMR_HOST;
    }

    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (!nets) continue;

        for (const net of nets) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }

    // Fallback to localhost if no network interface found
    return 'localhost';
}

const localIP = getLocalIP();

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0', // Allow external connections
        port: 5173,
        strictPort: false,
        cors: true, // Enable CORS for all origins (needed for mobile access)
        hmr: {
            host: localIP, // Automatically detect local IP for mobile HMR
            protocol: 'ws', // WebSocket protocol for HMR
            clientPort: 5173, // Explicitly set the client port
        },
        watch: {
            usePolling: false,
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
});
