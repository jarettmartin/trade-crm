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