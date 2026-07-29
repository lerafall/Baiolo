import { SiteHeader } from "@/components/layout/SiteHeader";
import { SafetyBody } from "@/components/safety/SafetyBody";

export const metadata = {
  title: "Stay safe",
};

export default function SafetyPage() {
  return (
    <>
      <SiteHeader />
      <SafetyBody />
    </>
  );
}
