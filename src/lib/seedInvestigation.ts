import type { SeedInvestigationJob } from "../types";

interface StartSeedInvestigationResponse {
  jobId: string;
  status: SeedInvestigationJob["status"];
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function startSeedInvestigation(url: string) {
  const response = await fetch("/api/intake/seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  return readJsonResponse<StartSeedInvestigationResponse>(response);
}

export async function getSeedInvestigationJob(jobId: string) {
  const response = await fetch(`/api/intake/jobs/${jobId}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  return readJsonResponse<SeedInvestigationJob>(response);
}

export async function waitForSeedInvestigationJob(
  jobId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
  }
) {
  const maxAttempts = options?.maxAttempts ?? 24;
  const intervalMs = options?.intervalMs ?? 900;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await getSeedInvestigationJob(jobId);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error ?? "Seed investigation failed.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("Seed investigation timed out.");
}
