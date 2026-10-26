import { redirect } from "next/navigation";

/** Proxy rules normally handle "/", but keep a sensible landing anyway. */
export default function HomePage() {
  redirect("/newsletter");
}
