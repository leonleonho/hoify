import { MockedProvider } from '@apollo/client/testing/react';
import type { Preview } from '@storybook/react-vite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },

  decorators: [
    (Story, { parameters }) => (
      <SafeAreaProvider>
        <MockedProvider mocks={parameters.apolloMocks ?? []}>
          <Story />
        </MockedProvider>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;