import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const ai = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "CCBot", "PerplexityBot", "Bytespider", "Google-Extended", "Applebot-Extended", "meta-externalagent", "Amazonbot", "cohere-ai", "Diffbot"];
  return { rules: [...ai.map((a) => ({ userAgent: a, disallow: "/" })), { userAgent: "*", disallow: "/dashboard" }] };
}
