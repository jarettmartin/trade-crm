import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

/** Minimal `Response` stand-in for the fields `api.request` reads. */
const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  }) as unknown as Response;

describe("api 401 handling", () => {
  beforeEach(() => {
    localStorage.clear();
    api.clearTokens();
    api.setDemoMode(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the session and reports Cognito's lockout on a rejected sign-in", async () => {
    const onUnauthorized = vi.fn();
    api.onUnauthorized(onUnauthorized);

    // A previously signed-in user may still be sitting on a public page. The
    // failed sign-in must not take their session down with it.
    api.setTokens("existing-id-token", "existing-refresh-token");

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, {
        message:
          "Too many failed sign-in attempts. Please wait 15 minutes and try again, or reset your password.",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.login("owner@example.com", "wrong-password")).rejects.toThrow(
      "Too many failed sign-in attempts. Please wait 15 minutes and try again, or reset your password.",
    );

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(localStorage.getItem("trade_crm_id_token")).toBe("existing-id-token");

    // Credential endpoints never send a cached token, so a stale one cannot
    // turn a bad password into a confusing session failure.
    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["x-refresh-token"]).toBeUndefined();
  });

  it("clears the session and notifies once when an authenticated request 401s", async () => {
    const onUnauthorized = vi.fn();
    api.onUnauthorized(onUnauthorized);
    api.setTokens("expired-id-token", "expired-refresh-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { message: "Session expired" })),
    );

    await expect(api.fetchCustomers(1, 10)).rejects.toThrow("Session expired");

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("trade_crm_id_token")).toBeNull();
    expect(localStorage.getItem("trade_crm_refresh_token")).toBeNull();
  });
});
