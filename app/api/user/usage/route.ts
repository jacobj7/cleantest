import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get rate limit status
    const rateLimitResult = await rateLimit(userId);

    // Get generation count
    const generationCount = await prisma.generation.count({
      where: {
        userId,
      },
    });

    // Get refinement count
    const refinementCount = await prisma.refinement.count({
      where: {
        userId,
      },
    });

    const remaining = rateLimitResult.remaining ?? 0;
    const limit = rateLimitResult.limit ?? 0;
    const reset = rateLimitResult.reset ?? null;

    return NextResponse.json({
      generationCount,
      refinementCount,
      rateLimit: {
        remaining,
        limit,
        reset,
      },
    });
  } catch (error) {
    console.error("Error fetching user usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
