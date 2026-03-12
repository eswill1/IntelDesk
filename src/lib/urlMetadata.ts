import type { ManualUrlMetadata, SourceType } from "../types";

const cvePattern = /\bCVE-\d{4}-\d{4,7}\b/gi;
const timeoutMs = 4500;

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeUrlInput(rawUrl: string) {
  const trimmed = rawUrl.trim();

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

function toHeadline(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function deriveTitleFromUrl(url: URL) {
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

function guessSourceType(url: URL): SourceType {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host.endsWith(".gov")) {
    return "gov";
  }

  if (
    host.includes("github.com") ||
    host.includes("gitlab.com") ||
    host.includes("bitbucket.org")
  ) {
    return "repo";
  }

  if (
    host.includes("reddit.com") ||
    host.includes("bsky.app") ||
    host.includes("x.com") ||
    host.includes("twitter.com") ||
    host.includes("news.ycombinator.com")
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

function extractEntities(...sources: Array<string | undefined>) {
  const matches = sources.flatMap((item) => item?.match(cvePattern) ?? []);
  return uniqueValues(matches.map((item) => item.toUpperCase()));
}

function readMeta(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value = document.querySelector<HTMLMetaElement>(selector)?.content?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function deriveMetadata(url: URL): ManualUrlMetadata {
  const title = deriveTitleFromUrl(url);
  const summary = `Derived from ${url.hostname.replace(/^www\./, "")} while waiting for direct fetch or manual notes.`;

  return {
    normalizedUrl: url.toString(),
    title,
    summary,
    entities: extractEntities(url.pathname, url.search),
    outboundLinks: [],
    sourceType: guessSourceType(url),
    strategy: "derived",
    message: "Using URL-derived hints. Live metadata fetch may be blocked by the source."
  };
}

async function fetchUrlMetadataInBrowser(rawUrl: string): Promise<ManualUrlMetadata> {
  const normalizedUrl = normalizeUrlInput(rawUrl);
  const fallback = deriveMetadata(normalizedUrl);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(normalizedUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || !contentType.includes("html")) {
      return fallback;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");
    const title =
      readMeta(document, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]'
      ]) ?? document.querySelector("title")?.textContent?.trim();
    const summary = readMeta(document, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]'
    ]);
    const author = readMeta(document, [
      'meta[name="author"]',
      'meta[property="article:author"]'
    ]);
    const combinedEntities = extractEntities(
      title,
      summary,
      document.body?.textContent?.slice(0, 2000),
      normalizedUrl.pathname,
      normalizedUrl.search
    );

    return {
      normalizedUrl: normalizedUrl.toString(),
      title: title || fallback.title,
      summary: summary || fallback.summary,
      author,
      entities: combinedEntities,
      outboundLinks: [],
      sourceType: fallback.sourceType,
      strategy: "fetched",
      message: "Fetched page metadata directly from the source."
    };
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isPreviewResponse(payload: unknown): payload is ManualUrlMetadata {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "normalizedUrl" in payload &&
      "entities" in payload &&
      "message" in payload
  );
}

export async function previewUrlIntake(rawUrl: string): Promise<ManualUrlMetadata> {
  const normalizedUrl = normalizeUrlInput(rawUrl);

  try {
    const response = await fetch("/api/intake/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: normalizedUrl.toString()
      })
    });

    if (response.ok) {
      const payload = (await response.json()) as unknown;

      if (isPreviewResponse(payload)) {
        return payload;
      }
    }
  } catch {
    // Fall back to browser-side hints when the preview API is unavailable.
  }

  return fetchUrlMetadataInBrowser(normalizedUrl.toString());
}
