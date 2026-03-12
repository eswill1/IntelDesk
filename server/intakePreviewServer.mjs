import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number(process.env.INTELDESK_API_PORT || 4100);
const host = process.env.INTELDESK_API_HOST || "127.0.0.1";
const dataDir =
  process.env.INTELDESK_API_DATA_DIR || fileURLToPath(new URL("./data", import.meta.url));
const seedJobsPath = `${dataDir}/seed-jobs.json`;
const requestTimeoutMs = 6500;
const maxOutboundLinks = 8;
const maxExpansionCandidates = 6;
const cvePattern = /\bCVE-\d{4}-\d{4,7}\b/gi;
let jobMutationChain = Promise.resolve();

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

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function isLikelyNoiseLink(resolvedUrl, label) {
  const noisyTerms = ["privacy", "terms", "contact", "about", "copyright", "cookies"];
  const path = resolvedUrl.pathname.toLowerCase();
  const normalizedLabel = label.toLowerCase();

  return noisyTerms.some((term) => path.includes(term) || normalizedLabel.includes(term));
}

function extractOutboundLinks(html, baseUrl) {
  const links = [];
  const hrefPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    const rawLabel = stripHtml(match[2]);

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("javascript:")
    ) {
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

      const label = rawLabel || deriveTitleFromUrl(resolved);

      if (isLikelyNoiseLink(resolved, label)) {
        continue;
      }

      links.push({
        url: resolved.toString(),
        domain: resolved.hostname.replace(/^www\./, ""),
        label
      });
    } catch {
      // Ignore malformed link targets.
    }
  }

  return Array.from(new Map(links.map((link) => [link.url, link])).values()).slice(0, maxOutboundLinks);
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
  } catch (error) {
    console.error("preview fetch failed", error);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function getSourceTypeWeight(sourceType) {
  switch (sourceType) {
    case "advisory":
      return 18;
    case "gov":
      return 17;
    case "researcher":
      return 15;
    case "repo":
      return 11;
    case "community":
      return 4;
    default:
      return 0;
  }
}

function buildSeedCandidate(seedPreview, linkPreview, link) {
  const sharedEntities = linkPreview.entities.filter((entity) =>
    seedPreview.entities.includes(entity)
  );
  const reasons = [];

  if (sharedEntities.length) {
    reasons.push(`Shared entities: ${sharedEntities.join(", ")}`);
  }

  if (link.domain !== new URL(seedPreview.normalizedUrl).hostname.replace(/^www\./, "")) {
    reasons.push(`Independent source domain: ${link.domain}`);
  }

  if (linkPreview.sourceType) {
    reasons.push(`Source type looks ${linkPreview.sourceType}.`);
  }

  if (link.label && link.label !== linkPreview.title) {
    reasons.push(`Linked from the seed source as "${link.label}".`);
  }

  if (reasons.length === 0) {
    reasons.push("Discovered as an outbound link from the seed source.");
  }

  const score =
    sharedEntities.length * 35 +
    getSourceTypeWeight(linkPreview.sourceType) +
    (linkPreview.strategy === "server" ? 8 : 2) +
    (link.domain !== new URL(seedPreview.normalizedUrl).hostname.replace(/^www\./, "") ? 10 : 0);

  return {
    url: linkPreview.normalizedUrl,
    domain: link.domain,
    title: linkPreview.title || link.label,
    summary: linkPreview.summary,
    author: linkPreview.author,
    entities: linkPreview.entities,
    sourceType: linkPreview.sourceType || "researcher",
    score,
    relationReasons: reasons,
    strategy: linkPreview.strategy
  };
}

async function expandSeedPreview(seedPreview) {
  const previews = await Promise.all(
    (seedPreview.outboundLinks || [])
      .slice(0, maxExpansionCandidates)
      .map(async (link) => {
        try {
          const preview = await fetchPreview(new URL(link.url));
          return buildSeedCandidate(seedPreview, preview, link);
        } catch {
          return null;
        }
      })
  );

  return previews
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxExpansionCandidates);
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readSeedJobs() {
  await ensureDataDir();

  try {
    const raw = await readFile(seedJobsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeSeedJobs(jobs) {
  await ensureDataDir();
  await writeFile(seedJobsPath, JSON.stringify(jobs, null, 2));
}

function mutateSeedJobs(mutator) {
  jobMutationChain = jobMutationChain
    .catch(() => undefined)
    .then(async () => {
      const jobs = await readSeedJobs();
      const result = await mutator(jobs);
      await writeSeedJobs(jobs);
      return result;
    });

  return jobMutationChain;
}

async function getSeedJob(jobId) {
  const jobs = await readSeedJobs();
  return jobs.find((job) => job.id === jobId);
}

function updateSeedJob(jobId, updater) {
  return mutateSeedJobs((jobs) => {
    const jobIndex = jobs.findIndex((job) => job.id === jobId);

    if (jobIndex === -1) {
      throw new Error(`Seed job ${jobId} was not found.`);
    }

    const nextJob = updater(jobs[jobIndex]);
    jobs[jobIndex] = nextJob;
    return nextJob;
  });
}

async function createSeedJob(seedUrl) {
  const now = new Date().toISOString();
  const job = {
    id: createId("seed-job"),
    status: "queued",
    seedUrl,
    createdAt: now,
    updatedAt: now,
    candidates: []
  };

  await mutateSeedJobs((jobs) => {
    jobs.push(job);
    return job;
  });

  return job;
}

async function processSeedInvestigationJob(jobId) {
  try {
    const runningAt = new Date().toISOString();
    const runningJob = await updateSeedJob(jobId, (job) => ({
      ...job,
      status: "running",
      updatedAt: runningAt
    }));
    const seedPreview = await fetchPreview(new URL(runningJob.seedUrl));
    const candidates = await expandSeedPreview(seedPreview);
    const completedAt = new Date().toISOString();

    await updateSeedJob(jobId, (job) => ({
      ...job,
      status: "completed",
      updatedAt: completedAt,
      seed: seedPreview,
      candidates
    }));
  } catch (error) {
    const failedAt = new Date().toISOString();

    await updateSeedJob(jobId, (job) => ({
      ...job,
      status: "failed",
      updatedAt: failedAt,
      error: error instanceof Error ? error.message : "Seed investigation failed."
    }));
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

  if (request.method === "POST" && requestUrl.pathname === "/api/intake/seed") {
    try {
      const rawBody = await readRequestBody(request);
      const payload = JSON.parse(rawBody || "{}");
      const normalizedUrl = normalizeUrlInput(payload.url).toString();
      const job = await createSeedJob(normalizedUrl);

      queueMicrotask(() => {
        void processSeedInvestigationJob(job.id);
      });

      sendJson(response, 202, {
        jobId: job.id,
        status: job.status
      });
      return;
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to start seed investigation."
      });
      return;
    }
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/intake/jobs/")) {
    const jobId = requestUrl.pathname.replace("/api/intake/jobs/", "").trim();

    if (!jobId) {
      sendJson(response, 400, { error: "Missing job id." });
      return;
    }

    try {
      const job = await getSeedJob(jobId);

      if (!job) {
        sendJson(response, 404, { error: "Seed job not found." });
        return;
      }

      sendJson(response, 200, job);
      return;
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to read seed job."
      });
      return;
    }
  }

  sendJson(response, 404, { error: "Not found." });
});

await ensureDataDir();

server.listen(port, host, () => {
  console.log(`IntelDesk preview API listening on http://${host}:${port}`);
});
