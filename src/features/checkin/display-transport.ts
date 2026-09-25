import type { ScannerLookupResult } from "@/types/api";

export const DISPLAY_RESULT_DURATION_MS = 5000;
const DISPLAY_CHANNEL_PREFIX = "mzt-scanner-display:";
const DISPLAY_STORAGE_PREFIX = "mzt.scanner.display.";

export type DisplayStatus = "Check-in Berhasil" | "Registrasi Berhasil";

export interface DisplayParticipant {
  photo: string | null;
  maskedName: string;
  detailLabel: "Niqobah" | "ID Anggota";
  detail: string;
}

export interface DisplaySuccessMessage {
  version: 1;
  type: "success";
  id: string;
  session: string;
  sentAt: number;
  expiresAt: number;
  participant: DisplayParticipant;
  event: string;
  status: DisplayStatus;
}

export interface DisplayIdleMessage {
  version: 1;
  type: "idle";
  id: string;
  session: string;
  sentAt: number;
}

export type ScannerDisplayMessage = DisplaySuccessMessage | DisplayIdleMessage;

function randomId() {
  return globalThis.crypto.randomUUID();
}

export function maskParticipantName(name: string) {
  const masked = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => {
      const characters = Array.from(word);
      return `${characters[0] ?? ""}${"•".repeat(Math.max(1, characters.length - 1))}`;
    })
    .join(" ");
  return masked || "Peserta";
}

export function maskParticipantIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return "—";
  const characters = Array.from(value);
  if (characters.length <= 3)
    return `${"•".repeat(Math.max(1, characters.length - 1))}${characters.at(-1) ?? ""}`;
  return `${"•".repeat(Math.min(6, characters.length - 3))}${characters.slice(-3).join("")}`;
}

export function minimizeParticipantForDisplay(
  result: ScannerLookupResult,
  photo: string | null,
): DisplayParticipant {
  const niqobah = result.participant.niqobah?.trim();
  return {
    photo,
    maskedName: maskParticipantName(result.participant.name),
    detailLabel: niqobah ? "Niqobah" : "ID Anggota",
    detail: niqobah || maskParticipantIdentifier(result.participant.id_anggota),
  };
}

export function createDisplaySuccessMessage(
  session: string,
  result: ScannerLookupResult,
  photo: string | null,
  now = Date.now(),
): DisplaySuccessMessage {
  return {
    version: 1,
    type: "success",
    id: randomId(),
    session,
    sentAt: now,
    expiresAt: now + DISPLAY_RESULT_DURATION_MS,
    participant: minimizeParticipantForDisplay(result, photo),
    event: result.event.event_name,
    status: "Check-in Berhasil",
  };
}

export function createDisplayIdleMessage(session: string, now = Date.now()): DisplayIdleMessage {
  return {
    version: 1,
    type: "idle",
    id: randomId(),
    session,
    sentAt: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  const allowed = new Set(keys);
  return actual.length === keys.length && actual.every((key) => allowed.has(key));
}

function validParticipant(value: unknown): value is DisplayParticipant {
  if (!isRecord(value) || !hasExactKeys(value, ["photo", "maskedName", "detailLabel", "detail"])) {
    return false;
  }
  return (
    (typeof value["photo"] === "string" || value["photo"] === null) &&
    typeof value["maskedName"] === "string" &&
    value["maskedName"].length > 0 &&
    (value["detailLabel"] === "Niqobah" || value["detailLabel"] === "ID Anggota") &&
    typeof value["detail"] === "string" &&
    value["detail"].length > 0
  );
}

export function parseDisplayMessage(value: unknown): ScannerDisplayMessage | null {
  if (!isRecord(value)) return null;
  if (
    value["version"] !== 1 ||
    typeof value["id"] !== "string" ||
    !value["id"] ||
    typeof value["session"] !== "string" ||
    !value["session"] ||
    typeof value["sentAt"] !== "number" ||
    !Number.isFinite(value["sentAt"])
  ) {
    return null;
  }
  if (value["type"] === "idle") {
    return hasExactKeys(value, ["version", "type", "id", "session", "sentAt"])
      ? (value as unknown as DisplayIdleMessage)
      : null;
  }
  if (
    value["type"] !== "success" ||
    !hasExactKeys(value, [
      "version",
      "type",
      "id",
      "session",
      "sentAt",
      "expiresAt",
      "participant",
      "event",
      "status",
    ]) ||
    typeof value["expiresAt"] !== "number" ||
    value["expiresAt"] !== value["sentAt"] + DISPLAY_RESULT_DURATION_MS ||
    !validParticipant(value["participant"]) ||
    typeof value["event"] !== "string" ||
    !value["event"] ||
    (value["status"] !== "Check-in Berhasil" && value["status"] !== "Registrasi Berhasil")
  ) {
    return null;
  }
  return value as unknown as DisplaySuccessMessage;
}

export function createDisplayMessageReceiver(
  session: string,
  onAccepted: (message: ScannerDisplayMessage) => void,
  now = () => Date.now(),
) {
  const seen = new Set<string>();
  let latestSentAt = Number.NEGATIVE_INFINITY;

  return (value: unknown) => {
    const message = parseDisplayMessage(value);
    if (!message || message.session !== session || seen.has(message.id)) return false;
    if (message.sentAt <= latestSentAt) return false;
    if (message.type === "success" && message.expiresAt <= now()) return false;
    seen.add(message.id);
    latestSentAt = message.sentAt;
    onAccepted(message);
    return true;
  };
}

function storageKey(session: string) {
  return `${DISPLAY_STORAGE_PREFIX}${session}`;
}

function channelName(session: string) {
  return `${DISPLAY_CHANNEL_PREFIX}${session}`;
}

export function createDisplayPublisher(session: string) {
  let channel: BroadcastChannel | null = null;
  let lastSentAt = Number.NEGATIVE_INFINITY;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(channelName(session));
    } catch {
      channel = null;
    }
  }

  function nextSentAt(now: number) {
    const sentAt = Math.max(now, lastSentAt + 1);
    lastSentAt = sentAt;
    return sentAt;
  }

  function publish(message: ScannerDisplayMessage) {
    channel?.postMessage(message);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey(session), JSON.stringify(message));
      } catch {
        return;
      }
    }
  }

  return {
    idle(now = Date.now()) {
      const message = createDisplayIdleMessage(session, nextSentAt(now));
      publish(message);
      return message;
    },
    success(result: ScannerLookupResult, photo: string | null, now = Date.now()) {
      const message = createDisplaySuccessMessage(session, result, photo, nextSentAt(now));
      publish(message);
      return message;
    },
    close() {
      channel?.close();
    },
  };
}

export function subscribeToDisplayMessages(session: string, receive: (value: unknown) => void) {
  let channel: BroadcastChannel | null = null;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(session) || !event.newValue) return;
    try {
      receive(JSON.parse(event.newValue));
    } catch {
      return;
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(channelName(session));
        channel.addEventListener("message", (event) => receive(event.data));
      } catch {
        channel = null;
      }
    }
    try {
      const stored = window.localStorage.getItem(storageKey(session));
      if (stored) receive(JSON.parse(stored));
    } catch {
      return () => {
        channel?.close();
        window.removeEventListener("storage", onStorage);
      };
    }
  }

  return () => {
    channel?.close();
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
