"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Old state links now open the state next to the map. */
export default function StatePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/licensing?s=${code.toUpperCase()}`); }, [code, router]);
  return null;
}
