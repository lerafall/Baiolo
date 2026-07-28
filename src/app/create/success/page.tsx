import { redirect } from "next/navigation";

/** Legacy route — v2 uses /create/submitted */
export default function CreateSuccessRedirect() {
  redirect("/create/submitted");
}
