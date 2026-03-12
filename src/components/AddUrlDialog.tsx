import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { previewUrlIntake } from "../lib/urlMetadata";
import type { ManualUrlIntake, SourceType, ThreadStatus } from "../types";

interface AddUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: ManualUrlIntake) => Promise<void>;
  onSeedInvestigation: (draft: ManualUrlIntake) => Promise<void>;
}

interface AutoManagedFields {
  title: boolean;
  summary: boolean;
  author: boolean;
  entities: boolean;
  sourceType: boolean;
}

const sourceTypeOptions: SourceType[] = [
  "researcher",
  "advisory",
  "gov",
  "community",
  "repo"
];

const threadStatusOptions: ThreadStatus[] = ["developing", "confirmed", "disputed", "watching"];

const initialDraft: ManualUrlIntake = {
  url: "",
  title: "",
  summary: "",
  sourceType: "researcher",
  status: "developing",
  author: "",
  entities: [],
  note: ""
};

const initialAutoManaged: AutoManagedFields = {
  title: false,
  summary: false,
  author: false,
  entities: false,
  sourceType: false
};

export function AddUrlDialog({
  open,
  onClose,
  onSubmit,
  onSeedInvestigation
}: AddUrlDialogProps) {
  const [draft, setDraft] = useState<ManualUrlIntake>(initialDraft);
  const [entityInput, setEntityInput] = useState("");
  const [error, setError] = useState("");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [discoveredLinks, setDiscoveredLinks] = useState<
    Array<{ url: string; domain: string; label: string }>
  >([]);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [autoManaged, setAutoManaged] = useState<AutoManagedFields>(initialAutoManaged);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState("");
  const draftRef = useRef(draft);
  const entityInputRef = useRef(entityInput);
  const autoManagedRef = useRef(autoManaged);
  const metadataRequestIdRef = useRef(0);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    entityInputRef.current = entityInput;
  }, [entityInput]);

  useEffect(() => {
    autoManagedRef.current = autoManaged;
  }, [autoManaged]);

  useEffect(() => {
    if (!open) {
      setDraft(initialDraft);
      setEntityInput("");
      setError("");
      setMetadataMessage("");
      setDiscoveredLinks([]);
      setIsFetchingMetadata(false);
      setIsSaving(false);
      setIsSeeding(false);
      setAutoManaged(initialAutoManaged);
      setLastAnalyzedUrl("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  function setManualField<K extends keyof ManualUrlIntake>(field: K, value: ManualUrlIntake[K]) {
    setDraft((current) => ({ ...current, [field]: value }));

    if (field === "title" || field === "summary" || field === "author") {
      setAutoManaged((current) => ({ ...current, [field]: false }));
    }

    if (field === "sourceType") {
      setAutoManaged((current) => ({ ...current, sourceType: false }));
    }
  }

  async function analyzeUrl(force = false) {
    const urlCandidate = draftRef.current.url.trim();

    if (!urlCandidate) {
      return;
    }

    if (!force && urlCandidate === lastAnalyzedUrl) {
      return;
    }

    const requestId = metadataRequestIdRef.current + 1;
    metadataRequestIdRef.current = requestId;
    setIsFetchingMetadata(true);
    setError("");
    setMetadataMessage("Analyzing URL and attempting metadata fetch.");

    try {
      const metadata = await previewUrlIntake(urlCandidate);

      if (metadataRequestIdRef.current !== requestId) {
        return;
      }

      const currentDraft = draftRef.current;
      const currentEntities = entityInputRef.current;
      const managed = autoManagedRef.current;
      const shouldReplaceTitle = !currentDraft.title?.trim() || managed.title;
      const shouldReplaceSummary = !currentDraft.summary?.trim() || managed.summary;
      const shouldReplaceAuthor = !currentDraft.author?.trim() || managed.author;
      const shouldReplaceEntities = !currentEntities.trim() || managed.entities;
      const shouldReplaceSourceType =
        currentDraft.sourceType === initialDraft.sourceType || managed.sourceType;

      setDraft({
        ...currentDraft,
        url: metadata.normalizedUrl,
        title: shouldReplaceTitle ? metadata.title ?? currentDraft.title : currentDraft.title,
        summary: shouldReplaceSummary
          ? metadata.summary ?? currentDraft.summary
          : currentDraft.summary,
        author: shouldReplaceAuthor ? metadata.author ?? currentDraft.author : currentDraft.author,
        sourceType: shouldReplaceSourceType
          ? metadata.sourceType ?? currentDraft.sourceType
          : currentDraft.sourceType
      });

      if (shouldReplaceEntities) {
        setEntityInput(metadata.entities.join(", "));
      }

      setAutoManaged({
        title: shouldReplaceTitle && Boolean(metadata.title),
        summary: shouldReplaceSummary && Boolean(metadata.summary),
        author: shouldReplaceAuthor && Boolean(metadata.author),
        entities: shouldReplaceEntities && metadata.entities.length > 0,
        sourceType: shouldReplaceSourceType && Boolean(metadata.sourceType)
      });
      setDiscoveredLinks(metadata.outboundLinks ?? []);
      setMetadataMessage(metadata.message);
      setLastAnalyzedUrl(metadata.normalizedUrl);
    } catch (metadataError) {
      setError(
        metadataError instanceof Error
          ? metadataError.message
          : "Unable to analyze the URL right now."
      );
    } finally {
      if (metadataRequestIdRef.current === requestId) {
        setIsFetchingMetadata(false);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.url.trim()) {
      setError("URL is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSubmit({
        ...draft,
        entities: entityInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to add the URL right now."
      );
      setIsSaving(false);
    }
  }

  async function handleSeedInvestigation() {
    if (!draft.url.trim()) {
      setError("URL is required.");
      return;
    }

    setIsSeeding(true);
    setError("");

    try {
      await onSeedInvestigation({
        ...draft,
        entities: entityInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to seed the investigation right now."
      );
      setIsSeeding(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="add-url-title"
        aria-modal="true"
        className="modal-card panel"
        role="dialog"
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">Manual intake</p>
            <h3 id="add-url-title">Add URL</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <p className="modal-copy">
          Paste a source URL and IntelDesk will derive a title immediately, then try to fetch page
          metadata if the source allows it. Manual edits always win once you type over a field.
        </p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-group">
            <span className="meta-text">URL</span>
            <div className="field-row">
              <input
                autoFocus
                className="search-input"
                onBlur={() => void analyzeUrl(false)}
                onChange={(event) => {
                  const nextUrl = event.target.value;
                  setDraft((current) => ({ ...current, url: nextUrl }));
                  if (nextUrl.trim() !== lastAnalyzedUrl) {
                    setMetadataMessage("URL changed. Analyze to refresh title and metadata.");
                    setDiscoveredLinks([]);
                  }
                }}
                placeholder="https://example.com/advisory"
                type="url"
                value={draft.url}
              />
              <button
                className="ghost-button"
                disabled={isFetchingMetadata || !draft.url.trim()}
                onClick={() => void analyzeUrl(true)}
                type="button"
              >
                {isFetchingMetadata ? "Analyzing..." : "Analyze URL"}
              </button>
            </div>
            <span className="field-help">
              Live fetch is best-effort only. Some sites will block browser-side metadata access.
            </span>
          </label>

          {metadataMessage ? (
            <p className="form-status" aria-live="polite">
              {metadataMessage}
            </p>
          ) : null}

          {discoveredLinks.length ? (
            <div className="detail-block preview-block">
              <h4>Discovered links</h4>
              <p className="modal-copy">
                Early signal for where a stronger seed-and-expand workflow can go next.
              </p>
              <div className="compact-list">
                {discoveredLinks.map((link) => (
                  <article key={link.url} className="compact-card">
                    <div className="thread-card-topline">
                      <span className="canonical-pill">{link.domain}</span>
                    </div>
                    <h5>{link.label}</h5>
                    <p>{link.url}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="form-grid">
            <label className="field-group">
              <span className="meta-text">Source Type</span>
              <select
                className="search-input"
                onChange={(event) =>
                  setManualField("sourceType", event.target.value as SourceType)
                }
                value={draft.sourceType}
              >
                {sourceTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span className="meta-text">Thread Status</span>
              <select
                className="search-input"
                onChange={(event) => setManualField("status", event.target.value as ThreadStatus)}
                value={draft.status}
              >
                {threadStatusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label className="field-group">
              <span className="meta-text">Title</span>
              <input
                className="search-input"
                onChange={(event) => setManualField("title", event.target.value)}
                placeholder="Derived from the URL or page metadata"
                type="text"
                value={draft.title ?? ""}
              />
            </label>

            <label className="field-group">
              <span className="meta-text">Author</span>
              <input
                className="search-input"
                onChange={(event) => setManualField("author", event.target.value)}
                placeholder="Optional"
                type="text"
                value={draft.author ?? ""}
              />
            </label>
          </div>

          <label className="field-group">
            <span className="meta-text">Summary</span>
            <textarea
              className="search-input text-area"
              onChange={(event) => setManualField("summary", event.target.value)}
              placeholder="Optional thread summary for the Inbox card"
              rows={4}
              value={draft.summary ?? ""}
            />
          </label>

          <label className="field-group">
            <span className="meta-text">Entities</span>
            <input
              className="search-input"
              onChange={(event) => {
                setEntityInput(event.target.value);
                setAutoManaged((current) => ({ ...current, entities: false }));
              }}
              placeholder="CVE-2026-1182, Ivanti, Connect Secure"
              type="text"
              value={entityInput}
            />
          </label>

          <label className="field-group">
            <span className="meta-text">Intake Note</span>
            <textarea
              className="search-input text-area"
              onChange={(event) => setManualField("note", event.target.value)}
              placeholder="Why this looks worth tracking, or what changed"
              rows={3}
              value={draft.note ?? ""}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="detail-actions">
            <button
              className="ghost-button"
              disabled={isSaving || isSeeding}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="ghost-button"
              disabled={isSaving || isSeeding}
              type="button"
              onClick={() => void handleSeedInvestigation()}
            >
              {isSeeding ? "Seeding..." : "Seed & Expand"}
            </button>
            <button
              className="ghost-button primary-button"
              disabled={isSaving || isSeeding}
              type="submit"
            >
              {isSaving ? "Adding..." : "Add to Inbox"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
