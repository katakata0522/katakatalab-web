import { existsSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 本番ビルド時のみ厳格な CSP を HTML に差し込む（npm run dev の Vite HMR インラインスクリプトを阻害しないため）
const PROD_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; manifest-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';";

function includeLocalFavicon(): Plugin {
  return {
    name: 'include-local-favicon',
    transformIndexHtml() {
      if (!existsSync(new URL('./public/assets/favicon.svg', import.meta.url))) return [];
      return [
        { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: './assets/favicon.svg' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
      ];
    }
  };
}

function injectBuildCsp(): Plugin {
  return {
    name: 'inject-build-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const cspMeta = `    <meta http-equiv="Content-Security-Policy" content="${PROD_CSP}" />`;
      if (!/<meta\s+charset="UTF-8"\s*\/?>/i.test(html)) {
        throw new Error('inject-build-csp: <meta charset="UTF-8" /> が見つかりませんでした');
      }
      return html.replace(/(<meta\s+charset="UTF-8"\s*\/?>)/i, `$1\n${cspMeta}`);
    }
  };
}

export default defineConfig(({ mode }) => {
  const isStandalone = mode === 'standalone';
  return {
    base: './',
    plugins: [react(), tailwindcss(), includeLocalFavicon(), injectBuildCsp()],
    ...(isStandalone ? { define: { 'import.meta': '{}' } } : {}),
    build: {
      outDir: isStandalone ? '.standalone-dist' : 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      modulePreload: isStandalone ? false : true,
      chunkSizeWarningLimit: isStandalone ? 1500 : 500,
      rolldownOptions: {
        output: isStandalone
          ? {
              codeSplitting: false,
              format: 'iife'
            }
          : {
              manualChunks(id: string) {
                if (id.includes('node_modules/react')) {
                  return 'vendor-react';
                }
                if (id.includes('node_modules/lucide-react')) {
                  return 'vendor-icons';
                }
                return undefined;
              }
            }
      }
    }
  };
});
