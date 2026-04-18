/// <reference types="vitest/config" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const basePath =
    process.env.BASE_PATH ||
    env.BASE_PATH ||
    (repositoryName ? `/${repositoryName}/` : '/');

  return {
    base: basePath,
    plugins: [react()],
    server: {
      host: true,
      port: 4173
    },
    test: {
      setupFiles: ['./src/test/setup.ts']
    }
  };
});
