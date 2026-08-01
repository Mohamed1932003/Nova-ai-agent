import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createSearchKnowledgeBase } from "./tools.js";

const checkpointer = new MemorySaver();

export async function runAgent({ sessionId = "default", message, namespace }) {
  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-3.6-flash",
      temperature: 0,
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    });

    const agent = createAgent({
      model,
      tools: [createSearchKnowledgeBase(namespace)],
      checkpointer,
      systemPrompt: `
You answer questions using only the currently uploaded PDF.
Always search the knowledge base before answering.
Never use general knowledge, guess, or answer from another document.
If the search returns NO_RELEVANT_DOCUMENT_CONTEXT, reply exactly:
"Sorry, that question is not covered by the uploaded document."
Be concise and answer in the user's language.
`,
    });

    const response = await agent.invoke(
      { messages: [{ role: "user", content: message }] },
      { configurable: { thread_id: sessionId } }
    );

    const lastMessage = response.messages[response.messages.length - 1];
    return { output: lastMessage?.content || "" };
  } catch (error) {
    console.error("Error in runAgent:", error);
    throw error;
  }
}
