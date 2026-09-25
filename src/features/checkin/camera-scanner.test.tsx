import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraScanner } from "@/features/checkin/camera-scanner";

const scannerMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  getCameras: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  success: null as null | ((text: string, result: unknown) => void),
}));

vi.mock("html5-qrcode", () => {
  class Html5Qrcode {
    static getCameras = scannerMock.getCameras;
    isScanning = true;
    start = scannerMock.start.mockImplementation(
      async (_camera, _config, success: (text: string, result: unknown) => void) => {
        scannerMock.success = success;
        return null;
      },
    );
    stop = scannerMock.stop;
    clear = scannerMock.clear;

    constructor(elementId: string, config: unknown) {
      scannerMock.constructor(elementId, config);
    }
  }

  return {
    Html5Qrcode,
    Html5QrcodeSupportedFormats: { QR_CODE: 0, CODE_39: 3, CODE_128: 5 },
  };
});

describe("CameraScanner", () => {
  beforeEach(() => {
    scannerMock.getCameras.mockResolvedValue([
      { id: "rear", label: "Rear camera" },
      { id: "front", label: "Front camera" },
    ]);
    scannerMock.start.mockClear();
    scannerMock.stop.mockResolvedValue(undefined);
    scannerMock.clear.mockReturnValue(undefined);
    scannerMock.success = null;
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => undefined,
    });
  });

  afterEach(() => cleanup());

  it("uses explicit formats, maps decoded format, and stops on accepted decode", async () => {
    const onDecode = vi.fn(() => true);
    render(<CameraScanner onDecode={onDecode} />);

    await userEvent.click(screen.getByRole("button", { name: "Mulai Kamera" }));
    await waitFor(() => expect(scannerMock.start).toHaveBeenCalled());
    expect(scannerMock.constructor).toHaveBeenCalledWith("scanner-reader", {
      verbose: false,
      formatsToSupport: [0, 3, 5],
    });
    expect(scannerMock.start.mock.calls[0]?.[0]).toBe("rear");

    scannerMock.success?.("001234", { result: { format: { format: 5 } } });

    expect(onDecode).toHaveBeenCalledWith("001234", "member_card");
    await waitFor(() => expect(scannerMock.stop).toHaveBeenCalledTimes(1));
    expect(scannerMock.clear).toHaveBeenCalledTimes(1);
  });

  it("restarts and cleans up when the camera changes", async () => {
    const onDecode = vi.fn(() => false);
    const view = render(<CameraScanner onDecode={onDecode} />);

    await userEvent.click(screen.getByRole("button", { name: "Mulai Kamera" }));
    await waitFor(() => expect(scannerMock.start).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("combobox", { name: "Kamera" }));
    fireEvent.click(await screen.findByRole("option", { name: "Front camera" }));

    await waitFor(() => expect(scannerMock.stop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(scannerMock.start).toHaveBeenCalledTimes(2));
    expect(scannerMock.start.mock.calls[1]?.[0]).toBe("front");

    view.unmount();
    await waitFor(() => expect(scannerMock.stop).toHaveBeenCalledTimes(2));
    expect(scannerMock.clear).toHaveBeenCalledTimes(2);
  });

  it("keeps manual scanning available when camera permission is denied", async () => {
    scannerMock.getCameras.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    render(<CameraScanner onDecode={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Mulai Kamera" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Izin kamera ditolak");
    expect(screen.getByRole("button", { name: "Mulai Kamera" })).toBeInTheDocument();
  });
});
