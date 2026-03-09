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
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <LoginForm />
    </main>
  );
}
