import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";

export default async function Home() {
  const session = await getServerAuthSession();
  redirect(session?.user?.email ? "/capture" : "/login");
}
