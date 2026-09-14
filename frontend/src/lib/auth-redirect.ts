import { isOnboardingComplete } from "./onboarding";

export function postAuthPath(userId: string): string {
  return isOnboardingComplete(userId) ? "/dashboard" : "/onboarding";
}
