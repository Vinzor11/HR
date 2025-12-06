<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to force HTTPS for ALL requests - MUST run first! --}}
        <script>
            (function() {
                'use strict';
                
                // Force HTTPS for all fetch requests
                const originalFetch = window.fetch;
                window.fetch = function(input, init) {
                    if (typeof input === 'string' && input.startsWith('http://')) {
                        input = input.replace('http://', 'https://');
                    } else if (input instanceof Request && input.url.startsWith('http://')) {
                        input = new Request(input.url.replace('http://', 'https://'), input);
                    }
                    return originalFetch.call(this, input, init);
                };
                
                // Force HTTPS for all XMLHttpRequest
                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url, ...args) {
                    if (typeof url === 'string' && url.startsWith('http://')) {
                        url = url.replace('http://', 'https://');
                    }
                    return originalOpen.call(this, method, url, ...args);
                };
                
                // Patch route helper as soon as Ziggy loads it
                const patchRoute = function() {
                    if (window.route && typeof window.route === 'function') {
                        const originalRoute = window.route;
                        window.route = function(name, params, absolute) {
                            const url = originalRoute(name, params, absolute);
                            if (typeof url === 'string' && url.startsWith('http://')) {
                                return url.replace('http://', 'https://');
                            }
                            return url;
                        };
                    }
                };
                
                // Try to patch immediately, then on DOMContentLoaded, then with a small delay
                patchRoute();
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', patchRoute);
                }
                setTimeout(patchRoute, 100);
                setTimeout(patchRoute, 500);
            })();
        </script>

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: var(--background, oklch(0.98 0 0));
            }

            html.dark {
                background-color: var(--background, oklch(0.20 0 0));
            }
        </style>

        <title inertia>{{ config('app.name', 'ESSU HRMS') }}</title>

        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Preconnect to external resources for faster loading --}}
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link rel="dns-prefetch" href="https://fonts.bunny.net">
        
        {{-- Preload critical fonts --}}
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
