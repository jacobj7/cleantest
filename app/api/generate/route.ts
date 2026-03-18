import { NextRequest, NextResponse } from "next/server";
import { generateTests, scoreTestQuality } from "@/lib/prompts";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.string().optional().default("javascript"),
  framework: z.string().optional().default("jest"),
  description: z.string().optional(),
});

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  if (!userLimit || now > userLimit.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime };
  }
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }
  userLimit.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count,
    resetTime: userLimit.resetTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetTime: rateLimitResult.resetTime },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { code, language, framework } = validation.data;

    let generatedTests;
    try {
      generatedTests = await generateTests(code, language, framework);
    } catch (error) {
      console.error("Error generating tests:", error);
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    let qualityScore;
    try {
      qualityScore = await scoreTestQuality(code, generatedTests.tests, language);
    } catch (error) {
      console.error("Error scoring quality:", error);
      qualityScore = { overall: 0, feedback: [] };
    }

    let savedId: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("generations")
          .insert({
            input_code: code,
            language,
            framework,
            generated_tests: generatedTests.tests,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        savedId = data?.id ?? null;
      }
    } catch (error) {
      console.error("Database error:", error);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedId,
          tests: generatedTests.tests,
          language,
          framework,
          quality: qualityScore,
          createdAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
