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