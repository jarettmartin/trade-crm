import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import MarkdownContent from "../components/MarkdownContent";
import PrivacyPolicy from "../legal/PrivacyPolicy";
import TermsOfService from "../legal/TermsOfService";
import privacyRaw from "../legal/privacy-policy.md?raw";
import termsRaw from "../legal/terms-of-service.md?raw";
import App from "../App";

/**
 * Words only: strips Markdown syntax, treats a hard break as no separator (a
 * `<br>` adds no whitespace to `textContent`) and collapses the rest so rendered
 * output can be compared against the source document word for word.
 */
const words = (text: string) =>
  text
    .replace(/\s{2,}\n/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/** Block-level content only — excludes the document's modal header/title. */
const BLOCKS = [
  ".markdown-content h1",
  ".markdown-content h2",
  ".markdown-content h3",
  ".markdown-content p",
  ".markdown-content li",
].join(", ");

/** Rendered text, one word-run per block, joined the way Markdown joins blocks. */
const renderedWords = (container: HTMLElement) =>
  words(
    Array.from(container.querySelectorAll(BLOCKS))
      .map((el) => el.textContent ?? "")
      .join(" "),
  );

describe("legal documents", () => {
  afterEach(() => window.history.pushState({}, "", "/"));

  it("renders each document faithfully (wording is never re-typed)", () => {
    for (const [name, raw, Component] of [
      ["privacy", privacyRaw, PrivacyPolicy],
      ["terms", termsRaw, TermsOfService],
    ] as const) {
      const { container, unmount } = render(<Component />);
      expect(renderedWords(container), name).toBe(words(raw));
      unmount();
    }
  });

  it("renders headings, bold, bullets and hard breaks", () => {
    const source = [
      "# Title",
      "",
      "**Bold:** plain text",
      "",
      "## Section",
      "",
      "- one",
      "- two **bold**",
      "",
      "Name  ",
      "Email: a@b.com",
    ].join("\n");

    const { container } = render(<MarkdownContent source={source} />);

    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("h2")?.textContent).toBe("Section");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("Bold:");
    // The two-space hard break becomes a <br> inside the same paragraph.
    expect(container.querySelectorAll("br")).toHaveLength(1);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs[1].textContent).toContain("Email: a@b.com");
  });

  it("gates registration on accepting both documents", async () => {
    window.history.pushState({}, "", "/sign-in");
    render(<App />);

    fireEvent.click(await screen.findByText("Don't have an account? Register"));

    // One consent row per document, each linking to it. The shared footer
    // links to the same two documents, so the consent rows come first in the
    // DOM — the footer instances are the second match.
    expect(screen.getAllByText("I have read and agree to the")).toHaveLength(2);
    const privacyLink = screen.getAllByText("Privacy Policy")[0];
    expect(screen.getAllByText("Terms of Service")).toHaveLength(2);

    // Register is blocked until both boxes are ticked.
    const submit = await screen.findByTestId("auth-submit");
    expect(submit.hasAttribute("disabled")).toBe(true);

    // The link opens the document in a modal.
    fireEvent.click(privacyLink);
    const policyHeading = await screen.findByText("Sprout — Privacy Policy");
    expect(policyHeading.tagName.toLowerCase()).toBe("h1");

    // Tick both boxes -> Register becomes available.
    const boxes = document.querySelectorAll("ion-checkbox");
    expect(boxes).toHaveLength(2);
    await act(async () => {
      boxes.forEach((box) => {
        (box as unknown as { checked: boolean }).checked = true;
        box.dispatchEvent(
          new CustomEvent("ionChange", { detail: { checked: true } }),
        );
      });
    });
    await waitFor(() => expect(submit.hasAttribute("disabled")).toBe(false));
  });
});

describe("routed legal pages and shared footer", () => {
  afterEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("links both legal documents from the shared footer", async () => {
    render(<App />);

    expect(await screen.findByTestId("footer-terms")).toBeInTheDocument();
    expect(screen.getByTestId("footer-privacy")).toBeInTheDocument();
  });

  it("serves the privacy policy on its own public route", async () => {
    window.history.pushState({}, "", "/privacy");

    render(<App />);

    expect(await screen.findByText("Sprout — Privacy Policy")).toBeTruthy();
    expect(screen.getByTestId("footer-privacy")).toBeInTheDocument();
  });

  it("serves the terms on their own route in the authenticated app", async () => {
    localStorage.setItem("trade_crm_id_token", "id-token");
    localStorage.setItem("trade_crm_refresh_token", "refresh-token");
    localStorage.setItem(
      "trade_crm_user",
      JSON.stringify({
        id: "user-1",
        email: "owner@example.com",
        status: "ACTIVE",
        role: "OWNER",
        firstName: "Owner",
        lastName: "User",
        tenantId: "tenant-1",
      }),
    );
    window.history.pushState({}, "", "/terms");

    render(<App />);

    expect(await screen.findByText("Sprout — Terms of Service")).toBeTruthy();
    expect(screen.getByTestId("footer-terms")).toBeInTheDocument();
  });
});
