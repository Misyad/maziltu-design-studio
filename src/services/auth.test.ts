import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError as ApiErrorType } from "@/services/api-client";

const LEGACY_TOKEN_KEY = "mzt.token";

function axiosError(
  status: number,
  config?: Record<string, unknown>,
  data: Record<string, unknown> = { success: false, message: "Unauthenticated." },
) {
  return new axios.AxiosError(
    String(data["message"] ?? "Request failed"),
    "ERR_BAD_REQUEST",
    { headers: {}, ...config } as never,
    undefined,
    {
      status,
      statusText: "Request failed",
      data,
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

async function loadFreshModules() {
  vi.resetModules();
  const apiClient = (await import("@/services/api-client")).apiClient;
  const ApiError = (await import("@/services/api-client")).ApiError;
  const ensureCsrfToken = (await import("@/services/api-client")).ensureCsrfToken;
  const IS_SERVER = (await import("@/services/api-client")).IS_SERVER;
  const memberAccountActivationEnabled = (await import("@/services/api-client"))
    .memberAccountActivationEnabled;
  const memberApplicationsEnabled = (await import("@/services/api-client"))
    .memberApplicationsEnabled;
  const mzt = await import("@/services/mzt-api");
  // Same axios instance the freshly loaded modules closed over.
  const axiosInstance = (await import("axios")).default;
  return {
    apiClient,
    ApiError,
    ensureCsrfToken,
    IS_SERVER,
    memberAccountActivationEnabled,
    memberApplicationsEnabled,
    axios: axiosInstance,
    ...mzt,
  };
}

/** Capture everything the real XHR adapter hands to setRequestHeader(). */
function captureXhrHeaders() {
  const captured: Record<string, string> = {};
  const original = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    captured[name] = value;
    return original.call(this, name, value);
  };
  return {
    captured,
    restore() {
      XMLHttpRequest.prototype.setRequestHeader = original;
    },
  };
}

/** jsdom forbids spying on location methods — replace the whole location object. */
function stubLocation(pathname = "/dashboard") {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    value: { pathname, assign },
    writable: true,
    configurable: true,
  });
  return assign;
}

describe("R3 browser auth — no personal access token persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("keeps onboarding entry points disabled unless explicitly enabled", async () => {
    vi.stubEnv("VITE_MEMBER_ACCOUNT_ACTIVATION_ENABLED", "false");
    vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", "false");
    const { memberAccountActivationEnabled, memberApplicationsEnabled } = await loadFreshModules();

    expect(memberAccountActivationEnabled()).toBe(false);
    expect(memberApplicationsEnabled()).toBe(false);
  });

  it("keeps member applications disabled when the flag is absent", async () => {
    const env = import.meta.env as Record<string, string | boolean | undefined>;
    const previous = env["VITE_MEMBER_APPLICATIONS_ENABLED"];
    delete env["VITE_MEMBER_APPLICATIONS_ENABLED"];

    try {
      const { memberApplicationsEnabled } = await loadFreshModules();
      expect(memberApplicationsEnabled()).toBe(false);
    } finally {
      if (previous === undefined) delete env["VITE_MEMBER_APPLICATIONS_ENABLED"];
      else env["VITE_MEMBER_APPLICATIONS_ENABLED"] = previous;
    }
  });

  it("enables onboarding entry points only for explicit true flags", async () => {
    vi.stubEnv("VITE_MEMBER_ACCOUNT_ACTIVATION_ENABLED", "true");
    vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", "true");
    const { memberAccountActivationEnabled, memberApplicationsEnabled } = await loadFreshModules();

    expect(memberAccountActivationEnabled()).toBe(true);
    expect(memberApplicationsEnabled()).toBe(true);
  });

  it("never writes the legacy `mzt.token` key during login", async () => {
    const { apiClient, login, axios } = await loadFreshModules();
    const spy = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, user: { id: 1, roles: ["anggota"] } },
    });
    const csrfSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: {} });

    const result = await login({ identifier: "MZT000001", password: "secret" });

    expect(csrfSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("/login", { identifier: "MZT000001", password: "secret" }, {});
    expect(window.localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
    expect(result).toEqual({ success: true, user: { id: 1, roles: ["anggota"] } });
  });

  it("does not persist a token on login even when the API returns one", async () => {
    const { apiClient, login, axios } = await loadFreshModules();
    vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, token: "some-pat", user: { id: 1, roles: ["anggota"] } },
    });
    vi.spyOn(axios, "get").mockResolvedValue({ data: {} });

    await login({ identifier: "MZT000001", password: "secret" });

    expect(window.localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem("mzt.token")).toBeNull();
  });

  it("clears any stale legacy token on 401 (via the response interceptor)", async () => {
    const { apiClient } = await loadFreshModules();
    window.localStorage.setItem(LEGACY_TOKEN_KEY, "stale-token");
    const assignSpy = stubLocation();
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(axiosError(401, { authCheck: true })),
    ).rejects.toBeTruthy();

    expect(window.localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
    expect(assignSpy).not.toHaveBeenCalled(); // authCheck probe -> no hard redirect
  });

  it("401 on a non-authCheck request hard-redirects to /login", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation();
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(axiosError(401, { authCheck: false })),
    ).rejects.toBeTruthy();

    expect(assignSpy).toHaveBeenCalledWith("/login");
  });

  it("401 on an authCheck probe is left to the caller (no redirect)", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation();
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(axiosError(401, { authCheck: true })),
    ).rejects.toBeTruthy();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("redirects a non-probe 428 password requirement without using /login", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation("/dashboard");
    const interceptor = apiClient.interceptors.response.handlers?.[0];
    const error = axiosError(
      428,
      { authCheck: false },
      {
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change password first.",
      },
    );

    await expect(interceptor?.rejected?.(error)).rejects.toBe(error);

    expect(assignSpy).toHaveBeenCalledOnce();
    expect(assignSpy).toHaveBeenCalledWith("/portal/ubah-password");
    expect(assignSpy).not.toHaveBeenCalledWith("/login");
  });

  it("does not loop or redirect probes on a 428 password requirement", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation("/portal/ubah-password");
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(
        axiosError(428, { authCheck: false }, { code: "PASSWORD_CHANGE_REQUIRED" }),
      ),
    ).rejects.toBeTruthy();
    await expect(
      interceptor?.rejected?.(
        axiosError(428, { authCheck: true }, { code: "PASSWORD_CHANGE_REQUIRED" }),
      ),
    ).rejects.toBeTruthy();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("redirects account setup responses to the setup wizard", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation("/dashboard");
    const interceptor = apiClient.interceptors.response.handlers?.[0];
    const error = axiosError(
      428,
      { authCheck: false },
      { code: "ACCOUNT_SETUP_REQUIRED", message: "Complete account setup." },
    );

    await expect(interceptor?.rejected?.(error)).rejects.toBe(error);

    expect(assignSpy).toHaveBeenCalledOnce();
    expect(assignSpy).toHaveBeenCalledWith("/account/setup");
  });

  it("keeps applicant authentication failures out of the member login flow", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation("/pendaftar");
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(axiosError(401, { authCheck: false, url: "/applicant/application" })),
    ).rejects.toBeTruthy();

    expect(assignSpy).toHaveBeenCalledOnce();
    expect(assignSpy).toHaveBeenCalledWith("/pendaftar/login");
    expect(assignSpy).not.toHaveBeenCalledWith("/login");
  });

  it("does not redirect member requests from the applicant portal to member login", async () => {
    const { apiClient } = await loadFreshModules();
    const assignSpy = stubLocation("/pendaftar");
    const interceptor = apiClient.interceptors.response.handlers?.[0];

    await expect(
      interceptor?.rejected?.(axiosError(401, { authCheck: false, url: "/user" })),
    ).rejects.toBeTruthy();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("preserves the response code on ApiError", async () => {
    const { apiClient, changePassword } = await loadFreshModules();
    vi.spyOn(apiClient, "put").mockRejectedValue(
      axiosError(
        428,
        { authCheck: true },
        { code: "PASSWORD_CHANGE_REQUIRED", message: "Required" },
      ),
    );

    await expect(
      changePassword({
        current_password: "old-password",
        password: "new-password",
        password_confirmation: "new-password",
      }),
    ).rejects.toMatchObject({
      status: 428,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "Required",
    });
  });

  it("logout never writes the legacy token key", async () => {
    const { apiClient, logout, axios } = await loadFreshModules();
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true } });
    vi.spyOn(axios, "get").mockResolvedValue({ data: {} });

    await logout();

    expect(window.localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
  });

  it("module has no token storage helpers exposed", async () => {
    const apiModule = await import("@/services/mzt-api");
    expect("getStoredToken" in apiModule).toBe(false);
    expect("setStoredToken" in apiModule).toBe(false);
  });
});

describe("currentUserQuery — session auth state", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the authenticated user from GET /user", async () => {
    const { apiClient, fetchCurrentUser } = await loadFreshModules();
    const user = { id: 7, id_anggota: "MZT000007", name: "Alumni", roles: ["anggota"] };
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: { success: true, user } });

    await expect(fetchCurrentUser()).resolves.toEqual(user);
  });

  it("marks the /user probe as authCheck so 401 does not hard-redirect", async () => {
    const { apiClient, ApiError, fetchCurrentUser } = await loadFreshModules();
    vi.spyOn(apiClient, "get").mockRejectedValue(axiosError(401));

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError);

    const getSpy = apiClient.get as ReturnType<typeof vi.fn>;
    const config = getSpy.mock.calls[0]?.[1] as { authCheck?: boolean } | undefined;
    expect(config?.authCheck).toBe(true);
  });

  it("throws an ApiError carrying the HTTP status", async () => {
    const { apiClient, ApiError, fetchCurrentUser } = await loadFreshModules();
    vi.spyOn(apiClient, "get").mockRejectedValue(axiosError(403));

    try {
      await fetchCurrentUser();
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiErrorType).status).toBe(403);
    }
  });
});

describe("Sanctum session bootstrap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("browser requests use withCredentials so the HttpOnly cookie is sent", async () => {
    const { apiClient, IS_SERVER } = await loadFreshModules();
    expect(IS_SERVER).toBe(false);
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it("GETs the CSRF cookie before a state-changing request", async () => {
    const { apiClient, login, axios } = await loadFreshModules();
    const csrfSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: {} });
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true, user: { id: 1 } } });

    await login({ identifier: "MZT000001", password: "secret" });

    expect(csrfSpy).toHaveBeenCalledTimes(1);
    expect(csrfSpy.mock.calls[0]?.[0]).toContain("/sanctum/csrf-cookie");
  });

  it("ensureCsrfToken is idempotent within a page load", async () => {
    const { ensureCsrfToken, axios } = await loadFreshModules();
    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: {} });

    await ensureCsrfToken();
    await ensureCsrfToken();
    await ensureCsrfToken();

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls[0]?.[0]).toContain("/sanctum/csrf-cookie");
  });

  it("login awaits the CSRF bootstrap before posting", async () => {
    const { apiClient, login, axios } = await loadFreshModules();
    const csrfSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: {} });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, user: { id: 1 } },
    });

    await login({ identifier: "MZT000001", password: "secret" });

    expect(csrfSpy).toHaveBeenCalledBefore(postSpy);
  });

  it("configures withXSRFToken so cross-origin stateful requests carry the CSRF header", async () => {
    const { apiClient } = await loadFreshModules();
    expect(apiClient.defaults.withXSRFToken).toBe(true);
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it("attaches X-XSRF-TOKEN through the real axios pipeline for the dev topology (:8080 -> :8000)", async () => {
    const { apiClient } = await loadFreshModules();

    // Plant the cookie exactly as Laravel emits it on the wire: percent-encoded
    // (Symfony rawurlencode). Axios must send the DECODED value in the header,
    // which is what VerifyCsrfToken decrypts.
    document.cookie = "XSRF-TOKEN=QQ%3D%3D; path=/";

    // jsdom page origin is :3000 while the API base is :8000 -> genuinely
    // cross-origin, matching the dev topology. The REAL xhr adapter runs
    // (so resolveConfig/cookie logic executes); only the network send fails.
    const { captured, restore } = captureXhrHeaders();
    try {
      await apiClient
        .post("/login", { identifier: "MZT000001", password: "x" })
        .catch(() => undefined);
    } finally {
      restore();
    }

    expect(captured["X-XSRF-TOKEN"]).toBe("QQ==");

    document.cookie = "XSRF-TOKEN=; path=/; max-age=0";
  });

  it("negative control: without withXSRFToken a cross-origin request omits the header", async () => {
    document.cookie = "XSRF-TOKEN=encrypted-xsrf-value; path=/";

    const plain = axios.create({
      baseURL: "http://localhost:8000/api",
      withCredentials: true, // deliberately WITHOUT withXSRFToken
    });

    const { captured, restore } = captureXhrHeaders();
    try {
      await plain.post("/login", {}).catch(() => undefined);
    } finally {
      restore();
    }

    expect(captured["X-XSRF-TOKEN"]).toBeUndefined();

    document.cookie = "XSRF-TOKEN=; path=/; max-age=0";
  });
});
