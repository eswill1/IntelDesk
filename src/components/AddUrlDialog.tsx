import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ManualUrlIntake, SourceType, ThreadStatus } from "../types";

interface AddUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: ManualUrlIntake) => Promise<void>;
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

export function AddUrlDialog({ open, onClose, onSubmit }: AddUrlDialogProps) {
  const [draft, setDraft] = useState<ManualUrlIntake>(initialDraft);
  const [entityInput, setEntityInput] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(initialDraft);
      setEntityInput("");
      setError("");
      setIsSaving(false);
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
          Capture a source into the local workbench now. Full fetch and reader-mode extraction can
          layer on top of this later.
        </p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-group">
            <span className="meta-text">URL</span>
            <input
              autoFocus
              className="search-input"
              onChange={(event) =>
                setDraft((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="https://example.com/advisory"
              type="url"
              value={draft.url}
            />
          </label>

          <div className="form-grid">
            <label className="field-group">
              <span className="meta-text">Source Type</span>
              <select
                className="search-input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sourceType: event.target.value as SourceType
                  }))
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
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ThreadStatus
                  }))
                }
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
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Optional, otherwise derived from the URL"
                type="text"
                value={draft.title ?? ""}
              />
            </label>

            <label className="field-group">
              <span className="meta-text">Author</span>
              <input
                className="search-input"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, author: event.target.value }))
                }
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="Optional thread summary for the Inbox card"
              rows={4}
              value={draft.summary ?? ""}
            />
          </label>

          <label className="field-group">
            <span className="meta-text">Entities</span>
            <input
              className="search-input"
              onChange={(event) => setEntityInput(event.target.value)}
              placeholder="CVE-2026-1182, Ivanti, Connect Secure"
              type="text"
              value={entityInput}
            />
          </label>

          <label className="field-group">
            <span className="meta-text">Intake Note</span>
            <textarea
              className="search-input text-area"
              onChange={(event) =>
                setDraft((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Why this looks worth tracking, or what changed"
              rows={3}
              value={draft.note ?? ""}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="detail-actions">
            <button className="ghost-button" disabled={isSaving} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="ghost-button primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Adding..." : "Add to Inbox"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
