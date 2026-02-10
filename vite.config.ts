import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Obligatorio: permite conexiones externas
    port: 8080,      // Obligatorio: puerto que exige Firebase
    strictPort: true // Obligatorio: para que no intente usar otro puerto
  },
  preview: {
    host: '0.0.0.0',
    port: 8080
  }
});
