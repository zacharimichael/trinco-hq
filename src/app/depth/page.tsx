import { redirect } from "next/navigation";

/** Depth charts were taken out (z, 2026-11-16). Old links land on Players. */
export default function DepthPage() {
  redirect("/players");
}
