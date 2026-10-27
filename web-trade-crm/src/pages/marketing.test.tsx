import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { api } from "../services/api";

/**
 * Marketing pages (landing `/`, Early Access `/beta-program`, Contact
 * `/contact`). These pass through the real router (`App`) so the tests cover
 * the conversion path end to end: hero CTA → program page → contact form with
 * the Early Access subject pre-selected.
 */

/** Minimal `Response` stand-in for the fields `api.request` reads. */
const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  }) as unknown as Response;

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

describe("landing page", () => {
  it("leads with the value proposition and the early access CTA", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /from estimate to invoice/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Three steps from first call to final invoice",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Request early access" }).length,
    ).toBeGreaterThan(0);

    await settleTransition();
  });

  it("walks a visitor from the hero CTA to the Early Access page", async () => {
    render(<App />);

    const [heroCta] = await screen.findAllByRole("button", {
      name: "Request early access",
    });
    fireEvent.click(heroCta);

    await waitFor(() =>
      expect(window.location.pathname).toBe("/beta-program"),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /help shape what it becomes/i,
      }),
    ).toBeTruthy();

    await settleTransition();
  });
});

describe("early access page", () => {
  it("sends the request through the contact form with the type preselected", async () => {
    window.history.pushState({}, "", "/beta-program");
    render(<App />);

    const [cta] = await screen.findAllByRole("button", {
      name: "Request early access",
    });
    fireEvent.click(cta);

    await waitFor(() => expect(window.location.pathname).toBe("/contact"));
    expect(window.location.search).toBe("?type=EARLY_ACCESS");

    // The contact page maps `?type=` onto the form's subject type.
    const select = await waitFor(() => {
      const element = document.querySelector("ion-select");
      expect(element).toBeTruthy();
      return element as unknown as { value: string };
    });
    expect(select.value).toBe("EARLY_ACCESS");

    await settleTransition();
  });
});

describe("contact page", () => {
  it("keeps submit disabled until the required fields are valid", async () => {
    window.history.pushState({}, "", "/contact");
    render(<App />);

    const submit = await screen.findByTestId("submit-contact");
    expect(submit.hasAttribute("disabled")).toBe(true);

    await setIonValue(
      await screen.findByTestId("contact-email"),
      "owner@example.com",
    );
    await setIonValue(
      await screen.findByTestId("contact-message"),
      "We run a two-person landscaping crew.",
    );
    await waitFor(() => expect(submit.hasAttribute("disabled")).toBe(false));

    await settleTransition();
  });

  it("confirms the message after the API accepts it", async () => {
    window.history.pushState({}, "", "/contact");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { id: "contact-1" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await setIonValue(
      await screen.findByTestId("contact-email"),
      "owner@example.com",
    );
    await setIonValue(
      await screen.findByTestId("contact-message"),
      "We run a two-person landscaping crew.",
    );
    fireEvent.click(await screen.findByTestId("submit-contact"));

    expect(await screen.findByText("Message sent")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/contact"),
      expect.objectContaining({ method: "POST" }),
    );

    await settleTransition();
  });
});
