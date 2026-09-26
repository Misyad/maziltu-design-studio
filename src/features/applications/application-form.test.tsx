import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationForm } from "@/features/applications/application-form";
import { createUuidV4 } from "@/lib/utils";
import type { MemberApplication } from "@/types/api";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nama lengkap"), "Anggota Baru");
  await user.type(screen.getByLabelText("Email"), "anggota@example.test");
  await user.type(screen.getByLabelText("Nomor HP"), "081234567890");
  await user.type(screen.getByLabelText("Pekerjaan"), "Guru");
  await user.type(screen.getByLabelText("Niqobah"), "Malang");
  await user.type(screen.getByLabelText("Tempat lahir"), "Malang");
  await user.type(screen.getByLabelText("Tanggal lahir"), "2000-01-02");
  await user.type(screen.getByLabelText("Tahun masuk"), "2015");
  await user.type(screen.getByLabelText("Tahun keluar"), "2020");
  await user.type(screen.getByLabelText("Alamat"), "Jalan Merdeka 1");
}

describe("createUuidV4", () => {
  it("uses getRandomValues as a UUID v4 fallback when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index));
      return bytes;
    });
    const cryptoApi = { getRandomValues } as unknown as Crypto;

    expect(createUuidV4(cryptoApi)).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});

describe("ApplicationForm", () => {
  afterEach(() => cleanup());

  it("requires a photo for a new application", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ApplicationForm submitLabel="Kirim" pending={false} onSubmit={onSubmit} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByText("Foto wajib diunggah")).toBeInTheDocument();
    expect(screen.getByLabelText("Foto")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts only JPEG and PNG photos up to 5 MiB", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onSubmit = vi.fn();
    render(<ApplicationForm submitLabel="Kirim" pending={false} onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Foto");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png");
    await fillRequiredFields(user);
    await user.upload(input, new File(["not-an-image"], "anggota.gif", { type: "image/gif" }));
    await user.click(screen.getByRole("button", { name: "Kirim" }));
    expect(await screen.findByText("Foto harus berformat JPEG atau PNG")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.upload(
      input,
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "anggota.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Kirim" }));
    expect(await screen.findByText("Ukuran foto maksimal 5 MiB")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    new File(["photo"], "anggota.jpg", { type: "image/jpeg" }),
    new File(["photo"], "anggota.jpg"),
  ])("submits all fields and a valid photo as FormData", async (photo) => {
    const user = userEvent.setup({ applyAccept: false });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ApplicationForm submitLabel="Kirim" pending={false} onSubmit={onSubmit} />);

    await fillRequiredFields(user);
    await user.upload(screen.getByLabelText("Foto"), photo);
    await user.click(screen.getByRole("button", { name: "Kirim" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const form = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(form.get("name")).toBe("Anggota Baru");
    expect(form.has("password")).toBe(false);
    expect(form.has("password_confirmation")).toBe(false);
    expect(form.get("foto")).toBe(photo);
  });

  it("allows an existing application to keep its current photo", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const application: MemberApplication = {
      uuid: "application-1",
      name: "Anggota Lama",
      email: "lama@example.test",
      no_hp: "081234567890",
      alamat: "Jalan Merdeka 1",
      pekerjaan: "Guru",
      niqobah: "Malang",
      tempat_lahir: "Malang",
      tanggal_lahir: "2000-01-02",
      tahun_masuk: "2015-01-01",
      tahun_keluar: "2020-01-01",
      foto: "applications/lama.jpg",
      status: "submitted",
    };
    render(
      <ApplicationForm
        application={application}
        submitLabel="Simpan"
        pending={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Tahun masuk")).toHaveValue("2015");
    expect(screen.getByLabelText("Tahun keluar")).toHaveValue("2020");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const form = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(form.has("foto")).toBe(false);
    expect(form.has("password")).toBe(false);
  });
});
