import { isOnboardingComplete } from "./onboarding";
import { DEMO_EMAIL } from "./demo-account";
import type { User } from "./api";

export function postAuthPath(user: Pick<User, "id" | "email">): string {
  if (user.email === DEMO_EMAIL) return "/dashboard";
  return isOnboardingComplete(user.id) ? "/dashboard" : "/onboarding";
}
