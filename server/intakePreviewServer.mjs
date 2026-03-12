import { createServer } from "node:http";

const port = Number(process.env.INTELDESK_API_PORT || 4100);
const host = process.env.INTELDESK_API_HOST || "127.0.0.1";
const requestTimeoutMs = 6500;
const cvePattern = /\bCVE-\d{4}-\d{4,7}\b/gi;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function normalizeUrlInput(rawUrl) {
  const trimmed = String(rawUrl || "").trim();

  if (!trimmed) {
    throw new Error("URL is required.");
  }

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      throw new Error("Enter a valid URL.");
    }
  }
}

function toHeadline(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function deriveTitleFromUrl(url) {
  const pathSegments = url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const candidate = pathSegments[pathSegments.length - 1];

  if (candidate) {
    return toHeadline(decodeURIComponent(candidate));
  }

  return url.hostname.replace(/^www\./, "");
}

function guessSourceType(url) {
  const hostName = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.toLowerCase();

  if (hostName.endsWith(".gov")) {
    return "gov";
  }

  if (
    hostName.includes("github.com") ||
    hostName.includes("gitlab.com") ||
    hostName.includes("bitbucket.org")
  ) {
    return "repo";
  }

  if (
    hostName.includes("reddit.com") ||
    hostName.includes("bsky.app") ||
    hostName.includes("x.com") ||
    hostName.includes("twitter.com") ||
    hostName.includes("news.ycombinator.com")
  ) {
    return "community";
  }

  if (
    path.includes("advisory") ||
    path.includes("security") ||
    path.includes("bulletin") ||
    path.includes("update-guide") ||
    path.includes("psirt") ||
    path.includes("kev")
  ) {
    return "advisory";
  }

  return "researcher";
}

function extractEntities(...sources) {
  const matches = sources.flatMap((item) => String(item || "").match(cvePattern) || []);
  return uniqueValues(matches.map((item) => item.toUpperCase()));
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCharCode(Number(codePoint)));
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function readMeta(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

function readTitle(html) {
  return readMeta(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<title[^>]*>([^<]+)<\/title>/i
  ]);
}

function readSummary(html) {
  return readMeta(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ]);
}

function readAuthor(html) {
  return readMeta(html, [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ]);
}

function extractOutboundLinks(html, baseUrl) {
  const links = [];
  const hrefPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    const rawLabel = stripHtml(match[2]);

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);

      if (!/^https?:$/i.test(resolved.protocol)) {
        continue;
      }

      if (resolved.toString() === baseUrl.toString()) {
        continue;
      }

      links.push({
        url: resolved.toString(),
        domain: resolved.hostname.replace(/^www\./, ""),
        label: rawLabel || deriveTitleFromUrl(resolved)
      });
    } catch {
      // Ignore malformed link targets.
    }
  }

  return Array.from(new Map(links.map((link) => [link.url, link])).values()).slice(0, 8);
}

function deriveMetadata(url) {
  const title = deriveTitleFromUrl(url);
  const summary = `Derived from ${url.hostname.replace(/^www\./, "")} while waiting for server-side fetch enrichment.`;

  return {
    normalizedUrl: url.toString(),
    title,
    summary,
    entities: extractEntities(url.pathname, url.search),
    outboundLinks: [],
    sourceType: guessSourceType(url),
    strategy: "derived",
    message: "Using URL-derived hints. Server-side fetch may fail for some sites, but the expansion path is ready."
  };
}

async function fetchPreview(url) {
  const fallback = deriveMetadata(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.includes("html")) {
      return fallback;
    }

    const html = await response.text();
    const title = readTitle(html) || fallback.title;
    const summary = readSummary(html) || fallback.summary;
    const author = readAuthor(html);
    const bodyText = stripHtml(html).slice(0, 3000);
    const outboundLinks = extractOutboundLinks(html, url);

    return {
      normalizedUrl: url.toString(),
      title,
      summary,
      author,
      entities: extractEntities(title, summary, bodyText, url.pathname, url.search),
      outboundLinks,
      sourceType: fallback.sourceType,
      strategy: "server",
      message: `Fetched page metadata on the server and discovered ${outboundLinks.length} outbound links.`
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Missing request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    });
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/intake/preview") {
    try {
      const rawBody = await readRequestBody(request);
      const payload = JSON.parse(rawBody || "{}");
      const normalizedUrl = normalizeUrlInput(payload.url);
      const preview = await fetchPreview(normalizedUrl);

      sendJson(response, 200, preview);
      return;
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to preview the URL."
      });
      return;
    }
  }

  sendJson(response, 404, { error: "Not found." });
});

server.listen(port, host, () => {
  console.log(`IntelDesk preview API listening on http://${host}:${port}`);
});
