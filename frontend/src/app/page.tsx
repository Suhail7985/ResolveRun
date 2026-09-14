import { LandingPage } from "@/components/landing-page";
import { LoggedInRedirect } from "@/components/logged-in-redirect";

export default function Home() {
  return (
    <>
      <LoggedInRedirect />
      <LandingPage />
    </>
  );
}
