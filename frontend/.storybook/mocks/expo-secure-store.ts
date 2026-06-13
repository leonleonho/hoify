// Mock for expo-secure-store in Storybook/web environment.
// Native module unavailable — no-ops that satisfy the hook API.

export async function getItemAsync(_key: string): Promise<string | null> {
  return null;
}

export async function setItemAsync(
  _key: string,
  _value: string,
): Promise<void> {
  /* no-op */
}

export async function deleteItemAsync(_key: string): Promise<void> {
  /* no-op */
}
