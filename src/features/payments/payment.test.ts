import { describe, expect, it } from "vitest";
import {
  isTerminalPaymentStatus,
  safePaymenkuUrl,
  shouldPollOrderPayment,
} from "@/features/payments/payment";
import { orderQuery } from "@/services/queries";
import type { Order, PaymentStatus } from "@/types/api";

describe("payment helpers", () => {
  it("accepts only credential-free HTTPS Paymenku hosts", () => {
    expect(safePaymenkuUrl("https://paymenku.com/pay/1")).toBe("https://paymenku.com/pay/1");
    expect(safePaymenkuUrl("https://checkout.paymenku.com/pay/1")).toBe(
      "https://checkout.paymenku.com/pay/1",
    );
    expect(safePaymenkuUrl("http://paymenku.com/pay/1")).toBeNull();
    expect(safePaymenkuUrl("https://paymenku.com.evil.test/pay/1")).toBeNull();
    expect(safePaymenkuUrl("https://user:secret@paymenku.com/pay/1")).toBeNull();
    expect(safePaymenkuUrl("javascript:alert(1)")).toBeNull();
  });

  it("treats only online confirmation states as pollable", () => {
    const terminal: PaymentStatus[] = [
      "paid",
      "rejected",
      "refund",
      "expired",
      "cancelled",
      "failed",
    ];

    expect(isTerminalPaymentStatus("pending")).toBe(false);
    expect(isTerminalPaymentStatus("waiting_verification")).toBe(false);
    expect(shouldPollOrderPayment("pending", "pay_now", 100000)).toBe(true);
    expect(shouldPollOrderPayment("waiting_verification", "pay_now", 100000)).toBe(true);
    expect(shouldPollOrderPayment("pending", "pay_at_venue", 100000)).toBe(false);
    expect(shouldPollOrderPayment("pending", "pay_now", 0)).toBe(false);
    terminal.forEach((status) => {
      expect(isTerminalPaymentStatus(status)).toBe(true);
      expect(shouldPollOrderPayment(status, "pay_now")).toBe(false);
    });
  });

  it("stops the order query interval for terminal gateway statuses", () => {
    const order: Order = {
      id: 1,
      uuid: "order-uuid",
      nomor_order: "ORD-1",
      id_event: 1,
      id_anggota: "001234",
      created_by: 1,
      updated_by: 1,
      event_name: "Multaqo",
      event_price: 100000,
      event_start_at: "2026-09-25",
      total_amount: 100000,
      status_registrasi: "registered",
      payment_status: "pending",
      payment_choice: "pay_now",
      created_at: "2026-09-25T09:00:00Z",
      updated_at: "2026-09-25T09:00:00Z",
    };
    const refetchInterval = orderQuery(order.uuid).refetchInterval;

    expect(typeof refetchInterval).toBe("function");
    if (typeof refetchInterval !== "function") return;

    expect(refetchInterval({ state: { data: order } } as never)).toBe(5_000);
    (["expired", "cancelled", "failed"] as const).forEach((status) => {
      expect(
        refetchInterval({ state: { data: { ...order, payment_status: status } } } as never),
      ).toBe(false);
    });
  });
});
