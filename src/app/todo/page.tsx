"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The to-do list moved into Licensing. */
export default function OldTodoPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/licensing/todo"); }, [router]);
  return null;
}
