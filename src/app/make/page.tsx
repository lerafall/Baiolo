import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MakeGuideBody } from "@/components/make/MakeGuideBody";

export const metadata: Metadata = {
  title: "How to make an MVP",
  description: "Copy a prompt, add your idea, upload a ZIP. That simple.",
};

export default function MakeGuidePage() {
  return (
    <>
      <SiteHeader />
      <MakeGuideBody />
    </>
  );
}
