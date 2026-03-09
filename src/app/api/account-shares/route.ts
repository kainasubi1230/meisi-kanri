import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { isEmailAllowed, normalizeEmail } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function GET() {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sharedWith, sharedBy] = await Promise.all([
      prisma.appUserShare.findMany({
        where: { ownerUserId: userId },
        select: { sharedWithUserId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.appUserShare.findMany({
        where: { sharedWithUserId: userId },
        select: { ownerUserId: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      sharedWith: sharedWith.map((row) => row.sharedWithUserId),
      sharedBy: sharedBy.map((row) => row.ownerUserId),
    });
  } catch (error) {
    console.error("GET /api/account-shares error:", error);
    return NextResponse.json({ error: "Failed to fetch account share settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = requestSchema.parse(payload);
    const sharedWithUserId = normalizeEmail(parsed.email);

    if (sharedWithUserId === userId) {
      return NextResponse.json({ error: "You cannot share with yourself." }, { status: 400 });
    }

    if (!isEmailAllowed(sharedWithUserId)) {
      return NextResponse.json({ error: "This account is not allowed in this app." }, { status: 403 });
    }

    await prisma.appUserShare.upsert({
      where: {
        ownerUserId_sharedWithUserId: {
          ownerUserId: userId,
          sharedWithUserId,
        },
      },
      create: {
        ownerUserId: userId,
        sharedWithUserId,
      },
      update: {},
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/account-shares error:", error);
    return NextResponse.json({ error: "Failed to share account data." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = requestSchema.parse(payload);
    const sharedWithUserId = normalizeEmail(parsed.email);

    await prisma.appUserShare.deleteMany({
      where: {
        ownerUserId: userId,
        sharedWithUserId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/account-shares error:", error);
    return NextResponse.json({ error: "Failed to remove account share." }, { status: 500 });
  }
}
