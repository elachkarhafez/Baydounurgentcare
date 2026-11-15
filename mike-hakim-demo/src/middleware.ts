import { NextResponse, type NextRequest } from "next/server";

/**
 * Blocks AI crawlers, scrapers and headless clients (same list as Mike's live
 * site). Requests with no User-Agent are blocked too. Tests set a normal
 * browser User-Agent.
 */
const DENY = new RegExp(String.raw`(GPTBot|ChatGPT|OAI\-SearchBot|OpenAI|ClaudeBot|Claude\-User|Claude\-SearchBot|Claude\-Web|Claude|anthropic|CCBot|PerplexityBot|Perplexity|Bytespider|TikTokSpider|Amazonbot|meta\-externalagent|meta\-externalfetcher|FacebookBot|cohere|Diffbot|YouBot|Omgilibot|omgili|ImagesiftBot|Timpibot|AI2Bot|Ai2Bot\-Dolma|DuckAssistBot|MistralAI|PanguBot|Kangaroo\sBot|img2dataset|webzio|Novellum|Brightbot|iaskspider|ICC\-Crawler|Scrapy|Google\-CloudVertexBot|GoogleOther|GoogleAgent|Google\-NotebookLM|Gemini|Devin|FirecrawlAgent|Firecrawl|Crawl4AI|Jina|TavilyBot|Manus|DeepSeek|Grok|xAI|Kimi|Doubao|YisouSpider|PetalBot|Andibot|bigsur\.ai|Cotoyogi|Factset|FriendlyCrawler|ISSCyberRiskCrawler|Meltwater|Quora\-Bot|Sidetrade|VelenPublicWebCrawler|wpbot|LinerBot|Thinkbot|Character\-AI|Applebot\-Extended|HeadlessChrome|Headless|Puppeteer|puppeteer|Playwright|playwright|PhantomJS|Selenium|selenium|python\-requests|python\-httpx|python\-urllib|aiohttp|httpx|curl/|Wget|wget|Go\-http\-client|node\-fetch|undici|axios|okhttp|Java/|libwww|HTTrack|SiteSucker|WebCopier|Teleport|Offline\sExplorer|Apify|ScrapingBee|Zyte|ZenRows|Bright\sData|colly|Nutch|Screaming\sFrog|SemrushBot\-OCOB|Ahrefs\-Bot\-AI)`);

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent");
  if (!ua || DENY.test(ua)) return new NextResponse("Forbidden", { status: 403, headers: { "x-robots-tag": "noai, noimageai, noindex" } });
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noai, noimageai, noarchive, noindex");
  res.headers.set("TDM-Reservation", "1");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|photos/|favicon|icon.svg|og.jpg|apple-touch-icon.png).*)"] };
