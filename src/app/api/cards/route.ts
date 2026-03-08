import { NextResponse } from "next/server";

import { createCardRequestSchema } from "@/lib/business-card";
import { prisma } from "@/lib/prisma";
import { getRequestUserId } from "@/lib/user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = getRequestUserId(request.headers.get("x-user-id"));
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    const cards = await prisma.businessCard.findMany({
      where: {
        userId,
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { company: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    return NextResponse.json({ error: "Failed to fetch cards." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getRequestUserId(request.headers.get("x-user-id"));
    const payload = await request.json();
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
