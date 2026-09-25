import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerDisplayPage } from "@/features/checkin/scanner-display-page";
import {
  createDisplayIdleMessage,
  createDisplayMessageReceiver,
  createDisplayPublisher,
  createDisplaySuccessMessage,
  DISPLAY_RESULT_DURATION_MS,
  maskParticipantName,
} from "@/features/checkin/display-transport";
import type { ScannerLookupResult } from "@/types/api";

const participant: ScannerLookupResult = {
  ticket: { id: 1, uuid: "ticket-secret", nomor_ticket: "T-001", status: "issued" },
  participant: {
    id: 2,
    id_anggota: "00123456",
    name: "Ahmad Fulan",
    foto: "people/ahmad.jpg",
    niqobah: "Malang",
  },
  event: { id_event: 3, event_name: "Silaturahmi" },
  payment: {
    choice: "pay_at_venue",
    status: "pending",
    amount: 25000,
    source: null,
    paid_at: null,
  },
  attendance: { status: "not_present", scanned_at: null, scanned_by: null, gate: null },
};

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  posted: unknown[] = [];
  listener: ((event: MessageEvent) => void) | null = null;

  constructor(public name: string) {
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(value: unknown) {
    this.posted.push(value);
    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name) {
        instance.listener?.(new MessageEvent("message", { data: value }));
      }
    }
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listener = listener;
  }

  close() {
    this.listener = null;
  }
}

describe("scanner display transport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T10:00:00Z"));
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("masks full names and emits only a minimized payload", () => {
    expect(maskParticipantName("Ahmad Fulan")).toBe("A•••• F••••");

    const message = createDisplaySuccessMessage(
      "session-1",
      participant,
      "https://example.test/photo.jpg",
      Date.now(),
    );
    const serialized = JSON.stringify(message);

    expect(message.expiresAt - message.sentAt).toBe(DISPLAY_RESULT_DURATION_MS);
    expect(message.status).toBe("Check-in Berhasil");
    expect(serialized).not.toContain("Ahmad Fulan");
    expect(serialized).not.toContain("ticket-secret");
    expect(serialized).not.toContain("T-001");
    expect(serialized).not.toContain("00123456");
    expect(serialized).not.toContain("25000");
    expect(serialized).not.toContain("scanned_by");
  });

  it("rejects malformed, wrong-session, stale, expired, and duplicate messages", () => {
    const accepted: string[] = [];
    const receive = createDisplayMessageReceiver(
      "session-1",
      (message) => accepted.push(message.id),
      () => Date.now(),
    );
    const first = createDisplaySuccessMessage("session-1", participant, null, Date.now());
    const stale = { ...createDisplayIdleMessage("session-1", Date.now() - 1), id: "stale" };
    const expired = createDisplaySuccessMessage(
      "session-1",
      participant,
      null,
      Date.now() - DISPLAY_RESULT_DURATION_MS,
    );

    expect(receive({ type: "success" })).toBe(false);
    expect(receive({ ...first, session: "other" })).toBe(false);
    expect(receive(first)).toBe(true);
    expect(receive(first)).toBe(false);
    expect(receive(stale)).toBe(false);
    expect(receive(expired)).toBe(false);
    expect(accepted).toEqual([first.id]);
  });

  it("shows only explicit success publications and expires at exactly 5000ms", () => {
    render(<ScannerDisplayPage session="session-1" />);
    expect(screen.getByText("Siap Menerima Peserta")).toBeInTheDocument();
    expect(screen.queryByText("Mulai Kamera")).not.toBeInTheDocument();
    expect(screen.queryByText("Cari Peserta")).not.toBeInTheDocument();
    expect(screen.queryByText("Ahmad Fulan")).not.toBeInTheDocument();

    const publisher = createDisplayPublisher("session-1");
    act(() => {
      publisher.success(participant, "https://example.test/photo.jpg", Date.now());
    });

    expect(screen.getByText("Check-in Berhasil")).toBeInTheDocument();
    expect(screen.getByText("A•••• F••••")).toBeInTheDocument();
    expect(screen.queryByText("Ahmad Fulan")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText("Check-in Berhasil")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Siap Menerima Peserta")).toBeInTheDocument();

    publisher.close();
  });

  it("idle and a replacement result clear prior display state and timers", () => {
    render(<ScannerDisplayPage session="session-1" />);
    const publisher = createDisplayPublisher("session-1");

    act(() => {
      publisher.success(participant, null, Date.now());
    });
    expect(screen.getByText("A•••• F••••")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
      publisher.idle(Date.now());
    });
    expect(screen.getByText("Siap Menerima Peserta")).toBeInTheDocument();

    act(() => {
      publisher.success(
        { ...participant, participant: { ...participant.participant, name: "Budi Santoso" } },
        null,
        Date.now(),
      );
    });
    expect(screen.getByText("B••• S••••••")).toBeInTheDocument();
    expect(screen.queryByText("A•••• F••••")).not.toBeInTheDocument();

    publisher.close();
  });
});
