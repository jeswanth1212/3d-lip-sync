import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: './',
    base: '/',
    publicDir: 'public',
    server: {
        port: 5173,
        open: true,
        cors: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')
            }
        }
    },
    optimizeDeps: {
        include: ['three', 'tone']
    },
    resolve: {
        alias: {
            'three': path.resolve(__dirname, 'node_modules/three'),
            '@': path.resolve(__dirname, 'src')
        }
    }
}); 