import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerAuthSession();
  if (session?.user?.email) {
    redirect("/capture");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#f4f4f5,_#fafaf9_55%)] px-4">
      <LoginForm />
    </main>
  );
}
