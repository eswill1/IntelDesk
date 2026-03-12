import type {
  Thread,
  ThreadLifecycleState,
  ThreadQueueSection,
  ThreadQueueState,
  ThreadState,
  ThreadWorkflowView
} from "../types";

const noChangeSentinel = "No new changes since the last review.";

const queueMeta: Record<
  ThreadQueueState,
  {
    title: string;
    description: string;
    badge: string;
  }
> = {
  "new-delta": {
    title: "Reactivated by delta",
    description: "Cards you reviewed earlier but that changed enough to deserve another pass.",
    badge: "New Δ"
  },
  new: {
    title: "Needs review",
    description: "Fresh cards that still need a triage decision.",
    badge: "New"
  },
  watching: {
    title: "Watch queue",
    description: "Interesting enough to keep alive without promoting into a full case yet.",
    badge: "Watch queue"
  },
  reviewed: {
    title: "Reviewed",
    description: "Looked at already. These stay out of the way until a real delta lands.",
    badge: "Reviewed"
  },
  "in-case": {
    title: "Already in cases",
    description: "Cards that already have a durable workspace elsewhere in the product.",
    badge: "In case"
  },
  muted: {
    title: "Muted",
    description: "Suppressed from the main queue unless you deliberately reopen them.",
    badge: "Muted"
  }
};

const queueOrder: ThreadQueueState[] = [
  "new-delta",
  "new",
  "watching",
  "reviewed",
  "in-case",
  "muted"
];

function compareDescendingTimestamps(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
}

function hasTimestampChangedSince(thread: Thread, baseline?: string) {
  if (!baseline) {
    return false;
  }

  return new Date(thread.lastUpdated).getTime() > new Date(baseline).getTime();
}

export function hasMeaningfulThreadChange(thread: Thread) {
  return thread.changeHighlights.some((item) => item !== noChangeSentinel);
}

export function getThreadQueueMeta(queueState: ThreadQueueState) {
  return queueMeta[queueState];
}

export function buildThreadWorkflowView(
  thread: Thread,
  threadState?: ThreadState
): ThreadWorkflowView {
  const state: ThreadLifecycleState = threadState?.state ?? "new";
  const hasMeaningfulDelta =
    hasMeaningfulThreadChange(thread) &&
    hasTimestampChangedSince(
      thread,
      threadState?.lastReviewedAt ?? threadState?.lastOpenedAt ?? threadState?.firstSeenAt
    );

  let queueState: ThreadQueueState;

  if (state === "muted") {
    queueState = "muted";
  } else if (state === "in_case") {
    queueState = "in-case";
  } else if (state === "watching") {
    queueState = "watching";
  } else if (state === "reviewed" && hasMeaningfulDelta) {
    queueState = "new-delta";
  } else if (state === "reviewed") {
    queueState = "reviewed";
  } else {
    queueState = "new";
  }

  return {
    threadId: thread.id,
    state,
    queueState,
    hasMeaningfulDelta,
    lastOpenedAt: threadState?.lastOpenedAt,
    lastReviewedAt: threadState?.lastReviewedAt,
    lastReactivatedAt: threadState?.lastReactivatedAt,
    caseId: threadState?.caseId
  };
}

export function buildThreadWorkflowMap(threads: Thread[], threadStates: ThreadState[]) {
  const stateByThreadId = threadStates.reduce<Record<string, ThreadState>>((accumulator, item) => {
    accumulator[item.threadId] = item;
    return accumulator;
  }, {});

  return threads.reduce<Record<string, ThreadWorkflowView>>((accumulator, thread) => {
    accumulator[thread.id] = buildThreadWorkflowView(thread, stateByThreadId[thread.id]);
    return accumulator;
  }, {});
}

export function sortThreadsForInbox(
  threads: Thread[],
  workflowMap: Record<string, ThreadWorkflowView>
) {
  return [...threads].sort((left, right) => {
    const leftWorkflow = workflowMap[left.id];
    const rightWorkflow = workflowMap[right.id];
    const leftRank = queueOrder.indexOf(leftWorkflow?.queueState ?? "new");
    const rightRank = queueOrder.indexOf(rightWorkflow?.queueState ?? "new");

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return compareDescendingTimestamps(left.lastUpdated, right.lastUpdated);
  });
}

export function buildThreadQueueSections(
  threads: Thread[],
  workflowMap: Record<string, ThreadWorkflowView>
): ThreadQueueSection[] {
  return queueOrder
    .map((queueState) => {
      const matchingThreads = threads.filter(
        (thread) => workflowMap[thread.id]?.queueState === queueState
      );

      if (!matchingThreads.length) {
        return null;
      }

      return {
        id: queueState,
        title: queueMeta[queueState].title,
        description: queueMeta[queueState].description,
        threads: matchingThreads
      };
    })
    .filter((section): section is ThreadQueueSection => section !== null);
}
