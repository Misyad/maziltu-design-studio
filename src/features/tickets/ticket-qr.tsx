import { QRCodeCanvas } from "qrcode.react";
import type { Ticket } from "@/types/api";

export function TicketQr({ ticket, size = 192 }: { ticket: Pick<Ticket, "uuid">; size?: number }) {
  return (
    <div className="w-fit rounded-2xl border bg-white p-3">
      <QRCodeCanvas value={ticket.uuid} size={size} level="M" includeMargin />
    </div>
  );
}
