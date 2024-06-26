/**
 * The Embeddings Generator worker processes text and returns its corresponding embedding. 
 * This worker demonstrates the capability to convert text input into a numerical representation, 
 * useful for tasks such as semantic search, text classification, and other AI applications.
 */

import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    AI: Ai;
  }
}

describe("Embeddings generator", () => {
  /**
   * This test checks the fundamental functionality of the Embeddings Generator worker.
   * 
   * Input: An HTTP POST request with a JSON body containing text.
   * Expected Output: A JSON response with status 200, containing an 'embedding' array of numbers.
   */
  it("returns embedding for given text", async () => {
    const response = await SELF.fetch("https://example.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `South Korean crypto exchange GDAC hacked for nearly $14M
~
#NFTnews #NFTCommunity #Crypto`,
      }),
    });

    // Check that the response status is 200
    expect(response.status).toBe(200);

    // Check that the response has a JSON content type
    const contentType = response.headers.get("Content-Type");
    expect(contentType).toContain("application/json");

    const result = await response.json<{ embedding: number[] }>();

    // Check that the result is an object containing an 'embedding' property
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("embedding");

    // Check that 'embedding' is an array of numbers
    expect(Array.isArray(result.embedding)).toBe(true);
    expect(result.embedding.every((x) => typeof x === "number")).toBeTruthy();
  });
});
