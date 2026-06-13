import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Alias shared between storybook & unit test projects
const rnAliases = {
  '@': path.resolve(dirname, 'src'),
  'expo-router': path.resolve(dirname, '.storybook/mocks/expo-router.ts'),
  'react-native': 'react-native-web',
  'react-native/Libraries/Animated/src/animations/SpringAnimation':
    'react-native-web/dist/cjs/exports/Animated/SpringAnimation',
  'react-native/Libraries/Animated/src/animations/TimingAnimation':
    'react-native-web/dist/cjs/exports/Animated/TimingAnimation',
  'react-native/Libraries/Animated/src/SpringConfig':
    'react-native-web/dist/cjs/exports/Animated/SpringConfig',
  'react-native/Libraries/Image/AssetRegistry':
    'react-native-web/dist/cjs/modules/AssetRegistry',
};

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        resolve: {
          alias: rnAliases,
        },
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: [path.resolve(dirname, 'src/test/setup.ts')],
          globals: true,
          css: false,
        },
      },
    ],
  },
});
