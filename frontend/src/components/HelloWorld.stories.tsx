import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelloWorld } from './HelloWorld';

const meta = {
  title: 'Welcome/HelloWorld',
  component: HelloWorld,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    name: {
      control: 'text',
      description: 'Name to greet',
    },
  },
} satisfies Meta<typeof HelloWorld>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomName: Story = {
  args: {
    name: 'Hoify',
  },
};

export const Empty: Story = {
  args: {
    name: '',
  },
};
