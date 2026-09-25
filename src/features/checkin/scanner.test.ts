import { Html5QrcodeSupportedFormats } from "html5-qrcode";
import { describe, expect, it, vi } from "vitest";
import {
  cameraErrorMessage,
  createCameraCleanup,
  createLookupGate,
  identifierTypeForFormat,
  SCANNER_FORMATS,
} from "@/features/checkin/scanner";

describe("scanner helpers", () => {
  it("configures only QR, Code 39, and Code 128", () => {
    expect(SCANNER_FORMATS).toEqual([
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_128,
    ]);
  });

  it("maps QR to ticket and Code 39/128 to member card", () => {
    expect(identifierTypeForFormat(Html5QrcodeSupportedFormats.QR_CODE)).toBe("ticket");
    expect(identifierTypeForFormat(Html5QrcodeSupportedFormats.CODE_39)).toBe("member_card");
    expect(identifierTypeForFormat(Html5QrcodeSupportedFormats.CODE_128)).toBe("member_card");
    expect(identifierTypeForFormat(Html5QrcodeSupportedFormats.EAN_13)).toBeNull();
  });

  it("locks synchronously and suppresses the same value during cooldown", () => {
    let now = 1000;
    const gate = createLookupGate(1500, () => now);

    expect(gate.tryStart("00123", "member_card")).toBe(true);
    expect(gate.tryStart("00123", "member_card")).toBe(false);
    gate.finish();
    expect(gate.tryStart("00123", "member_card")).toBe(false);
    expect(gate.tryStart("00123", "ticket")).toBe(true);
    gate.finish();
    now += 1500;
    expect(gate.tryStart("00123", "member_card")).toBe(true);
  });

  it("stops and clears a scanner exactly once", async () => {
    const scanner = {
      isScanning: true,
      stop: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    };
    const cleanup = createCameraCleanup(scanner);

    await Promise.all([cleanup(), cleanup()]);

    expect(scanner.stop).toHaveBeenCalledTimes(1);
    expect(scanner.clear).toHaveBeenCalledTimes(1);
  });

  it("returns actionable camera errors", () => {
    expect(cameraErrorMessage(new DOMException("denied", "NotAllowedError"))).toMatch(
      /Izin kamera ditolak/,
    );
    expect(cameraErrorMessage(new DOMException("missing", "NotFoundError"))).toMatch(
      /Kamera tidak ditemukan/,
    );
    expect(cameraErrorMessage(new DOMException("busy", "NotReadableError"))).toMatch(
      /tidak kompatibel/,
    );
  });
});
