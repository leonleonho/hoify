export type PickedImage = {
  imageBase64: string;
  mimeType: string;
};

/**
 * Opens the device image library and returns base64 + mimeType
 * suitable for `updateAlbumArt`, or null if the user cancels.
 *
 * ImagePicker is loaded lazily so Expo Router can evaluate edit
 * routes at startup without requiring the native module upfront.
 */
export async function pickAlbumArtImage(): Promise<PickedImage | null> {
  const ImagePicker = await import('expo-image-picker');

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    return null;
  }

  return {
    imageBase64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}
