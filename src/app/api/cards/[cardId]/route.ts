import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { updateCardRequestSchema } from "@/lib/business-card";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.email;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    if (!cardId) {
      return NextResponse.json({ error: "Card ID is required." }, { status: 400 });
    }

    // Check if the card exists and belongs to the user
    const existingCard = await prisma.businessCard.findUnique({
      where: { id: cardId },
    });
    if (!existingCard) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }
    if (existingCard.userId.toLowerCase() !== userId.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json();
    const parsed = updateCardRequestSchema.parse(payload);

    const updatedCard = await prisma.businessCard.update({
      where: { id: cardId },
      data: parsed,
    });

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error("PUT /api/cards/[cardId] error:", error);
    return NextResponse.json({ error: "Failed to update card." }, { status: 500 });
  }
}