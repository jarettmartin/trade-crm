import { describe, it, expect } from "vitest";
import { demoService } from "./demoService";

describe("demoService.fetchCustomers", () => {
  it("returns a paginated list with meta", () => {
    const res = demoService.fetchCustomers(1, 10);
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(10);
    expect(res.meta.total).toBeGreaterThan(10);
    expect(res.meta.totalPages).toBeGreaterThan(1);
    expect(res.data.length).toBeLessThanOrEqual(10);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("does not overlap across pages", () => {
    const page1 = demoService.fetchCustomers(1, 10);
    const page2 = demoService.fetchCustomers(2, 10);
    const ids = new Set([...page1.data, ...page2.data].map((c) => c.id));
    expect(page2.data.length).toBeGreaterThan(0);
    expect(ids.size).toBe(page1.data.length + page2.data.length);
  });

  it("handles out-of-range pages without throwing", () => {
    const res = demoService.fetchCustomers(999, 10);
    expect(res.data).toEqual([]);
    expect(res.meta.totalPages).toBeGreaterThan(0);
  });
});

describe("demoService.fetchJobs", () => {
  it("supports paginated browsing of the full history", () => {
    const res = demoService.fetchJobs(1, 10);
    expect(res.meta.total).toBeGreaterThan(10);
    expect(res.meta.totalPages).toBeGreaterThan(1);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("applies the status filter to pagination meta", () => {
    const all = demoService.fetchJobs(1, 100);
    const completed = demoService.fetchJobs(1, 100, "COMPLETED");
    expect(completed.meta.total).toBeGreaterThan(0);
    expect(completed.meta.total).toBeLessThan(all.meta.total);
    expect(
      completed.data.every((job) => job.status === "COMPLETED"),
    ).toBe(true);
  });

  it("returns jobs newest-first (createdAt DESC), mirroring the API", () => {
    const res = demoService.fetchJobs(1, 100);
    const times = res.data.map((job) => new Date(job.createdAt).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });
});

describe("demoService catalog items", () => {
  it("returns a paginated list newest-first", () => {
    const res = demoService.fetchCatalogItems(1, 10);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.meta.total).toBeGreaterThanOrEqual(12);
    const times = res.data.map(
      (item) => new Date(item.createdAt ?? 0).getTime(),
    );
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it("filters by type", () => {
    const services = demoService.fetchCatalogItems(1, 100, ["SERVICE"]);
    expect(services.meta.total).toBeGreaterThan(0);
    expect(services.data.every((item) => item.type === "SERVICE")).toBe(true);

    const fees = demoService.fetchCatalogItems(1, 100, ["FEE"]);
    expect(fees.data.length).toBeGreaterThan(0);
    expect(fees.data.every((item) => item.type === "FEE")).toBe(true);
  });

  it("searches across description, type, and price and combines with type", () => {
    // description match
    const leaf = demoService.fetchCatalogItems(1, 100, undefined, "leaf");
    expect(leaf.meta.total).toBeGreaterThan(0);
    expect(
      leaf.data.every((item) =>
        item.description.toLowerCase().includes("leaf"),
      ),
    ).toBe(true);

    // type match (matches the FEE enum label)
    const fee = demoService.fetchCatalogItems(1, 100, undefined, "fee");
    expect(fee.data.length).toBeGreaterThan(0);
    expect(fee.data.every((item) => item.type === "FEE")).toBe(true);

    // unit price match
    const priced = demoService.fetchCatalogItems(1, 100, undefined, "200");
    expect(priced.data.length).toBeGreaterThan(0);
    expect(
      priced.data.every((item) => String(item.unitPrice).includes("200")),
    ).toBe(true);

    // combined with the type checkboxes
    const combined = demoService.fetchCatalogItems(
      1,
      100,
      ["SERVICE"],
      "leaf",
    );
    expect(combined.data.length).toBeGreaterThan(0);
    expect(
      combined.data.every(
        (item) =>
          item.type === "SERVICE" &&
          item.description.toLowerCase().includes("leaf"),
      ),
    ).toBe(true);
  });

  it("keeps seeded job line items linked to catalog items", () => {
    const job = demoService.fetchJob("demo-job-1");
    const linked = job.lineItems.filter((li) => li.catalogItemId);
    expect(linked.length).toBeGreaterThan(0);
  });

  it("deleting a catalog item only clears the reference on line items", () => {
    const before = demoService.fetchCatalogItem("demo-catalog-1").description;
    demoService.deleteCatalogItem("demo-catalog-1");

    // The item is gone...
    expect(() => demoService.fetchCatalogItem("demo-catalog-1")).toThrow();

    // ...but the seeded line item keeps its snapshotted details.
    const job = demoService.fetchJob("demo-job-1");
    const li = job.lineItems.find((l) => l.id === "demo-li-1");
    expect(li?.description).toBe("Leaf removal and disposal");
    expect(li?.unitPrice).toBe(75);
    expect(li?.catalogItemId).toBeUndefined();
    expect(before).toBe("Leaf removal and disposal");
  });

  it("create/update round-trips a catalog item", () => {
    const created = demoService.createCatalogItem({
      type: "MATERIAL",
      description: "Test mulch",
      unitPrice: 9.5,
    });
    expect(created.id).toBeTruthy();
    expect(created.type).toBe("MATERIAL");

    const updated = demoService.updateCatalogItem(created.id, {
      unitPrice: 11,
    });
    expect(updated.unitPrice).toBe(11);

    const fetched = demoService.fetchCatalogItem(created.id);
    expect(fetched.description).toBe("Test mulch");
    expect(fetched.unitPrice).toBe(11);
  });
});

describe("demoService feedback", () => {
  it("returns seeded submissions newest-first with pagination meta", () => {
    const res = demoService.fetchFeedback(1, 2);
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(2);
    expect(res.meta.total).toBeGreaterThanOrEqual(3);
    expect(res.data.length).toBe(2);

    const times = res.data.map((f) => new Date(f.createdAt).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it("puts a new submission on the first page (newest-first)", () => {
    const created = demoService.submitFeedback({
      type: "BUG",
      subject: "  Subject with padding  ",
      message: "  Something broke  ",
    });
    expect(created.id).toBeTruthy();
    expect(created.type).toBe("BUG");
    expect(created.subject).toBe("Subject with padding");
    expect(created.message).toBe("Something broke");
    expect(created.userEmail).toBe("demo@sprout-crm.com");

    const first = demoService.fetchFeedback(1, 10);
    expect(first.data[0].id).toBe(created.id);
  });

  it("omits a blank subject", () => {
    const created = demoService.submitFeedback({
      type: "CONTACT",
      subject: "   ",
      message: "Please call me",
    });
    expect(created.subject).toBeUndefined();
  });
});

describe("demoService.createJobNote", () => {
  it("appends one note and leaves the existing ones untouched", () => {
    const before = demoService.fetchJob("demo-job-1");
    const seeded = before.notes[0];
    expect(seeded.createdAt).toBe("2026-04-16T10:30:00.000Z");

    demoService.createJobNote("demo-job-1", {
      note: "Follow-up visit scheduled.",
      userId: "demo-user-1",
    });

    const after = demoService.fetchJob("demo-job-1");
    expect(after.notes).toHaveLength(before.notes.length + 1);

    // The pre-existing note keeps its id and timestamp...
    expect(after.notes[0].id).toBe(seeded.id);
    expect(after.notes[0].createdAt).toBe(seeded.createdAt);

    // ...and the appended one is stamped now.
    const added = after.notes[after.notes.length - 1];
    expect(added.note).toBe("Follow-up visit scheduled.");
    expect(added.id).not.toBe(seeded.id);
    expect(Number.isNaN(new Date(added.createdAt).getTime())).toBe(false);
  });

  it("rejects an unknown job", () => {
    expect(() =>
      demoService.createJobNote("nope", { note: "Hi", userId: "demo-user-1" }),
    ).toThrow();
  });

  it("updateJob ignores notes and line items, mirroring the API", () => {
    const before = demoService.fetchJob("demo-job-1");

    demoService.updateJob("demo-job-1", {
      notes: [{ note: "Should not appear", userId: "demo-user-1" }],
      lineItems: [],
    });

    const after = demoService.fetchJob("demo-job-1");
    expect(after.notes.map((n) => n.note)).toEqual(
      before.notes.map((n) => n.note),
    );
    expect(after.lineItems.map((li) => li.id)).toEqual(
      before.lineItems.map((li) => li.id),
    );
  });
});

describe("demoService job line items", () => {
  it("createJobLineItem appends one item and keeps the others", () => {
    const before = demoService.fetchJob("demo-job-1");
    const first = before.lineItems[0];

    const created = demoService.createJobLineItem("demo-job-1", {
      type: "MATERIAL",
      description: "Test mulch",
      quantity: 2,
      unitPrice: 10,
      lineTotal: 20,
    });

    const after = demoService.fetchJob("demo-job-1");
    expect(after.lineItems).toHaveLength(before.lineItems.length + 1);
    expect(after.lineItems.map((li) => li.id)).toContain(created.id);

    // Pre-existing items keep their ids, snapshots and catalog references.
    const survivor = after.lineItems.find((li) => li.id === first.id);
    expect(survivor?.lineTotal).toBe(first.lineTotal);
    expect(survivor?.catalogItemId).toBe(first.catalogItemId);
  });

  it("deleteJobLineItem removes only the requested item", () => {
    const before = demoService.fetchJob("demo-job-1");
    const target = before.lineItems[0];

    demoService.deleteJobLineItem("demo-job-1", target.id);

    const after = demoService.fetchJob("demo-job-1");
    expect(after.lineItems).toHaveLength(before.lineItems.length - 1);
    expect(after.lineItems.map((li) => li.id)).not.toContain(target.id);
    expect(after.lineItems.map((li) => li.id)).toContain(
      before.lineItems[1].id,
    );
  });

  it("rejects unknown jobs and unknown line items", () => {
    expect(() =>
      demoService.createJobLineItem("nope", {
        type: "SERVICE",
        description: "X",
        quantity: 1,
        unitPrice: 1,
        lineTotal: 1,
      }),
    ).toThrow();
    expect(() => demoService.deleteJobLineItem("demo-job-1", "nope")).toThrow();
  });
});