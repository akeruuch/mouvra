import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  root:resolve('pages-site'),
  base:'/mouvra/',
  publicDir:resolve('public'),
  resolve:{alias:{'next/link':resolve('pages-site/link.tsx'),'next/navigation':resolve('pages-site/navigation.ts'),'@':resolve('.')}},
  define:{'import.meta.env.VITE_STATIC_PAGES':JSON.stringify('1')},
  plugins:[react()],
  build:{outDir:resolve('dist/pages'),emptyOutDir:true},
});
