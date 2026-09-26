import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadFreshModules() {
  vi.resetModules();
  const api = await import("@/services/api-client");
  const mzt = await import("@/services/mzt-api");
  const axiosInstance = (await import("axios")).default;
  return { ...api, ...mzt, axios: axiosInstance };
}

const application = {
  uuid: "application-1",
  name: "Anggota Baru",
  email: "anggota@example.test",
  no_hp: "081234567890",
  alamat: "Jalan Merdeka 1",
  pekerjaan: "Guru",
  niqobah: "Malang",
  tempat_lahir: "Malang",
  tanggal_lahir: "2000-01-02",
  tahun_masuk: "2015",
  tahun_keluar: "2020",
  foto: "applications/anggota.jpg",
  status: "submitted" as const,
};

describe("onboarding API contracts", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("bootstraps CSRF before starting old-account activation", async () => {
    const { apiClient, axios: axiosInstance, checkAccountActivation } = await loadFreshModules();
    const csrf = vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, data: { challenge_token: "challenge-1" } },
    } as never);
    const payload = { name: "Anggota Lama", tanggal_lahir: "2000-01-02" };

    await expect(checkAccountActivation(payload)).resolves.toMatchObject({ success: true });

    expect(csrf).toHaveBeenCalledBefore(post);
    expect(post).toHaveBeenCalledWith("/public/account-activation/check", payload, {});
  });

  it("uses the authenticated account setup sequence", async () => {
    const {
      apiClient,
      axios: axiosInstance,
      setupAccountEmail,
      verifyAccountEmail,
      completeAccountSetup,
    } = await loadFreshModules();
    const csrf = vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true },
    } as never);

    await setupAccountEmail({ email: "anggota@example.test" });
    await verifyAccountEmail({ code: "123456" });
    await completeAccountSetup({
      current_password: "password-sementara",
      password: "password-baru",
      password_confirmation: "password-baru",
    });

    expect(csrf).toHaveBeenCalledOnce();
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/account/setup/email",
      { email: "anggota@example.test" },
      {},
    );
    expect(post).toHaveBeenNthCalledWith(2, "/account/setup/email/verify", { code: "123456" }, {});
    expect(post).toHaveBeenNthCalledWith(
      3,
      "/account/setup/complete",
      {
        current_password: "password-sementara",
        password: "password-baru",
        password_confirmation: "password-baru",
      },
      {},
    );
  });

  it("bootstraps CSRF and posts new applications as multipart form data", async () => {
    const { apiClient, axios: axiosInstance, submitMemberApplication } = await loadFreshModules();
    const csrf = vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, data: { application } },
    } as never);
    const form = new FormData();
    form.append("foto", new File(["photo"], "anggota.jpg", { type: "image/jpeg" }));

    await expect(submitMemberApplication(form)).resolves.toEqual(application);

    expect(csrf).toHaveBeenCalledBefore(post);
    expect(post).toHaveBeenCalledWith(
      "/public/member-applications",
      form,
      expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }),
    );
  });

  it("marks the applicant session lookup as an auth probe", async () => {
    const { apiClient, fetchApplicantMe } = await loadFreshModules();
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { application } },
    } as never);

    await expect(fetchApplicantMe()).resolves.toEqual(application);
    expect(get).toHaveBeenCalledWith("/applicant/me", { authCheck: true });
  });

  it("sends applicant edits as multipart method-spoofed PUT requests", async () => {
    const {
      apiClient,
      axios: axiosInstance,
      updateApplicantApplication,
    } = await loadFreshModules();
    const csrf = vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, data: { application } },
    } as never);
    const form = new FormData();
    form.append("name", application.name);

    await expect(updateApplicantApplication(form)).resolves.toEqual(application);

    expect(form.get("_method")).toBe("PUT");
    expect(csrf).toHaveBeenCalledBefore(post);
    expect(post).toHaveBeenCalledWith(
      "/applicant/application",
      form,
      expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }),
    );
  });

  it("bootstraps CSRF before an admin application transition", async () => {
    const { apiClient, approveMemberApplication, axios: axiosInstance } = await loadFreshModules();
    const csrf = vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({
      data: { success: true, data: { application: { ...application, status: "approved" } } },
    } as never);

    await approveMemberApplication(application.uuid);

    expect(csrf).toHaveBeenCalledBefore(put);
    expect(put).toHaveBeenCalledWith(`/member-applications/${application.uuid}/approve`, undefined);
  });

  it("preserves applicant validation errors as ApiError fields", async () => {
    const {
      apiClient,
      ApiError,
      updateApplicantApplication,
      axios: axiosInstance,
    } = await loadFreshModules();
    vi.spyOn(axiosInstance, "get").mockResolvedValue({ data: {} });
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new axios.AxiosError(
        "Unprocessable",
        "ERR_BAD_REQUEST",
        { headers: {} } as never,
        undefined,
        {
          status: 422,
          statusText: "Unprocessable Entity",
          data: {
            success: false,
            message: "Data tidak valid.",
            errors: { foto: ["Foto harus berupa gambar."] },
          },
          headers: {},
          config: { headers: {} } as never,
        } as never,
      ),
    );

    await expect(updateApplicantApplication(new FormData())).rejects.toMatchObject({
      status: 422,
      errors: { foto: ["Foto harus berupa gambar."] },
    });
    await expect(updateApplicantApplication(new FormData())).rejects.toBeInstanceOf(ApiError);
  });
});
