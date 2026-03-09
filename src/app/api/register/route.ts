import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isEmailAllowed, normalizeEmail } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.parse(payload);
    const email = normalizeEmail(parsed.email);

    if (!isEmailAllowed(email)) {
      return NextResponse.json(
        { error: "This account is not allowed to register for this app." },
        { status: 403 },
      );
    }

    const existing = await prisma.appUser.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }

    const passwordHash = await hash(parsed.password, 12);
    await prisma.appUser.create({
      data: {
        email,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/register error:", error);
    return NextResponse.json({ error: "Failed to register account." }, { status: 500 });
  }
}
