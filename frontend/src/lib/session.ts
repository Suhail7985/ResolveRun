import { api } from "./api";

const LOGOUT_FLAG = "resolverun_logged_out";

export async function logoutAndLeave(): Promise<void> {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Still leave the app even if the API call fails.
  }
  try {
    sessionStorage.setItem(LOGOUT_FLAG, "1");
  } catch {
    // ignore storage errors
  }
  window.location.replace("/?loggedOut=1");
}

export function consumeLogoutFlag(): boolean {
  if (typeof window === "undefined") return false;
  const fromQuery = new URLSearchParams(window.location.search).get("loggedOut") === "1";
  let fromStorage = false;
  try {
    fromStorage = sessionStorage.getItem(LOGOUT_FLAG) === "1";
    if (fromStorage) sessionStorage.removeItem(LOGOUT_FLAG);
  } catch {
    // ignore
  }
  return fromQuery || fromStorage;
}
