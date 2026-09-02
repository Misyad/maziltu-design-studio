import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient, ApiError } from "@/services/api-client";

describe("uploadPayment — participant payment proof", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uploads payment_proof via POST /orders/{uuid}/payment as FormData", async () => {
    const { uploadPayment } = await import("@/services/mzt-api");
    const spy = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, message: "Bukti pembayaran diunggah", data: { id: 1, uuid: "ord-uuid", payment_status: "waiting_verification" } },
    } as never);

    const form = new FormData();
    const file = new File(["fake"], "bukti.jpg", { type: "image/jpeg" });
    form.append("payment_proof", file);

    const res = await uploadPayment("ord-uuid", form);

    expect(spy).toHaveBeenCalledWith("/orders/ord-uuid/payment", form, expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }));
    expect(res.success).toBe(true);
  });

  it("surfaces 422 validation error for invalid file", async () => {
    const { uploadPayment } = await import("@/services/mzt-api");
    const err = new (await import("axios")).AxiosError(
      "Unprocessable",
      "ERR_BAD_REQUEST",
      { headers: {} } as never,
      undefined,
      {
        status: 422,
        statusText: "Unprocessable Entity",
        data: { success: false, message: "bukti pembayaran wajib diunggah", errors: { payment_proof: ["bukti pembayaran wajib diunggah"] } },
        headers: {},
        config: { headers: {} } as never,
      } as never,
    );
    vi.spyOn(apiClient, "post").mockRejectedValue(err);

    const form = new FormData();
    // empty form triggers required validation on backend
    await expect(uploadPayment("ord-uuid", form)).rejects.toMatchObject({ status: 422 });
    try {
      await uploadPayment("ord-uuid", form);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(422);
    }
  });

  it("surfaces 403 when order not owned or not allowed", async () => {
    const { uploadPayment } = await import("@/services/mzt-api");
    const err = new (await import("axios")).AxiosError(
      "Forbidden",
      "ERR_BAD_REQUEST",
      { headers: {} } as never,
      undefined,
      {
        status: 403,
        statusText: "Forbidden",
        data: { success: false, message: "Forbidden" },
        headers: {},
        config: { headers: {} } as never,
      } as never,
    );
    vi.spyOn(apiClient, "post").mockRejectedValue(err);
    const form = new FormData();
    form.append("payment_proof", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    await expect(uploadPayment("ord-uuid", form)).rejects.toMatchObject({ status: 403 });
  });
});
