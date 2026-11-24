import { defineConfig } from 'vite';

// base './' => the build in dist/ works from any static host / sub-folder
export default defineConfig({ base: './', build: { assetsInlineLimit: 0 } });
