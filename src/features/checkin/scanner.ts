import type { Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { ScannerIdentifierType } from "@/types/api";

const QR_CODE_FORMAT = 0 as Html5QrcodeSupportedFormats;
const CODE_39_FORMAT = 3 as Html5QrcodeSupportedFormats;
const CODE_128_FORMAT = 5 as Html5QrcodeSupportedFormats;

export const SCANNER_FORMATS = [QR_CODE_FORMAT, CODE_39_FORMAT, CODE_128_FORMAT];

export const CAMERA_TIMEOUT_MS = 30000;
export const LOOKUP_COOLDOWN_MS = 1500;

export function identifierTypeForFormat(
  format: Html5QrcodeSupportedFormats | string | undefined,
): ScannerIdentifierType | null {
  if (format === QR_CODE_FORMAT || format === "QR_CODE" || format === "QR CODE") {
    return "ticket";
  }
  if (
    format === CODE_39_FORMAT ||
    format === CODE_128_FORMAT ||
    format === "CODE_39" ||
    format === "CODE_128" ||
    format === "CODE 39" ||
    format === "CODE 128"
  ) {
    return "member_card";
  }
  return null;
}

export function createLookupGate(cooldownMs = LOOKUP_COOLDOWN_MS, now = () => Date.now()) {
  let inFlight = false;
  let lastKey = "";
  let lastStartedAt = Number.NEGATIVE_INFINITY;

  return {
    tryStart(identifier: string, identifierType: ScannerIdentifierType) {
      const value = identifier.trim();
      if (!value || inFlight) return false;
      const key = `${identifierType}\u0000${value}`;
      const startedAt = now();
      if (key === lastKey && startedAt - lastStartedAt < cooldownMs) return false;
      inFlight = true;
      lastKey = key;
      lastStartedAt = startedAt;
      return true;
    },
    finish() {
      inFlight = false;
    },
    reset() {
      inFlight = false;
      lastKey = "";
      lastStartedAt = Number.NEGATIVE_INFINITY;
    },
  };
}

export interface CameraScannerController {
  isScanning?: boolean;
  stop: () => Promise<void>;
  clear: () => Promise<void> | void;
}

async function ignoreCameraFailure(action: () => Promise<void> | void) {
  try {
    await action();
  } catch {
    return;
  }
}

export function createCameraCleanup(scanner: CameraScannerController) {
  let cleanup: Promise<void> | null = null;
  return () => {
    if (!cleanup) {
      cleanup = (async () => {
        if (scanner.isScanning !== false) await ignoreCameraFailure(() => scanner.stop());
        await ignoreCameraFailure(() => scanner.clear());
      })();
    }
    return cleanup;
  };
}

export function cameraSupportError() {
  if (typeof window === "undefined") return "Kamera hanya dapat digunakan di browser.";
  if (!window.isSecureContext) {
    return "Kamera memerlukan koneksi HTTPS yang aman. Gunakan input manual.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Browser atau perangkat tidak kompatibel dengan kamera. Gunakan input manual.";
  }
  return null;
}

export function cameraErrorMessage(error: unknown) {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();
  if (text.includes("permission") || text.includes("notallowed") || text.includes("denied")) {
    return "Izin kamera ditolak. Izinkan kamera di pengaturan browser atau gunakan input manual.";
  }
  if (text.includes("notfound") || text.includes("devicesnotfound") || text.includes("no camera")) {
    return "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera atau gunakan input manual.";
  }
  if (
    text.includes("notsupported") ||
    text.includes("notreadable") ||
    text.includes("overconstrained") ||
    text.includes("secure") ||
    text.includes("support")
  ) {
    return "Browser atau perangkat tidak kompatibel dengan kamera. Gunakan input manual.";
  }
  return "Kamera belum dapat digunakan. Coba lagi atau gunakan input manual.";
}
