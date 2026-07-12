# Hoify frontend

Expo / React Native client for Hoify.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Expo Metro |
| `npm run android` | Build and run on a connected Android device / emulator |
| `npm run android:auto` | Forward ADB and launch Android Auto Desktop Head Unit (DHU) |
| `npm run ios` | Build and run on iOS |
| `npm run web` | Start web |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest |

## Android Auto

Hoify exposes **My Playlists** in Android Auto via React Native Track Player. Test with Google’s **Desktop Head Unit (DHU)** against a real phone (recommended) or emulator.

### Prerequisites

1. **Android SDK** with platform-tools (`adb`)
2. **Desktop Head Unit** — Android Studio → SDK Manager → **SDK Tools** → install **Android Auto Desktop Head Unit Emulator**  
   Installed at `$ANDROID_HOME/extras/google/auto/desktop-head-unit` (default SDK path: `~/Android/Sdk`)
3. On Linux, if DHU fails with `libc++.so.1: cannot open shared object file`:

   ```bash
   sudo apt install libc++1 libc++abi1
   ```

4. Phone: install **Android Auto** from Play Store, enable **USB debugging**, and install a debug build of Hoify (`npm run android` with the phone selected)

### Phone setup (each session)

1. Plug the phone into the PC over USB and accept the debugging prompt
2. Open **Android Auto** → scroll to **Version** and tap repeatedly until developer mode unlocks
3. Open the ⋮ menu → **Start head unit server**

### Launch DHU

From `frontend/`:

```bash
npm run android:auto
```

This runs `adb forward tcp:5277 tcp:5277` and starts DHU. Extra flags pass through, e.g.:

```bash
npm run android:auto -- --usb
```

### In the DHU window

1. Open **Hoify**
2. Browse **Playlists** → pick a playlist → play a track
3. Confirm playback and that the phone MiniPlayer follows

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `adb devices` empty | Unlock phone, re-plug USB, `adb kill-server && adb start-server` |
| DHU can’t connect | Ensure **Start head unit server** is on, then re-run `npm run android:auto` |
| No DHU window on Linux | Script sets `SDL_VIDEODRIVER=x11`; override if needed |
| Hoify missing in Auto | Rebuild after prebuild so the Android Auto config plugin is applied: `npx expo prebuild --platform android` then `npm run android` |

Official DHU docs: [Test using the Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu)
