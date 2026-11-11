import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The signed-in session, or a redirect to /signin. The proxy already guards pages; this is defence in depth. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user || session.error) redirect("/signin");
  return session;
}
