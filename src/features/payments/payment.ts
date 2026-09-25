import type { PaymentStatus } from "@/types/api";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Menunggu pembayaran",
  waiting_verification: "Menunggu verifikasi",
  paid: "Lunas",
  rejected: "Ditolak",
  refund: "Refund",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
};

const TERMINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "paid",
  "rejected",
  "refund",
  "expired",
  "cancelled",
  "failed",
]);

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.has(status);
}

export function shouldPollOrderPayment(
  status: PaymentStatus,
  paymentChoice?: "pay_now" | "pay_at_venue",
  totalAmount?: number | string,
): boolean {
  const amount = totalAmount === undefined ? undefined : Number(totalAmount);
  const requiresPayment = amount === undefined || !Number.isFinite(amount) || amount > 0;
  return paymentChoice === "pay_now" && requiresPayment && !isTerminalPaymentStatus(status);
}

export function safePaymenkuUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.username || url.password) return null;

    const hostname = url.hostname.toLowerCase();
    const isPaymenku = hostname === "paymenku.com" || hostname.endsWith(".paymenku.com");
    if (url.protocol === "https:" && isPaymenku) return url.href;

    if (
      import.meta.env.DEV &&
      url.protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]")
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}
