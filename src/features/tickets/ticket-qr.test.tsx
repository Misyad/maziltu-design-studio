import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketQr } from "@/features/tickets/ticket-qr";

const { qrCodeCanvas } = vi.hoisted(() => ({
  qrCodeCanvas: vi.fn(({ value }: { value: string }) => <div data-testid="ticket-qr">{value}</div>),
}));

vi.mock("qrcode.react", () => ({ QRCodeCanvas: qrCodeCanvas }));

describe("TicketQr", () => {
  afterEach(() => cleanup());

  it("encodes exactly the ticket UUID instead of qr_payload or PII", () => {
    const ticket = {
      uuid: "ticket-uuid-only",
      qr_payload: "private-payload",
      participant_name: "Private Person",
    };

    const { container } = render(<TicketQr ticket={ticket} />);

    expect(qrCodeCanvas).toHaveBeenCalled();
    expect(qrCodeCanvas.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ value: "ticket-uuid-only" }),
    );
    expect(container.textContent).toContain("ticket-uuid-only");
    expect(container.textContent).not.toContain("private-payload");
    expect(container.textContent).not.toContain("Private Person");
  });
});
