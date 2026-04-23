"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  QUEUE_STATUSES,
  TARGET_PLATFORM_LABELS,
  type ContentIntakeItem,
  type ContentQueueItem,
  type IntakeBoard,
  type IntakeStatus,
  type QueueStatus,
  type SourcePlatform,
} from "@/app/lib/content-intake";

type RequestState = "idle" | "loading" | "success" | "error";

const PLATFORM_FILTERS: Array<SourcePlatform | "all"> = [
  "all",
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "unknown",
];

const STATUS_FILTERS: Array<IntakeStatus | "all"> = [
  "all",
  "new",
  "analyzed",
  "queued",
  "archived",
  "failed",
];

const EMPTY_BOARD: IntakeBoard = {
  intakeItems: [],
  queueItems: [],
};

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getItemTitle(item: ContentIntakeItem) {
  return item.title || item.source_url;
}

function WorkflowStateCard({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function IntakeThumbnail({ item }: { item: ContentIntakeItem }) {
  if (!item.thumbnail_url) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium uppercase tracking-wide text-zinc-600 sm:h-20 sm:w-28">
        {item.source_platform}
      </div>
    );
  }

  return (
    <div
      className="h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 bg-cover bg-center sm:h-20 sm:w-28"
      style={{ backgroundImage: `url(${item.thumbnail_url})` }}
      aria-label={`${getItemTitle(item)} thumbnail`}
    />
  );
}

function RemixBriefPanel({ queueItem }: { queueItem: ContentQueueItem }) {
  const brief = queueItem.remix_brief_json;

  if (!Object.keys(brief).length) {
    return (
      <WorkflowStateCard
        title="No remix brief yet"
        message="Move a saved item into the queue to generate a structured remix brief."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Remix Brief</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Execution notes for making an original version.
          </p>
        </div>
        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
          {formatStatusLabel(queueItem.queue_status)}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["Why it works", brief.whyItWorks],
          ["Remake strategy", brief.remakeStrategy],
          ["Hook concept", brief.hookConcept],
          ["Pacing", brief.pacingRecommendation],
          ["Tone", brief.emotionalTone],
          ["CTA", brief.ctaAngle],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {value || "Add more notes to sharpen this recommendation."}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Keep</p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-300">
            {(brief.whatToKeep ?? []).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Change</p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-300">
            {(brief.whatToChange ?? []).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MusicSupervisorPanel({
  queueItem,
  onRefresh,
  actionState,
}: {
  queueItem: ContentQueueItem;
  onRefresh: () => void;
  actionState: RequestState;
}) {
  const music = queueItem.music_supervisor_json;
  const suggestions = music.suggestions ?? [];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">AI Music Supervisor</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Song-fit direction from tone, pacing, energy, and visual style.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={actionState === "loading"}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionState === "loading" ? "Refreshing" : "Refresh"}
        </button>
      </div>
      {music.profile && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["Tone", music.profile.tone],
            ["Pacing", music.profile.pacing],
            ["Energy", music.profile.energy],
            ["Style", music.profile.visualStyle],
          ].map(([label, signal]) => (
            <span
              key={`${label}-${signal}`}
              className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
            >
              {label}: {signal}
            </span>
          ))}
        </div>
      )}
      {suggestions.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((song) => (
            <div
              key={`${song.songTitle}-${song.artist}`}
              className="rounded-xl border border-zinc-800 bg-black/30 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {song.songTitle} - {song.artist}
                </p>
                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200">
                  {song.category}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{song.reason}</p>
              <p className="mt-2 text-xs text-zinc-500">{song.editUseNote}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          Queue this item to generate music direction and song-fit suggestions.
        </p>
      )}
    </div>
  );
}

function PublishAssistPanel({
  queueItem,
  onRefresh,
  actionState,
}: {
  queueItem: ContentQueueItem;
  onRefresh: () => void;
  actionState: RequestState;
}) {
  const blocks = queueItem.publish_assist_json;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Publish Assist</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Platform-ready copy blocks. No auto-posting, no OAuth.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={actionState === "loading"}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionState === "loading" ? "Refreshing" : "Refresh"}
        </button>
      </div>
      {blocks.length ? (
        <div className="grid gap-3">
          {blocks.map((block) => (
            <div
              key={block.platform}
              className="rounded-xl border border-zinc-800 bg-black/30 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-red-200">
                {TARGET_PLATFORM_LABELS[block.platform]}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{block.title}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">
                {block.caption}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{block.notes}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          Queue this item to generate captions, CTAs, hashtags, and platform framing.
        </p>
      )}
    </div>
  );
}

export function RemixStudio() {
  const [board, setBoard] = useState<IntakeBoard>(EMPTY_BOARD);
  const [loadState, setLoadState] = useState<RequestState>("loading");
  const [actionState, setActionState] = useState<RequestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [platformFilter, setPlatformFilter] = useState<SourcePlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IntakeStatus | "all">("all");
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  async function loadBoard() {
    setLoadState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/content-intake", { cache: "no-store" });
      const payload = (await response.json()) as {
        board?: IntakeBoard;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load Remix Studio.");
      }

      setBoard(payload.board ?? EMPTY_BOARD);
      setLoadState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load Remix Studio."
      );
      setLoadState("error");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadBoard();
    });
  }, []);

  const filteredIntakeItems = useMemo(() => {
    return board.intakeItems.filter((item) => {
      const platformMatches =
        platformFilter === "all" || item.source_platform === platformFilter;
      const statusMatches = statusFilter === "all" || item.status === statusFilter;

      return platformMatches && statusMatches;
    });
  }, [board.intakeItems, platformFilter, statusFilter]);

  const selectedQueueItem = useMemo(() => {
    if (selectedQueueId) {
      return (
        board.queueItems.find((queueItem) => queueItem.id === selectedQueueId) ?? null
      );
    }

    return board.queueItems[0] ?? null;
  }, [board.queueItems, selectedQueueId]);

  async function handleCreateIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/content-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, notes, tags }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save intake item.");
      }

      setSourceUrl("");
      setNotes("");
      setTags("");
      await loadBoard();
      setActionState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save intake item."
      );
      setActionState("error");
    }
  }

  async function runItemAction(path: string, options?: RequestInit) {
    setActionState("loading");
    setErrorMessage("");

    try {
      const response = await fetch(path, options ?? { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        queueItem?: ContentQueueItem;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Workflow action failed.");
      }

      if (payload.queueItem) {
        setSelectedQueueId(payload.queueItem.id);
      }

      await loadBoard();
      setActionState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Workflow action failed."
      );
      setActionState("error");
    }
  }

  async function updateQueueStatus(queueItem: ContentQueueItem, queueStatus: QueueStatus) {
    await runItemAction(`/api/content-queue/${queueItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueStatus }),
    });
  }

  return (
    <section className="my-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_0_60px_rgba(127,29,29,0.12)] md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
            Phase 3 Workflow
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Intake + Remix Studio
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Save reference links, turn them into original remix briefs, get music
            direction, and prep platform copy without turning Content Radar into a
            risky reposting tool.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-300">
          <span className="font-semibold text-white">{board.intakeItems.length}</span>{" "}
          saved refs /{" "}
          <span className="font-semibold text-white">{board.queueItems.length}</span>{" "}
          queued ideas
        </div>
      </div>

      <form
        onSubmit={handleCreateIntake}
        className="mb-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 lg:grid-cols-[1.4fr,1fr,0.8fr,auto]"
      >
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="Paste a YouTube, TikTok, Instagram, X, Facebook, or web link"
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
        />
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Operator notes"
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
        />
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="tags, comma-separated"
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
        />
        <button
          type="submit"
          disabled={actionState === "loading" || !sourceUrl.trim()}
          className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {actionState === "loading" ? "Saving" : "Save Link"}
        </button>
      </form>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      {loadState === "loading" ? (
        <WorkflowStateCard
          title="Loading Remix Studio"
          message="Pulling saved references, queue items, and execution briefs."
        />
      ) : loadState === "error" ? (
        <WorkflowStateCard
          title="Remix Studio needs attention"
          message={
            errorMessage ||
            "Check your Supabase service key and make sure the Phase 3 migration has been applied."
          }
          actionLabel="Retry"
          onAction={() => void loadBoard()}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Content Intake</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Filter saved references by source and workflow state.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_FILTERS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setPlatformFilter(platform)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      platformFilter === platform
                        ? "border-red-400 bg-red-500/10 text-red-100"
                        : "border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {formatStatusLabel(platform)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      statusFilter === status
                        ? "border-red-400 bg-red-500/10 text-red-100"
                        : "border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {formatStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {filteredIntakeItems.length ? (
              <div className="space-y-3">
                {filteredIntakeItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <IntakeThumbnail item={item} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                            {item.source_platform}
                          </span>
                          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200">
                            {formatStatusLabel(item.status)}
                          </span>
                        </div>
                        <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-white">
                          {getItemTitle(item)}
                        </h4>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {item.source_creator_name || item.source_url}
                        </p>
                        {item.notes && (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                            {item.notes}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void runItemAction(`/api/content-intake/${item.id}/analyze`)
                            }
                            disabled={actionState === "loading"}
                            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-200 disabled:opacity-50"
                          >
                            Analyze
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void runItemAction(`/api/content-intake/${item.id}/queue`)
                            }
                            disabled={actionState === "loading"}
                            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                          >
                            Move to Queue
                          </button>
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                          >
                            Open Source
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WorkflowStateCard
                title="No intake items in this view"
                message="Paste a reference link above, or widen the platform/status filters to see more saved ideas."
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Execution Queue</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Turn references into remix briefs, music direction, and publish copy.
                  </p>
                </div>
                {selectedQueueItem && (
                  <select
                    value={selectedQueueItem.queue_status}
                    onChange={(event) =>
                      void updateQueueStatus(
                        selectedQueueItem,
                        event.target.value as QueueStatus
                      )
                    }
                    className="rounded-full border border-zinc-800 bg-black px-3 py-2 text-xs font-semibold text-zinc-200 outline-none focus:border-red-400"
                  >
                    {QUEUE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {board.queueItems.length ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {board.queueItems.map((queueItem) => (
                    <button
                      key={queueItem.id}
                      type="button"
                      onClick={() => setSelectedQueueId(queueItem.id)}
                      className={`min-w-56 rounded-xl border p-3 text-left transition ${
                        selectedQueueItem?.id === queueItem.id
                          ? "border-red-400 bg-red-500/10"
                          : "border-zinc-800 bg-black/30 hover:border-zinc-600"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-white">
                        {queueItem.intake_item
                          ? getItemTitle(queueItem.intake_item)
                          : "Queued item"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatStatusLabel(queueItem.queue_status)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <WorkflowStateCard
                  title="Queue is empty"
                  message="Move an intake item into the queue when it is ready to become an original content plan."
                />
              )}
            </div>

            {selectedQueueItem && (
              <>
                <RemixBriefPanel queueItem={selectedQueueItem} />
                <MusicSupervisorPanel
                  queueItem={selectedQueueItem}
                  actionState={actionState}
                  onRefresh={() =>
                    void runItemAction(`/api/content-queue/${selectedQueueItem.id}/music`)
                  }
                />
                <PublishAssistPanel
                  queueItem={selectedQueueItem}
                  actionState={actionState}
                  onRefresh={() =>
                    void runItemAction(`/api/content-queue/${selectedQueueItem.id}/publish`)
                  }
                />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
