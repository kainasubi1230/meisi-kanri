import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { CardsListClient } from "@/components/cards-list-client";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f4f4f5,_#fafaf9_55%)]">
      <CardsListClient />
    </main>
  );
}
