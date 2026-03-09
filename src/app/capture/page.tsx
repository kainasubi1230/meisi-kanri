import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { CardCaptureClient } from "@/components/card-capture-client";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen">
      <CardCaptureClient />
    </main>
  );
}
