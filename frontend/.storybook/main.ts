import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { StorybookConfig } from '@storybook/react-vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': resolve(__dirname, '../src'),
          'expo-router': resolve(__dirname, 'mocks/expo-router.ts'),
          'expo-secure-store': resolve(__dirname, 'mocks/expo-secure-store.ts'),
          'react-native': 'react-native-web',
          'react-native/Libraries/Animated/src/animations/SpringAnimation':
            'react-native-web/dist/cjs/exports/Animated/SpringAnimation',
          'react-native/Libraries/Animated/src/animations/TimingAnimation':
            'react-native-web/dist/cjs/exports/Animated/TimingAnimation',
          'react-native/Libraries/Animated/src/SpringConfig':
            'react-native-web/dist/cjs/exports/Animated/SpringConfig',
          'react-native/Libraries/Image/AssetRegistry':
            'react-native-web/dist/cjs/modules/AssetRegistry',
        },
      },
      define: {
        ...config.define,
        __DEV__: 'true',
      },
    };
  },
};
export default config;