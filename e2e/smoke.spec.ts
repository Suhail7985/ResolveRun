import { test, expect } from "@playwright/test";

test.describe("ResolveRun smoke", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Run scheduled jobs safely/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Sign in to ResolveRun/i })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Create your ResolveRun account/i })).toBeVisible();
  });

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("http://localhost:4000/api/health");
    expect(res.status()).toBeLessThan(600);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });
});
