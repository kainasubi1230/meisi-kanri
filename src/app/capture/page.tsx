import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { CardCaptureClient } from "@/components/card-capture-client";

export default async function CapturePage() {
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f4f4f5,_#fafaf9_55%)]">
      <CardCaptureClient />
    </main>
  );
}
