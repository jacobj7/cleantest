import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { z } from "zod";

const RefineRequestSchema = z.object({
  generationId: z.string().uuid(),
  instructions: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = RefineRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { generationId, instructions } = parseResult.data;

    // Fetch the generation and verify ownership
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", user.id)
      .single();

    if (generationError || !generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 },
      );
    }

    // Fetch the latest refinement if any, to use as base
    const { data: latestRefinement } = await supabase
      .from("refinements")
      .select("*")
      .eq("generation_id", generationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentTests = latestRefinement
      ? latestRefinement.refined_tests
      : generation.generated_tests;

    const systemPrompt = `You are an expert software test engineer. Your task is to refine and improve existing test cases based on user instructions.

When refining tests:
1. Follow the user's instructions precisely
2. Maintain the existing test structure and format unless instructed otherwise
3. Ensure tests remain valid, runnable, and well-documented
4. Improve test coverage, clarity, and effectiveness based on the instructions
5. Return the complete refined test suite, not just the changes

After the tests, provide a quality score from 0-100 based on:
- Coverage completeness (25 points)
- Test clarity and documentation (25 points)
- Edge case handling (25 points)
- Best practices adherence (25 points)

Format your response as JSON with this structure:
{
  "tests": "the complete refined test code as a string",
  "score": <number 0-100>,
  "summary": "brief summary of changes made"
}`;

    const userPrompt = `Here are the current tests:

\`\`\`
${currentTests}
\`\`\`

Please refine these tests according to the following instructions:
${instructions}

Return the complete refined test suite as JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: "Failed to generate refined tests" },
        { status: 500 },
      );
    }

    let parsedResponse: {
      tests: string;
      score: number;
      summary: string;
    };

    try {
      parsedResponse = JSON.parse(responseContent);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse LLM response" },
        { status: 500 },
      );
    }

    if (
      !parsedResponse.tests ||
      typeof parsedResponse.score !== "number" ||
      parsedResponse.score < 0 ||
      parsedResponse.score > 100
    ) {
      return NextResponse.json(
        { error: "Invalid response format from LLM" },
        { status: 500 },
      );
    }

    // Persist the refinement
    const { data: refinement, error: refinementError } = await supabase
      .from("refinements")
      .insert({
        generation_id: generationId,
        user_id: user.id,
        instructions,
        refined_tests: parsedResponse.tests,
        score: parsedResponse.score,
        summary: parsedResponse.summary || null,
      })
      .select()
      .single();

    if (refinementError || !refinement) {
      console.error("Failed to persist refinement:", refinementError);
      return NextResponse.json(
        { error: "Failed to save refinement" },
        { status: 500 },
      );
    }

    // Update the generation's latest score
    await supabase
      .from("generations")
      .update({
        score: parsedResponse.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    return NextResponse.json({
      refinementId: refinement.id,
      tests: parsedResponse.tests,
      score: parsedResponse.score,
      summary: parsedResponse.summary || null,
      generationId,
    });
  } catch (error) {
    console.error("Refine route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
