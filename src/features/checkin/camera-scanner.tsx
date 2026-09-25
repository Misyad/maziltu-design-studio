import { AlertTriangle, Camera, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAMERA_TIMEOUT_MS,
  cameraErrorMessage,
  cameraSupportError,
  createCameraCleanup,
  identifierTypeForFormat,
  SCANNER_FORMATS,
} from "@/features/checkin/scanner";
import type { ScannerIdentifierType } from "@/types/api";

interface CameraDeviceOption {
  id: string;
  label: string;
}

interface CameraScannerProps {
  onDecode: (identifier: string, identifierType: ScannerIdentifierType) => boolean;
  onStart?: () => void;
}

export function CameraScanner({ onDecode, onStart }: CameraScannerProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDeviceOption[]>([]);
  const [cameraId, setCameraId] = useState("");
  const onDecodeRef = useRef(onDecode);
  const previousCleanupRef = useRef<Promise<void>>(Promise.resolve());
  onDecodeRef.current = onDecode;

  async function activate() {
    setError(null);
    const supportError = cameraSupportError();
    if (supportError) {
      setError(supportError);
      return;
    }
    onStart?.();
    setLoading(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError(
          "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera atau gunakan input manual.",
        );
        return;
      }
      const options = devices.map((device, index) => ({
        id: device.id,
        label: device.label || `Kamera ${index + 1}`,
      }));
      setCameras(options);
      setCameraId((current) =>
        options.some((camera) => camera.id === current) ? current : options[0]!.id,
      );
      setActive(true);
    } catch (cameraError) {
      setError(cameraErrorMessage(cameraError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!active || !cameraId) return;
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cleanup = () => Promise.resolve();

    async function start() {
      await previousCleanupRef.current;
      if (disposed) return;
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        const scanner = new Html5Qrcode("scanner-reader", {
          verbose: false,
          formatsToSupport: SCANNER_FORMATS,
        });
        cleanup = createCameraCleanup(scanner);
        await scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 260, height: 180 } },
          (decodedText, result) => {
            const value = decodedText.trim();
            if (!value) {
              setError(
                "Kode kosong atau tidak valid. Coba pindai ulang atau gunakan input manual.",
              );
              return;
            }
            const identifierType = identifierTypeForFormat(result.result.format?.format);
            if (!identifierType) {
              setError("Format kode tidak didukung. Gunakan QR, Code 39, atau Code 128.");
              return;
            }
            if (onDecodeRef.current(value, identifierType)) setActive(false);
          },
          () => undefined,
        );
        if (disposed) {
          previousCleanupRef.current = cleanup();
          return;
        }
        timeout = setTimeout(() => {
          setError(
            "Waktu pemindaian habis. Arahkan QR/barcode dengan jelas atau gunakan input manual.",
          );
          setActive(false);
        }, CAMERA_TIMEOUT_MS);
      } catch (cameraError) {
        if (!disposed) {
          setError(cameraErrorMessage(cameraError));
          setActive(false);
        }
      }
    }

    const startPromise = start();
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      previousCleanupRef.current = startPromise.then(
        () => cleanup(),
        () => cleanup(),
      );
    };
  }, [active, cameraId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {cameras.length > 1 ? (
          <div className="min-w-52 flex-1 space-y-1.5">
            <label htmlFor="scanner-camera" className="text-sm font-medium">
              Kamera
            </label>
            <Select value={cameraId} onValueChange={setCameraId}>
              <SelectTrigger id="scanner-camera" className="w-full">
                <SelectValue placeholder="Pilih kamera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera.id} value={camera.id}>
                    {camera.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (active) setActive(false);
            else void activate();
          }}
          disabled={loading}
          className="rounded-full"
        >
          {loading ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : active ? (
            <XCircle aria-hidden />
          ) : (
            <Camera aria-hidden />
          )}
          {loading ? "Menyiapkan Kamera" : active ? "Hentikan Kamera" : "Mulai Kamera"}
        </Button>
      </div>

      {active ? (
        <div
          id="scanner-reader"
          data-testid="scanner-reader"
          className="mx-auto aspect-video max-w-md overflow-hidden rounded-2xl border border-border"
        />
      ) : null}

      {error ? (
        <div
          className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      ) : null}
    </div>
  );
}
