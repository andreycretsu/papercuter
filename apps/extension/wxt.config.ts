import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: 'public',
  manifest: {
    name: 'Papercuts',
    description: 'Capture a selected area of the screen and create a papercut',
    permissions: ['activeTab', 'tabs', 'storage', 'windows'],
    // Needed so the content script can run on normal pages (for the area selector).
    host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      capture_papercut: {
        suggested_key: {
          default: 'Ctrl+S',
          mac: 'Command+S',
        },
        description: 'Capture a papercut',
      },
    },
  },
});
