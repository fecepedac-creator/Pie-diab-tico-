import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // Permite que Firebase vea el contenedor
    port: 8080,            // Puerto obligatorio de App Hosting
    strictPort: true      // Evita que Vite salte a otro puerto
  },
  preview: {
    host: '0.0.0.0',
    port: 8080
  }
});
