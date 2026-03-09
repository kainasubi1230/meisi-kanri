import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/auth";
import { createCardRequestSchema, createCardsBatchRequestSchema } from "@/lib/business-card";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const accountShareRows = await prisma.appUserShare.findMany({
      where: { sharedWithUserId: userId },
      select: { ownerUserId: true },
    });
    const sharedOwnerIds = accountShareRows.map((row) => row.ownerUserId);

    const accessFilter: Prisma.BusinessCardWhereInput = {
      OR: [{ userId }, { shares: { some: { sharedWithUserId: userId } } }, { userId: { in: sharedOwnerIds } }],
    };
    const searchFilter: Prisma.BusinessCardWhereInput | null = query
      ? {
          OR: [
            { fullName: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { company: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : null;
    const where: Prisma.BusinessCardWhereInput = searchFilter ? { AND: [accessFilter, searchFilter] } : accessFilter;

    const cards = await prisma.businessCard.findMany({
      where,
      include: {
        shares: {
          select: {
            sharedWithUserId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      cards: cards.map((card) => {
        const isOwner = card.userId.toLowerCase() === userId.toLowerCase();
        const isAccountShared = !isOwner && sharedOwnerIds.includes(card.userId);
        return {
          ...card,
          ownerUserId: card.userId,
          accessType: isOwner ? "owner" : isAccountShared ? "account_shared" : "card_shared",
          sharedWith: isOwner ? card.shares.map((share: { sharedWithUserId: string }) => share.sharedWithUserId) : [],
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    return NextResponse.json({ error: "Failed to fetch cards." }, { status: 500 });
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

    if (payload && typeof payload === "object" && Array.isArray((payload as { cards?: unknown[] }).cards)) {
      const parsedBatch = createCardsBatchRequestSchema.parse(payload);

      const cards = await prisma.$transaction(
        parsedBatch.cards.map((card) =>
          prisma.businessCard.create({
            data: {
              userId,
              ...card,
              imageBase64: card.imageBase64 ?? parsedBatch.imageBase64,
              imageMimeType: card.imageMimeType ?? parsedBatch.imageMimeType,
            },
          }),
        ),
      );

      return NextResponse.json({ cards, count: cards.length }, { status: 201 });
    }

    const parsed = createCardRequestSchema.parse(payload);
    const card = await prisma.businessCard.create({
      data: {
        userId,
        ...parsed,
      },
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cards error:", error);
    return NextResponse.json({ error: "Failed to save card." }, { status: 500 });
  }
}
