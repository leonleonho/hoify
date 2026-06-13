import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';

import { LoginDocument } from '@/hooks/generated';
import type { LoginMutation } from '@/hooks/generated';
import { LoginScreen } from './LoginScreen';

// ── expo-router mock ──────────────────────────────────────────────
const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  }),
}));

// ── test data ─────────────────────────────────────────────────────

const validVars = { email: 'a@b.com', password: 'secret123' };

const successData: LoginMutation = {
  login: {
    token: 'mock-token',
    user: {
      id: '1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      role: 'user',
    },
  },
};

// ── helpers ───────────────────────────────────────────────────────

function renderLogin(mocks: any[] = []) {
  return render(
    <MockedProvider mocks={mocks} >
      <LoginScreen />
    </MockedProvider>,
  );
}

async function fillAndSubmit(email = 'a@b.com', password = 'secret123') {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  await user.type(screen.getByPlaceholderText('Enter your password'), password);
  await user.click(screen.getByRole('button', { name: /log in/i }));
}

// ── tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

it('renders brand, tagline, inputs and login button', () => {
  renderLogin();

  expect(screen.getByText('Hoify')).toBeInTheDocument();
  expect(screen.getByText('Your music, your vibe')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  expect(screen.getByText('Sign Up')).toBeInTheDocument();
});

it('shows validation error when email is empty', async () => {
  renderLogin();
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(
    screen.getByText('Please enter your email and password.'),
  ).toBeInTheDocument();
});

it('shows validation error when password is empty', async () => {
  renderLogin();
  const user = userEvent.setup();

  await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(
    screen.getByText('Please enter your email and password.'),
  ).toBeInTheDocument();
});

it('clears local validation error when user retries submit', async () => {
  renderLogin();
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: /log in/i }));
  expect(
    screen.getByText('Please enter your email and password.'),
  ).toBeInTheDocument();

  // Fill fields and retry — error should clear
  await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
  await user.type(screen.getByPlaceholderText('Enter your password'), 'x');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(
    screen.queryByText('Please enter your email and password.'),
  ).not.toBeInTheDocument();
});

it('shows loading state on button while mutation is in flight', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: successData },
      delay: 50_000, // long enough to observe loading
    },
  ];

  renderLogin(mocks);

  // Click login — loading renders ActivityIndicator, button is disabled
  fillAndSubmit();

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
  });
});

it('navigates to home on successful login', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: successData },
    },
  ];

  renderLogin(mocks);
  await fillAndSubmit();

  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

it('shows error message when auth call fails with GraphQL error', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      error: new Error('Invalid email or password'),
    },
  ];

  renderLogin(mocks);
  await fillAndSubmit();

  await waitFor(() => {
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });
});

it('shows generic error when auth call fails', async () => {
  // No matching mock → Apollo reports the error via its error state
  renderLogin([]);
  await fillAndSubmit();

  await waitFor(() => {
    // Error text appears — we don't care about the exact message, just that
    // the error area is populated (the message comes from Apollo internals
    // when no mock matches)
    expect(
      screen.getByText(/No more mocked responses/i),
    ).toBeInTheDocument();
  });
});

it('does not navigate when login returns no data', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: { login: null } },
    },
  ];

  renderLogin(mocks);
  await fillAndSubmit();

  await new Promise((r) => setTimeout(r, 50));

  expect(mockReplace).not.toHaveBeenCalled();
});

it('disables inputs while mutation is in flight', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: successData },
      delay: 50_000,
    },
  ];

  renderLogin(mocks);
  fillAndSubmit();

  await waitFor(() => {
    // RNW 0.21 uses readonly (not disabled) when editable={false}
    expect(screen.getByPlaceholderText('you@example.com')).toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText('Enter your password')).toHaveAttribute('readonly');
  });
});

it('shows ActivityIndicator while mutation is in flight', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: successData },
      delay: 50_000,
    },
  ];

  renderLogin(mocks);
  fillAndSubmit();

  await waitFor(() => {
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

it('clears Apollo error and navigates on successful retry', async () => {
  const mocks = [
    {
      request: { query: LoginDocument, variables: validVars },
      error: new Error('Invalid credentials'),
    },
    {
      request: { query: LoginDocument, variables: validVars },
      result: { data: successData },
    },
  ];

  renderLogin(mocks);
  const user = userEvent.setup();

  await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
  await user.type(screen.getByPlaceholderText('Enter your password'), 'secret123');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  // Second attempt — should succeed
  await user.click(screen.getByRole('button', { name: /log in/i }));

  await waitFor(() => {
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
  });
  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
