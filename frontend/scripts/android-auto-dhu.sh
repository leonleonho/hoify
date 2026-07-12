#!/usr/bin/env bash
set -euo pipefail

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
DHU="$SDK/extras/google/auto/desktop-head-unit"
ADB="${SDK}/platform-tools/adb"

if [[ ! -x "$DHU" ]]; then
  echo "Desktop Head Unit not found at: $DHU" >&2
  echo "Install it via Android Studio → SDK Manager → SDK Tools → Android Auto Desktop Head Unit Emulator." >&2
  exit 1
fi

if [[ ! -x "$ADB" ]]; then
  ADB="$(command -v adb || true)"
fi
if [[ -z "${ADB}" ]]; then
  echo "adb not found. Is Android platform-tools installed?" >&2
  exit 1
fi

echo "Forwarding Android Auto head unit server (tcp:5277)..."
"$ADB" forward tcp:5277 tcp:5277

echo "Starting Desktop Head Unit..."
# On some Linux desktops DHU needs an explicit SDL video driver.
export SDL_VIDEODRIVER="${SDL_VIDEODRIVER:-x11}"
exec "$DHU" "$@"
