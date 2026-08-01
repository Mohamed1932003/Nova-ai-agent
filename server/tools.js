import { tool } from "langchain";
import { z } from "zod";
import { PineconeStore, PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

export const createSearchKnowledgeBase = (namespace) => {
  const getVectorStore = async () => {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX;

    if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
    if (!indexName) throw new Error("Missing PINECONE_INDEX");
    if (!namespace) throw new Error("Upload a PDF before asking questions");

    const pc = new PineconeClient({ apiKey });
    const index = pc.Index(indexName);
    const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

    return PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace,
    });
  };

  return tool(
    async ({ query }) => {
      console.log(`Searching namespace ${namespace} for: "${query}"`);
      const store = await getVectorStore();
      const results = await store.similaritySearch(query, 10);

      if (results.length === 0) return "NO_RELEVANT_DOCUMENT_CONTEXT";
      return results.map((doc) => doc.pageContent).join("\n\n---\n\n");
    },
    {
      name: "search_knowledge_base",
      description: "Searches only the currently uploaded PDF for relevant information.",
      schema: z.object({ query: z.string().describe("The question to search for in the uploaded PDF") }),
    }
  );
};
