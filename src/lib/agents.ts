import type {
  AgentCardMatch,
  AgentDefinition,
  AgentView,
  Thread,
  ThreadWorkflowView
} from "../types";

function normalizeValue(value: string) {
  return value.toLowerCase();
}

function buildThreadHaystack(thread: Thread) {
  return normalizeValue(
    [
      thread.title,
      thread.summary,
      thread.status,
      ...thread.entities,
      ...thread.changeHighlights,
      ...thread.analystNotes,
      ...thread.sources.flatMap((source) => [
        source.title,
        source.domain,
        source.author,
        source.excerpt,
        source.sourceType,
        ...source.entities
      ])
    ].join(" ")
  );
}

function scoreThreadForAgent(thread: Thread, agent: AgentDefinition): AgentCardMatch | null {
  const haystack = buildThreadHaystack(thread);
  const matchedEntities = agent.entityHints.filter((entity) =>
    haystack.includes(normalizeValue(entity))
  );
  const matchedKeywords = agent.keywords.filter((keyword) =>
    haystack.includes(normalizeValue(keyword))
  );
  const matchedSourceTypes = (agent.sourceTypes ?? []).filter((sourceType) =>
    thread.sources.some((source) => source.sourceType === sourceType)
  );
  const score =
    matchedEntities.length * 5 + matchedKeywords.length * 3 + matchedSourceTypes.length;

  if (matchedEntities.length === 0 && matchedKeywords.length === 0) {
    return null;
  }

  if (score < 4) {
    return null;
  }

  const reasons = [];

  if (matchedEntities.length > 0) {
    reasons.push(`Entity match: ${matchedEntities.slice(0, 3).join(", ")}`);
  }

  if (matchedKeywords.length > 0) {
    reasons.push(`Topic match: ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  if (matchedSourceTypes.length > 0) {
    reasons.push(`Source classes present: ${matchedSourceTypes.join(", ")}`);
  }

  return {
    threadId: thread.id,
    score,
    reasons
  };
}

export function buildAgentViews(
  agents: AgentDefinition[],
  threads: Thread[],
  workflowMap: Record<string, ThreadWorkflowView>
): AgentView[] {
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));

  return [...agents]
    .map((agent) => {
      const matches = threads
        .map((thread) => scoreThreadForAgent(thread, agent))
        .filter((match): match is AgentCardMatch => match !== null)
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }

          return (
            new Date(threadById.get(right.threadId)?.lastUpdated ?? 0).getTime() -
            new Date(threadById.get(left.threadId)?.lastUpdated ?? 0).getTime()
          );
        });

      const matchedThreads = matches
        .map((match) => threadById.get(match.threadId))
        .filter((thread): thread is Thread => Boolean(thread));

      return {
        ...agent,
        matches,
        threadCount: matchedThreads.length,
        newDeltaCount: matchedThreads.filter(
          (thread) => workflowMap[thread.id]?.queueState === "new-delta"
        ).length,
        watchCount: matchedThreads.filter(
          (thread) => workflowMap[thread.id]?.queueState === "watching"
        ).length,
        inCaseCount: matchedThreads.filter(
          (thread) => workflowMap[thread.id]?.queueState === "in-case"
        ).length,
        latestActivityAt: matchedThreads[0]?.lastUpdated
      };
    })
    .sort((left, right) => {
      if (left.newDeltaCount !== right.newDeltaCount) {
        return right.newDeltaCount - left.newDeltaCount;
      }

      if (left.threadCount !== right.threadCount) {
        return right.threadCount - left.threadCount;
      }

      return (
        new Date(right.latestActivityAt ?? 0).getTime() -
        new Date(left.latestActivityAt ?? 0).getTime()
      );
    });
}

export function getAgentMatchesForThread(agentViews: AgentView[], threadId: string) {
  return agentViews.flatMap((agent) => {
    const match = agent.matches.find((item) => item.threadId === threadId);

    return match ? [{ agent, match }] : [];
  });
}
