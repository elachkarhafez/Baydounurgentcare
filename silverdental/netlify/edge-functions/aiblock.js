// Deny AI crawlers (same list as vercel.json) and tag every response noai.
const BOT = new RegExp(".*(GPTBot|ChatGPT\\-User|OAI\\-SearchBot|ClaudeBot|Claude\\-User|Claude\\-SearchBot|Claude\\-Web|anthropic\\-ai|CCBot|PerplexityBot|Perplexity\\-User|Bytespider|Amazonbot|meta\\-externalagent|meta\\-externalfetcher|cohere\\-ai|cohere\\-training\\-data\\-crawler|Diffbot|YouBot|Omgilibot|omgili|ImagesiftBot|Timpibot|AI2Bot|Ai2Bot\\-Dolma|DuckAssistBot|MistralAI\\-User|PanguBot|Kangaroo\\sBot|img2dataset|webzio\\-extended|Novellum|Brightbot|iaskspider|ICC\\-Crawler|Scrapy|Google\\-CloudVertexBot|GoogleAgent\\-Mariner|Devin|FirecrawlAgent|Crawl4AI|Jina|TavilyBot|Manus\\-User).*", 'i');
export default async (req, ctx) => {
  if (BOT.test(req.headers.get('user-agent') || '')) return new Response('Forbidden', { status: 403 });
  const res = await ctx.next();
  res.headers.set('X-Robots-Tag', 'noai, noimageai');
  return res;
};
export const config = { path: '/*' };
