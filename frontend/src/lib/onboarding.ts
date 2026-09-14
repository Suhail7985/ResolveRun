const PREFIX = "resolverun_onboarding_complete_";

export function isOnboardingComplete(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${PREFIX}${userId}`) === "true";
}

export function markOnboardingComplete(userId: string): void {
  localStorage.setItem(`${PREFIX}${userId}`, "true");
}
