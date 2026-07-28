import { Platform } from 'react-native';

export function isOfflineSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
