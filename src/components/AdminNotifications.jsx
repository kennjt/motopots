import { useEffect, useState } from "react";
import {
  NOTIFICATIONS_UPDATED_EVENT,
  readOperationalNotices,
  saveOperationalNotices,
} from "../data/notificationStorage";
import { showConfirm, showSuccess } from "../utils/swal";

const noticeAudiences = [
  { value: "all", label: "Everyone" },
  { value: "customers", label: "Customers" },
  { value: "admins", label: "Admin team" },
];
const inputClass =
  "mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60";

function readNoticeState() {
  try {
    return { notices: readOperationalNotices(), error: "" };
  } catch (error) {
    return {
      notices: [],
      error: error instanceof Error ? error.message : "Operational notices could not be loaded.",
    };
  }
}

function createNoticeId() {
  return globalThis.crypto?.randomUUID?.()
    || `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminNotifications() {
  const [snapshot, setSnapshot] = useState(readNoticeState);
  const [draft, setDraft] = useState({
    title: "",
    message: "",
    audience: "all",
    expiresAt: "",
  });
  const [formError, setFormError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const refresh = () => setSnapshot(readNoticeState());
    const onStorage = (event) => {
      if (!event.key || event.key === "motopots-operational-notices") refresh();
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const publishNotice = (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const message = draft.message.trim();
    if (!title || !message) {
      setFormError("Enter both a title and message.");
      return;
    }

    setSaving(true);
    setFormError("");
    setSaveError("");
    try {
      const notice = {
        id: createNoticeId(),
        title,
        message,
        audience: draft.audience,
        active: true,
        expiresAt: draft.expiresAt || null,
        createdAt: new Date().toISOString(),
      };
      const notices = [notice, ...readOperationalNotices()];
      saveOperationalNotices(notices);
      setSnapshot({ notices, error: "" });
      setDraft({ title: "", message: "", audience: "all", expiresAt: "" });
      showSuccess("Operational notice published");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The notice could not be published.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeNotice = async (notice) => {
    const result = await showConfirm({
      title: "Remove operational notice?",
      text: `"${notice.title}" will no longer be shown to recipients.`,
      confirmText: "Remove notice",
      cancelText: "Keep notice",
    });
    if (!result.isConfirmed) return;
    setSaveError("");
    try {
      const notices = readOperationalNotices().filter(
        (item) => item.id !== notice.id,
      );
      saveOperationalNotices(notices);
      setSnapshot({ notices, error: "" });
      showSuccess("Operational notice removed");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The notice could not be removed.",
      );
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <header>
        <h2 className="m-0 text-2xl font-extrabold text-[#F5F5F5]">
          Operational Notices
        </h2>
        <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">
          Publish important updates for customers, the admin team, or everyone.
          Notices appear in each audience&apos;s notification center.
        </p>
      </header>

      {(snapshot.error || saveError) && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          {snapshot.error || saveError}
        </p>
      )}

      <form
        onSubmit={publishNotice}
        className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#141419] p-4 sm:p-5"
      >
        <h3 className="m-0 text-base font-extrabold">Publish a notice</h3>
        <label className="block text-xs font-bold text-[#A1A1AA]">
          Title
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className={inputClass}
            maxLength="120"
            required
          />
        </label>
        <label className="block text-xs font-bold text-[#A1A1AA]">
          Message
          <textarea
            value={draft.message}
            onChange={(event) =>
              setDraft((current) => ({ ...current, message: event.target.value }))
            }
            className={inputClass}
            rows="4"
            maxLength="1000"
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#A1A1AA]">
            Audience
            <select
              value={draft.audience}
              onChange={(event) =>
                setDraft((current) => ({ ...current, audience: event.target.value }))
              }
              className={inputClass}
              required
            >
              {noticeAudiences.map((audience) => (
                <option key={audience.value} value={audience.value}>
                  {audience.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#A1A1AA]">
            Expires on <span className="font-normal text-[#777781]">(optional)</span>
            <input
              type="date"
              value={draft.expiresAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, expiresAt: event.target.value }))
              }
              className={inputClass}
            />
          </label>
        </div>
        {formError && (
          <p role="alert" className="m-0 text-xs font-semibold text-rose-300">
            {formError}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || Boolean(snapshot.error)}
            className="rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Publishing…" : "Publish notice"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h3 className="m-0 text-base font-extrabold">Published notices</h3>
        {snapshot.notices.length ? (
          snapshot.notices.map((notice) => (
            <article
              key={notice.id}
              className="rounded-xl border border-white/[0.08] bg-[#111116] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="m-0 text-sm font-extrabold">{notice.title}</h4>
                  <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-[#B8B8C0]">
                    {notice.message}
                  </p>
                  <p className="mb-0 mt-2 text-xs text-[#85858F]">
                    {noticeAudiences.find((item) => item.value === notice.audience)?.label || notice.audience}
                    {notice.expiresAt ? ` · Expires ${notice.expiresAt}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeNotice(notice)}
                  className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-400/10"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#111116] px-5 py-10 text-center">
            <p className="m-0 text-sm font-bold text-[#D1D1D6]">
              No operational notices published.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
