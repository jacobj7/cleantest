import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const openai = {
  chat: {
    completions: {
      create: async (opts: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
      }) => {
        const messages = opts.messages.filter((m) => m.role !== "system");
        const systemMsg = opts.messages.find((m) => m.role === "system");
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: opts.max_tokens ?? 1024,
          system: systemMsg?.content,
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });
        const content = response.content[0];
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: content.type === "text" ? content.text : "",
              },
            },
          ],
        };
      },
    },
  },
};
