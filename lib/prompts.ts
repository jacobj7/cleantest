import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface QualityScore {
  overall: number;
  coverage: number;
  readability: number;
  maintainability: number;
  edgeCases: number;
  feedback: string[];
}

export interface TestGenerationResult {
  tests: string;
  language: string;
  framework: string;
}

export async function generateTests(
  sourceCode: string,
  language: string,
  framework: string,
): Promise<TestGenerationResult> {
  const prompt = `You are an expert software engineer specializing in writing comprehensive test suites.

Generate a complete test suite for the following ${language} code using the ${framework} testing framework.

Source Code:
\`\`\`${language}
${sourceCode}
\`\`\`

Requirements:
1. Write comprehensive tests that cover all functions, methods, and classes
2. Include tests for:
   - Happy path scenarios (normal expected behavior)
   - Edge cases (boundary conditions, empty inputs, null values)
   - Error cases (invalid inputs, exceptions)
   - Integration between components if applicable
3. Use descriptive test names that explain what is being tested
4. Follow ${framework} best practices and conventions
5. Include setup and teardown where appropriate
6. Add comments explaining complex test scenarios
7. Ensure tests are independent and can run in any order

Generate ONLY the test code without any explanation. The tests should be production-ready and immediately runnable.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return {
    tests: content.text,
    language,
    framework,
  };
}

export async function scoreTestQuality(
  sourceCode: string,
  testCode: string,
  language: string,
): Promise<QualityScore> {
  const prompt = `You are an expert code reviewer specializing in test quality assessment.

Analyze the following test suite and provide a detailed quality score.

Source Code (${language}):
\`\`\`${language}
${sourceCode}
\`\`\`

Test Code (${language}):
\`\`\`${language}
${testCode}
\`\`\`

Evaluate the test suite on the following criteria and provide scores from 0-100:

1. **Coverage** (0-100): How well do the tests cover the source code?
   - Are all functions/methods tested?
   - Are all code paths covered?
   - Are all public APIs tested?

2. **Readability** (0-100): How easy are the tests to understand?
   - Are test names descriptive?
   - Is the test structure clear?
   - Are assertions meaningful?

3. **Maintainability** (0-100): How easy will it be to maintain these tests?
   - Are tests independent?
   - Is there code duplication?
   - Are setup/teardown properly handled?

4. **Edge Cases** (0-100): How well are edge cases handled?
   - Are boundary conditions tested?
   - Are null/empty inputs handled?
   - Are error scenarios covered?

5. **Overall** (0-100): Overall quality score considering all factors.

Respond with ONLY a valid JSON object in this exact format:
{
  "overall": <number 0-100>,
  "coverage": <number 0-100>,
  "readability": <number 0-100>,
  "maintainability": <number 0-100>,
  "edgeCases": <number 0-100>,
  "feedback": [
    "<specific feedback point 1>",
    "<specific feedback point 2>",
    "<specific feedback point 3>",
    "<specific feedback point 4>",
    "<specific feedback point 5>"
  ]
}

The feedback array should contain 3-7 specific, actionable feedback points about the test quality.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const scoreData = JSON.parse(jsonMatch[0]);

    // Validate the structure
    const requiredFields = [
      "overall",
      "coverage",
      "readability",
      "maintainability",
      "edgeCases",
      "feedback",
    ];
    for (const field of requiredFields) {
      if (!(field in scoreData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Ensure scores are within valid range
    const numericFields = [
      "overall",
      "coverage",
      "readability",
      "maintainability",
      "edgeCases",
    ];
    for (const field of numericFields) {
      if (
        typeof scoreData[field] !== "number" ||
        scoreData[field] < 0 ||
        scoreData[field] > 100
      ) {
        throw new Error(`Invalid score for ${field}: must be a number 0-100`);
      }
    }

    if (!Array.isArray(scoreData.feedback)) {
      throw new Error("Feedback must be an array");
    }

    return scoreData as QualityScore;
  } catch (error) {
    throw new Error(`Failed to parse quality score response: ${error}`);
  }
}

export async function generateTestsWithStreaming(
  sourceCode: string,
  language: string,
  framework: string,
  onChunk: (chunk: string) => void,
): Promise<TestGenerationResult> {
  const prompt = `You are an expert software engineer specializing in writing comprehensive test suites.

Generate a complete test suite for the following ${language} code using the ${framework} testing framework.

Source Code:
\`\`\`${language}
${sourceCode}
\`\`\`

Requirements:
1. Write comprehensive tests that cover all functions, methods, and classes
2. Include tests for:
   - Happy path scenarios (normal expected behavior)
   - Edge cases (boundary conditions, empty inputs, null values)
   - Error cases (invalid inputs, exceptions)
   - Integration between components if applicable
3. Use descriptive test names that explain what is being tested
4. Follow ${framework} best practices and conventions
5. Include setup and teardown where appropriate
6. Add comments explaining complex test scenarios
7. Ensure tests are independent and can run in any order

Generate ONLY the test code without any explanation. The tests should be production-ready and immediately runnable.`;

  let fullText = "";

  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  return {
    tests: fullText,
    language,
    framework,
  };
}
