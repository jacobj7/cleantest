import { NextRequest, NextResponse } from "next/server";
import { generateTests } from "@/lib/llm";
import { scoreTestQuality } from "@/lib/prompts";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.string().optional().default("javascript"),
  framework: z.string().optional().default("jest"),
  description: z.string().optional(),
});

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime,
    };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    };
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
    // Get client identifier for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const identifier = ip;

    // Check rate limit
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        },
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", message: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { code, language, framework, description } = validationResult.data;

    // Generate tests using LLM
    let generatedTests;
    try {
      generatedTests = await generateTests({
        code,
        language,
        framework,
        description,
      });
    } catch (error) {
      console.error("Error generating tests:", error);
      return NextResponse.json(
        {
          error: "Generation failed",
          message: "Failed to generate tests. Please try again.",
        },
        { status: 500 },
      );
    }

    // Score the quality of generated tests
    let qualityScore;
    try {
      qualityScore = await scoreTestQuality({
        originalCode: code,
        generatedTests: generatedTests.tests,
        language,
        framework,
      });
    } catch (error) {
      console.error("Error scoring test quality:", error);
      // Don't fail the request if scoring fails, just use a default score
      qualityScore = { score: 0, feedback: "Quality scoring unavailable" };
    }

    // Persist to database
    let savedGeneration = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
          .from("generations")
          .insert({
            input_code: code,
            language,
            framework,
            description: description || null,
            generated_tests: generatedTests.tests,
            quality_score: qualityScore.score,
            quality_feedback: qualityScore.feedback,
            model_used: generatedTests.model || "claude-3-5-sonnet-20241022",
            tokens_used: generatedTests.usage?.total_tokens || null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("Error saving to database:", error);
        } else {
          savedGeneration = data;
        }
      }
    } catch (error) {
      console.error("Database error:", error);
      // Don't fail the request if database save fails
    }

    // Return the result
    const response = {
      success: true,
      data: {
        id: savedGeneration?.id || null,
        tests: generatedTests.tests,
        language,
        framework,
        quality: {
          score: qualityScore.score,
          feedback: qualityScore.feedback,
        },
        usage: generatedTests.usage || null,
        model: generatedTests.model || "claude-3-5-sonnet-20241022",
        createdAt: savedGeneration?.created_at || new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
      },
    });
  } catch (error) {
    console.error("Unexpected error in generate route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    );
  }
}
