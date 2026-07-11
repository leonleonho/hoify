import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const settingsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../node_modules/@react-native/gradle-plugin/settings.gradle.kts'
);

const from =
  'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }';
const to =
  'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }';

try {
  const contents = readFileSync(settingsPath, 'utf8');
  if (contents.includes(from)) {
    writeFileSync(settingsPath, contents.replace(from, to));
    console.log('Patched @react-native/gradle-plugin for Gradle 9 compatibility');
  }
} catch {
  // RN layout may change; ignore if the file is missing.
}
