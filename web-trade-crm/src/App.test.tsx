import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, test, vi } from "vitest";
import App from "./App";
import { api } from "./services/api";

const storedUser = {
  id: "user-1",
  email: "owner@example.com",
  status: "ACTIVE",
  role: "OWNER",
  firstName: "Owner",
  lastName: "User",
  tenantId: "tenant-1",
};

const LOCKOUT_MESSAGE =
  "Too many failed sign-in attempts. Please wait 15 minutes and try again, or reset your password.";

/** Minimal `Response` stand-in for the fields `api.request` reads. */
const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  }) as unknown as Response;

const emptyJobsPage = {
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

const signInLocally = () => {
  localStorage.setItem("trade_crm_id_token", "id-token");
  localStorage.setItem("trade_crm_refresh_token", "refresh-token");
  localStorage.setItem("trade_crm_user", JSON.stringify(storedUser));
};

/** Drives an Ionic input the way the component does (`ionInput` + detail). */
const setIonValue = async (element: HTMLElement, value: string) => {
  await act(async () => {
    (element as unknown as { value: string }).value = value;
    element.dispatchEvent(new CustomEvent("ionInput", { detail: { value } }));
  });
};

/** Lets Ionic's page transition finish before the component tree is removed. */
const settleTransition = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  api.clearTokens();
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("renders without crashing", () => {
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
});

describe("authenticated entry", () => {
  it("forces a signed-in user from the landing page into the app", async () => {
    signInLocally();
    window.history.pushState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, emptyJobsPage)),
    );

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe("/manage-jobs"));
    await settleTransition();
  });

  it("forces a signed-in user away from the sign-in page", async () => {
    signInLocally();
    window.history.pushState({}, "", "/sign-in");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, emptyJobsPage)),
    );

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe("/manage-jobs"));
    await settleTransition();
  });
});

describe("sign-in errors", () => {
  it("explains why an expired session sent the user to sign-in", async () => {
    window.history.pushState({}, "", "/sign-in?reason=session-expired");

    render(<App />);

    expect(
      await screen.findByText(
        "Your session has expired. Please sign in again.",
      ),
    ).toBeTruthy();
  });

  it("shows a Cognito lockout instead of reloading the app", async () => {
    window.history.pushState({}, "", "/sign-in");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse(401, { message: LOCKOUT_MESSAGE })),
    );

    render(<App />);

    await setIonValue(
      await screen.findByTestId("auth-email"),
      "owner@example.com",
    );
    await setIonValue(
      await screen.findByTestId("auth-password"),
      "wrong-password",
    );
    fireEvent.click(await screen.findByTestId("auth-submit"));

    expect(await screen.findByText(LOCKOUT_MESSAGE)).toBeTruthy();
    expect(window.location.pathname).toBe("/sign-in");
  });
});

