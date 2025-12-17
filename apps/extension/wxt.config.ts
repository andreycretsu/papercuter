import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Papercuts',
    description: 'Capture a selected area of the screen and create a papercut',
    permissions: ['activeTab', 'tabs', 'storage'],
    host_permissions: ['http://localhost:*/*'],
    commands: {
      capture_papercut: {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Capture a papercut',
      },
    },
  },
});
