import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  css: {
    preprocessorOptions: {
      scss: {
        // Ẩn cảnh báo deprecation của Sass phát sinh từ mã nguồn Bootstrap
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
});
