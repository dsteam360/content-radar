"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  formatCompactNumber,
  formatPublishedTime,
  getAnalystTakeaways,
  getBreakoutReason,
  getCreatorLeaderboardEntry,
  getCreatorVideoSummary,
  getPatternSnapshot,
  getTopBreakoutScore,
  getWinningPatterns,
  matchesVideoFilter,
  normalizeYoutubeHandle,
  sortVideosByPerformance,
  type Creator,
  type CreatorLeaderboardEntry,
  type PatternSnapshot,
  type Video,
  type VideoFilter,
} from "./lib/youtube-insights";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [creatorName, setCreatorName] = useState("");
  const [platform, setPlatform] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [breakoutPosts, setBreakoutPosts] = useState<Record<number, Video[]>>(
    {}
  );
  const [breakoutLoading, setBreakoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("All");

  async function loadCreators() {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setCreators(data ?? []);
    } catch (error) {
      console.error("Error loading creators:", error);
      setErrorMessage("Failed to load creators.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBreakoutPosts(youtubeCreators: Creator[]) {
    setBreakoutLoading(true);

    try {
      const breakoutEntries = await Promise.all(
        youtubeCreators.map(async (creator) => {
          const normalizedHandle = normalizeYoutubeHandle(
            creator.youtube_handle ?? ""
          );

          if (!normalizedHandle) {
            return [creator.id, []] as const;
          }

          const response = await fetch(
            `/api/youtube/recent?handle=${encodeURIComponent(normalizedHandle)}`
          );

          const data = await response.json();

          if (!response.ok) {
            console.error(`Failed to load videos for ${creator.name}`, data);
            return [creator.id, []] as const;
          }

          return [creator.id, data.videos ?? []] as const;
        })
      );

      setBreakoutPosts(Object.fromEntries(breakoutEntries));
    } catch (error) {
      console.error("Error loading breakout posts:", error);
      setErrorMessage("Failed to load YouTube videos.");
    } finally {
      setBreakoutLoading(false);
    }
  }

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    const youtubeCreators = creators.filter(
      (creator) =>
        creator.platform.toLowerCase() === "youtube" && creator.youtube_handle
    );

    if (youtubeCreators.length > 0) {
      loadBreakoutPosts(youtubeCreators);
    } else {
      setBreakoutPosts({});
    }
  }, [creators]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = creatorName.trim();
    const trimmedPlatform = platform.trim();
    const normalizedHandle =
      trimmedPlatform.toLowerCase() === "youtube"
        ? normalizeYoutubeHandle(youtubeHandle)
        : "";

    if (!trimmedName || !trimmedPlatform) {
      setErrorMessage("Please enter both a creator name and platform.");
      return;
    }

    if (trimmedPlatform.toLowerCase() === "youtube" && !normalizedHandle) {
      setErrorMessage("Please enter a YouTube handle for YouTube creators.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("creators")
      .insert([
        {
          name: trimmedName,
          platform: trimmedPlatform,
          youtube_handle: normalizedHandle || null,
        },
      ])
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    setCreators((prev) => [data, ...prev]);
    setCreatorName("");
    setPlatform("");
    setYoutubeHandle("");
    setSubmitting(false);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setErrorMessage("");

    const { error } = await supabase.from("creators").delete().eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setDeletingId(null);
      return;
    }

    setCreators((prev) => prev.filter((creator) => creator.id !== id));
    setDeletingId(null);
  }

  const youtubeCreators = creators.filter(
    (creator) =>
      creator.platform.toLowerCase() === "youtube" &&
      normalizeYoutubeHandle(creator.youtube_handle ?? "")
  );

  const creatorLeaderboard = youtubeCreators
    .map((creator) =>
      getCreatorLeaderboardEntry(
        creator,
        sortVideosByPerformance(breakoutPosts[creator.id] ?? [])
      )
    )
    .sort((leftCreator, rightCreator) => {
      if (rightCreator.averageBreakoutScore !== leftCreator.averageBreakoutScore) {
        return rightCreator.averageBreakoutScore - leftCreator.averageBreakoutScore;
      }

      return rightCreator.totalRecentViews - leftCreator.totalRecentViews;
    });

  const visibleFilteredVideos = youtubeCreators.flatMap((creator) =>
    sortVideosByPerformance(breakoutPosts[creator.id] ?? []).filter((video) =>
      matchesVideoFilter(video, videoFilter)
    )
  );
  const patternSnapshot = getPatternSnapshot(visibleFilteredVideos);
  const analystTakeaways = getAnalystTakeaways(
    visibleFilteredVideos,
    creators,
    breakoutPosts,
    videoFilter
  );
  const winningPatterns = getWinningPatterns(
    visibleFilteredVideos,
    creators,
    breakoutPosts,
    videoFilter
  );

  const videoFilterOptions: VideoFilter[] = [
    "All",
    "Top Breakouts",
    "High Engagement",
    "Recent Surge",
  ];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-3 text-3xl font-bold">Content Radar</h1>
        <p className="mb-10 text-gray-400">
          Track competitors. Discover viral content. Build smarter posts.
        </p>

        <section className="mb-10 max-w-xl">
          <h2 className="mb-6 text-2xl font-bold">Add Competitor</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Creator Name"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none"
            />

            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none"
            >
              <option value="" disabled hidden>
                Select platform
              </option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
            </select>

            {platform === "YouTube" && (
              <input
                type="text"
                placeholder="@channelhandle"
                value={youtubeHandle}
                onChange={(e) => setYoutubeHandle(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-white outline-none"
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-white px-4 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Add Creator"}
            </button>
          </form>

          {errorMessage && (
            <p className="mt-4 text-sm text-red-400">{errorMessage}</p>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Tracked Creators</h2>
            <span className="text-sm text-gray-400">
              {loading ? "Loading..." : `${creators.length} total`}
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-gray-400">
                Loading creators...
              </div>
            ) : creators.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-gray-400">
                No creators added yet.
              </div>
            ) : (
              creators.map((creator) => (
                <div
                  key={creator.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="font-medium">{creator.name}</span>
                      <span className="text-gray-400"> on {creator.platform}</span>
                      {creator.youtube_handle && (
                        <p className="mt-1 text-sm text-zinc-500">
                          Handle: {creator.youtube_handle}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(creator.id)}
                      disabled={deletingId === creator.id}
                      className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === creator.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent YouTube Videos</h2>
              <span className="text-sm text-gray-400">YouTube creators only</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {videoFilterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVideoFilter(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    videoFilter === option
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {!breakoutLoading && creatorLeaderboard.length > 0 && (
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      YouTube Leaderboard
                    </h3>
                    <p className="text-sm text-gray-400">
                      Ranked by average breakout score across recent videos
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
                    {creatorLeaderboard.length} creators
                  </span>
                </div>

                <div className="space-y-3">
                  {creatorLeaderboard.map((entry, index) => (
                    <div
                      key={entry.creatorId}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 md:grid-cols-[auto,1.2fr,repeat(4,minmax(0,1fr))]"
                    >
                      <div className="flex items-center">
                        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {entry.creatorName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {entry.videosAnalyzed} videos analyzed
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Avg Breakout
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(entry.averageBreakoutScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Recent Views
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(entry.totalRecentViews)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Top Breakout
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(entry.topVideoBreakoutScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Consistency
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {entry.consistencyScore}%
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {entry.videosAnalyzed} videos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Pattern Snapshot
                    </h3>
                    <p className="text-sm text-gray-400">
                      Based on the videos visible under the current filter
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Visible Videos
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {patternSnapshot.visibleVideos}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Avg Views
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatCompactNumber(patternSnapshot.averageViews)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Avg Breakout
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatCompactNumber(patternSnapshot.averageBreakoutScore)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Common Reason
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {patternSnapshot.mostCommonReason}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Analyst Takeaways
                    </h3>
                    <p className="text-sm text-gray-400">
                      Plain-English observations from the current visible set
                    </p>
                  </div>

                  <ul className="space-y-3 text-sm text-zinc-200">
                    {analystTakeaways.map((takeaway) => (
                      <li
                        key={takeaway}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                      >
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Winning Patterns
                    </h3>
                    <p className="text-sm text-gray-400">
                      Repeated traits showing up among the strongest visible videos
                    </p>
                  </div>

                  <ul className="space-y-3 text-sm text-zinc-200">
                    {winningPatterns.map((pattern) => (
                      <li
                        key={pattern}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                      >
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {breakoutLoading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-gray-400">
              Loading YouTube videos...
            </div>
          ) : Object.keys(breakoutPosts).length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-gray-400">
              No YouTube creators available yet.
            </div>
          ) : (
            <div className="space-y-6">
              {youtubeCreators.map((creator) => {
                  const creatorVideos = sortVideosByPerformance(
                    breakoutPosts[creator.id] ?? []
                  );
                  const filteredCreatorVideos = creatorVideos.filter((video) =>
                    matchesVideoFilter(video, videoFilter)
                  );
                  const topBreakoutScore = getTopBreakoutScore(creatorVideos);
                  const creatorSummary = getCreatorVideoSummary(creatorVideos);

                  return (
                    <div
                      key={creator.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {creator.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Recent uploads from{" "}
                            {normalizeYoutubeHandle(creator.youtube_handle ?? "")}
                          </p>
                        </div>
                        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
                          YouTube
                        </span>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Recent Views
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatCompactNumber(creatorSummary.totalRecentViews)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Avg Breakout
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatCompactNumber(creatorSummary.averageBreakoutScore)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Consistency
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {creatorSummary.consistencyScore}%
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Top Video
                          </p>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                            {creatorSummary.topVideoTitle}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Breakout {formatCompactNumber(creatorSummary.topVideoBreakoutScore)}
                          </p>
                        </div>
                      </div>

                      {filteredCreatorVideos.length ? (
                        <div className="space-y-3">
                          {filteredCreatorVideos.map((video) => {
                            const breakoutScore =
                              typeof video.breakoutScore === "number" &&
                              Number.isFinite(video.breakoutScore)
                                ? video.breakoutScore
                                : 0;
                            const breakoutReason = getBreakoutReason(video);
                            const isTopPerformer =
                              breakoutScore > 0 && breakoutScore === topBreakoutScore;

                            return (
                              <div
                                key={video.id}
                                className={`rounded-xl border bg-zinc-950 p-4 ${
                                  isTopPerformer
                                    ? "border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                                    : "border-zinc-800"
                                }`}
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                  {video.thumbnail && (
                                    <img
                                      src={video.thumbnail}
                                      alt={video.title}
                                      className="h-24 w-full rounded-lg object-cover sm:w-44"
                                    />
                                  )}

                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-white">{video.title}</p>
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                          isTopPerformer
                                            ? "bg-amber-500/15 text-amber-300"
                                            : "bg-zinc-900 text-zinc-300"
                                        }`}
                                      >
                                        Breakout {formatCompactNumber(breakoutScore)}
                                      </span>
                                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        {breakoutReason}
                                      </span>
                                      {isTopPerformer && (
                                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                                          Top
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-sm text-gray-400">
                                      {formatPublishedTime(video.publishedAt)}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
                                      <span className="rounded-full bg-zinc-900 px-3 py-1">
                                        {formatCompactNumber(video.viewCount)} views
                                      </span>
                                      <span className="rounded-full bg-zinc-900 px-3 py-1">
                                        {formatCompactNumber(video.likeCount)} likes
                                      </span>
                                      <span className="rounded-full bg-zinc-900 px-3 py-1">
                                        {formatCompactNumber(video.commentCount)} comments
                                      </span>
                                    </div>
                                    <a
                                      href={`https://www.youtube.com/watch?v=${video.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-3 inline-block text-sm font-medium text-red-400 hover:text-red-300"
                                    >
                                      Watch on YouTube →
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-gray-400">
                          No videos match the {videoFilter.toLowerCase()} filter.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-zinc-900 p-5">
            <h2 className="mb-2 text-xl font-semibold">Tracked Creators</h2>
            <p className="text-sm text-gray-400">
              Add and monitor competitor accounts
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5">
            <h2 className="mb-2 text-xl font-semibold">Recent Videos</h2>
            <p className="text-sm text-gray-400">
              Pull live uploads from tracked YouTube creators
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5">
            <h2 className="mb-2 text-xl font-semibold">Insights</h2>
            <p className="text-sm text-gray-400">
              Understand what&apos;s working in your niche
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
