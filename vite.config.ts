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
    build: {
        // Enable code splitting and chunk optimization
        rollupOptions: {
            output: {
                // Manual chunk splitting for better caching and parallel loading
                manualChunks: (id) => {
                    // Split node_modules into separate chunks
                    if (id.includes('node_modules')) {
                        // CRITICAL: Keep React and React-DOM together to prevent "useLayoutEffect" errors
                        if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                            return 'react-vendor';
                        }
                        // Large libraries get their own chunks
                        if (id.includes('lucide-react')) {
                            return 'lucide-icons';
                        }
                        if (id.includes('@radix-ui') || id.includes('@headlessui')) {
                            return 'ui-vendor';
                        }
                        if (id.includes('axios') || id.includes('@inertiajs')) {
                            return 'http-vendor';
                        }
                        // Other node_modules
                        return 'vendor';
                    }
                },
                // Optimize chunk file names for better caching
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
            },
        },
        // Increase chunk size warning limit (we're intentionally creating larger chunks for better caching)
        chunkSizeWarningLimit: 1000,
        // Enable minification
        minify: 'esbuild',
        // Enable source maps in production for debugging (optional, can disable for smaller files)
        sourcemap: false,
        // Optimize CSS
        cssCodeSplit: true,
        // Target modern browsers for smaller bundles
        target: 'es2015',
        // Common chunk strategy to ensure React is shared properly
        commonjsOptions: {
            include: [/node_modules/],
        },
    },
    esbuild: {
        jsx: 'automatic',
        // Drop console and debugger in production
        drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', '@inertiajs/react'],
    },
});
