import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerAuthSession } from "@/auth";
import { isEmailAllowed, normalizeEmail } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const shareRequestSchema = z.object({
  email: z.string().email(),
});

async function ensureOwner(cardId: string, userId: string) {
  const card = await prisma.businessCard.findUnique({
    where: { id: cardId },
    select: { id: true, userId: true },
  });

  if (!card) {
    return { ok: false as const, response: NextResponse.json({ error: "Card not found." }, { status: 404 }) };
  }

  if (card.userId !== userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function POST(request: Request, context: { params: Promise<{ cardId: string }> }) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    const ownership = await ensureOwner(cardId, userId);
    if (!ownership.ok) {
      return ownership.response;
    }

    const payload = await request.json();
    const parsed = shareRequestSchema.parse(payload);
    const sharedWithUserId = normalizeEmail(parsed.email);

    if (sharedWithUserId === userId) {
      return NextResponse.json({ error: "You already own this card." }, { status: 400 });
    }

    if (!isEmailAllowed(sharedWithUserId)) {
      return NextResponse.json({ error: "This account is not allowed in this app." }, { status: 403 });
    }

    await prisma.businessCardShare.upsert({
      where: {
        cardId_sharedWithUserId: {
          cardId,
          sharedWithUserId,
        },
      },
      create: {
        cardId,
        ownerUserId: userId,
        sharedWithUserId,
      },
      update: {},
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cards/[cardId]/shares error:", error);
    return NextResponse.json({ error: "Failed to share card." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ cardId: string }> }) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    const ownership = await ensureOwner(cardId, userId);
    if (!ownership.ok) {
      return ownership.response;
    }

    const payload = await request.json();
    const parsed = shareRequestSchema.parse(payload);
    const sharedWithUserId = normalizeEmail(parsed.email);

    await prisma.businessCardShare.deleteMany({
      where: {
        cardId,
        ownerUserId: userId,
        sharedWithUserId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/cards/[cardId]/shares error:", error);
    return NextResponse.json({ error: "Failed to remove share." }, { status: 500 });
  }
}
