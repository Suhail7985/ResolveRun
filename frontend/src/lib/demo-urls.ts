export const DEMO_API_BASE =
  process.env.NEXT_PUBLIC_DEMO_API_URL ?? "http://localhost:4000";

export const DEMO_SUCCESS_URL = `${DEMO_API_BASE}/api/demo/success`;
export const DEMO_FLAKY_URL = `${DEMO_API_BASE}/api/demo/flaky/demo1`;
export const DEMO_PAYMENT_URL = `${DEMO_API_BASE}/api/demo/payment`;
