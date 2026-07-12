const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

const META_CAR_APPLICATION = 'com.google.android.gms.car.application';
const AUTOMOTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
  <uses name="media" />
</automotiveApp>
`;

/**
 * Declares Android Auto media support for Expo CNG builds.
 * Writes automotive_app_desc.xml and references it from the app manifest.
 */
function withAndroidAuto(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/xml',
      );
      await fs.mkdir(xmlDir, { recursive: true });
      await fs.writeFile(
        path.join(xmlDir, 'automotive_app_desc.xml'),
        AUTOMOTIVE_XML,
        'utf8',
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      META_CAR_APPLICATION,
      '@xml/automotive_app_desc',
      'resource',
    );
    return cfg;
  });

  return config;
}

module.exports = withAndroidAuto;
