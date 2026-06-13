// Mock for expo-router in Storybook/web environment.
// Prevents native RN dependencies (react-native-screens, etc.) from being
// pulled into the Storybook bundle via expo-router imports.
// NOTE: No JSX syntax — file is .ts, not .tsx

// Internal Router type used by the mock
interface MockRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  navigate: (href: string) => void;
  dismiss: (count?: number) => void;
  dismissTo: (href: string) => void;
  dismissAll: () => void;
  canDismiss: () => boolean;
  canGoBack: () => boolean;
  setParams: (params: Record<string, string>) => void;
  reload: () => void;
  prefetch: (href: string) => void;
}

const noop = () => {};
const falseFn = () => false;

export const router: MockRouter = {
  push: noop,
  replace: noop,
  back: noop,
  navigate: noop,
  dismiss: noop,
  dismissTo: noop,
  dismissAll: noop,
  canDismiss: falseFn,
  canGoBack: falseFn,
  setParams: noop,
  reload: noop,
  prefetch: noop,
};

export function useRouter(): MockRouter {
  return router;
}

export function useSegments(): string[] {
  return [];
}

export function usePathname(): string {
  return '/';
}

export function useLocalSearchParams(): Record<string, string> {
  return {};
}

export function useGlobalSearchParams(): Record<string, string> {
  return {};
}

// Stub components — return null, they're only used in layouts not stories
export function Link(): null {
  return null;
}

export function Redirect(): null {
  return null;
}

export function Slot(): null {
  return null;
}

export const Stack = {
  Screen: function ScreenStub(): null {
    return null;
  },
};

export const Tabs = {
  Screen: function ScreenStub(): null {
    return null;
  },
};
