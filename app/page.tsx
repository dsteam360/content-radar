"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Creator = {
  id: number;
  name: string;
  platform: string;
  youtube_handle?: string | null;
  youtube_channel_id?: string | null;
  created_at?: string;
};

type Video = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  channelTitle?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  breakoutScore?: number;
};

type CreatorLeaderboardEntry = {
  creatorId: number;
  creatorName: string;
  totalRecentViews: number;
  averageBreakoutScore: number;
  topVideoBreakoutScore: number;
  videosAnalyzed: number;
  consistencyScore: number;
};

type VideoFilter = "All" | "Top Breakouts" | "High Engagement" | "Recent Surge";

type PatternSnapshot = {
  visibleVideos: number;
  averageViews: number;
  averageBreakoutScore: number;
  mostCommonReason: string;
};

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

  function formatPublishedTime(publishedAt: string) {
    const publishedDate = new Date(publishedAt);
    const diffSeconds = Math.floor((Date.now() - publishedDate.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function formatCompactNumber(value?: number) {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;

    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(safeValue);
  }

  function normalizeYoutubeHandle(handle: string) {
    const trimmedHandle = handle.trim();

    if (!trimmedHandle) {
      return "";
    }

    return trimmedHandle.startsWith("@")
      ? trimmedHandle
      : `@${trimmedHandle}`;
  }

  function getTopBreakoutScore(videos: Video[]) {
    return videos.reduce((topScore, video) => {
      const score =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;

      return Math.max(topScore, score);
    }, 0);
  }

  function getCreatorVideoSummary(videos: Video[]) {
    if (videos.length === 0) {
      return {
        totalRecentViews: 0,
        averageBreakoutScore: 0,
        topVideoTitle: "No recent videos",
        topVideoBreakoutScore: 0,
        consistencyScore: 0,
      };
    }

    const totalRecentViews = videos.reduce((totalViews, video) => {
      const viewCount =
        typeof video.viewCount === "number" && Number.isFinite(video.viewCount)
          ? video.viewCount
          : 0;

      return totalViews + viewCount;
    }, 0);

    const totalBreakoutScore = videos.reduce((totalScore, video) => {
      const breakoutScore =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;

      return totalScore + breakoutScore;
    }, 0);

    const topVideo = videos.reduce((currentTopVideo, video) => {
      const currentTopScore =
        typeof currentTopVideo.breakoutScore === "number" &&
        Number.isFinite(currentTopVideo.breakoutScore)
          ? currentTopVideo.breakoutScore
          : 0;
      const videoScore =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;

      return videoScore > currentTopScore ? video : currentTopVideo;
    }, videos[0]);

    const topVideoBreakoutScore =
      typeof topVideo.breakoutScore === "number" && Number.isFinite(topVideo.breakoutScore)
        ? topVideo.breakoutScore
        : 0;

    const videosAboveBreakoutThreshold = videos.filter((video) => {
      const breakoutScore =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;

      return breakoutScore >= 2500;
    }).length;

    return {
      totalRecentViews,
      averageBreakoutScore: Math.round(totalBreakoutScore / videos.length),
      topVideoTitle: topVideo.title || "Untitled video",
      topVideoBreakoutScore,
      consistencyScore: Math.round(
        (videosAboveBreakoutThreshold / videos.length) * 100
      ),
    };
  }

  function sortVideosByPerformance(videos: Video[]) {
    return [...videos].sort((leftVideo, rightVideo) => {
      const leftBreakoutScore =
        typeof leftVideo.breakoutScore === "number" &&
        Number.isFinite(leftVideo.breakoutScore)
          ? leftVideo.breakoutScore
          : 0;
      const rightBreakoutScore =
        typeof rightVideo.breakoutScore === "number" &&
        Number.isFinite(rightVideo.breakoutScore)
          ? rightVideo.breakoutScore
          : 0;

      if (rightBreakoutScore !== leftBreakoutScore) {
        return rightBreakoutScore - leftBreakoutScore;
      }

      const leftViewCount =
        typeof leftVideo.viewCount === "number" && Number.isFinite(leftVideo.viewCount)
          ? leftVideo.viewCount
          : 0;
      const rightViewCount =
        typeof rightVideo.viewCount === "number" && Number.isFinite(rightVideo.viewCount)
          ? rightVideo.viewCount
          : 0;

      return rightViewCount - leftViewCount;
    });
  }

  function getBreakoutReason(video: Video) {
    const breakoutScore =
      typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
        ? video.breakoutScore
        : 0;
    const viewCount =
      typeof video.viewCount === "number" && Number.isFinite(video.viewCount)
        ? video.viewCount
        : 0;
    const likeCount =
      typeof video.likeCount === "number" && Number.isFinite(video.likeCount)
        ? video.likeCount
        : 0;
    const commentCount =
      typeof video.commentCount === "number" && Number.isFinite(video.commentCount)
        ? video.commentCount
        : 0;

    const publishedTime = video.publishedAt
      ? new Date(video.publishedAt).getTime()
      : Date.now();
    const ageInDays = Math.max(
      0.5,
      (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
    );
    const viewVelocity = viewCount / ageInDays;
    const engagementRate = viewCount > 0 ? (likeCount + commentCount * 2) / viewCount : 0;

    if (commentCount >= 10) {
      return "Strong comments";
    }

    if (engagementRate >= 0.08 || likeCount >= 1500) {
      return "High engagement";
    }

    if (ageInDays <= 7 && breakoutScore >= 2500) {
      return "Recent surge";
    }

    if (viewVelocity >= 2000 || viewCount >= 25000) {
      return "Fast views";
    }

    return "Steady traction";
  }

  function matchesVideoFilter(video: Video, filter: VideoFilter) {
    const breakoutScore =
      typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
        ? video.breakoutScore
        : 0;
    const breakoutReason = getBreakoutReason(video);

    if (filter === "Top Breakouts") {
      return breakoutScore >= 3000;
    }

    if (filter === "High Engagement") {
      return (
        breakoutReason === "High engagement" ||
        breakoutReason === "Strong comments"
      );
    }

    if (filter === "Recent Surge") {
      return breakoutReason === "Recent surge";
    }

    return true;
  }

  function getPatternSnapshot(videos: Video[]): PatternSnapshot {
    if (videos.length === 0) {
      return {
        visibleVideos: 0,
        averageViews: 0,
        averageBreakoutScore: 0,
        mostCommonReason: "No visible pattern",
      };
    }

    const totalViews = videos.reduce((sum, video) => {
      const viewCount =
        typeof video.viewCount === "number" && Number.isFinite(video.viewCount)
          ? video.viewCount
          : 0;

      return sum + viewCount;
    }, 0);

    const totalBreakoutScore = videos.reduce((sum, video) => {
      const breakoutScore =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;

      return sum + breakoutScore;
    }, 0);

    const reasonCounts = videos.reduce<Record<string, number>>((counts, video) => {
      const reason = getBreakoutReason(video);
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});

    const mostCommonReason =
      Object.entries(reasonCounts).sort((leftEntry, rightEntry) => {
        if (rightEntry[1] !== leftEntry[1]) {
          return rightEntry[1] - leftEntry[1];
        }

        return leftEntry[0].localeCompare(rightEntry[0]);
      })[0]?.[0] ?? "No visible pattern";

    return {
      visibleVideos: videos.length,
      averageViews: Math.round(totalViews / videos.length),
      averageBreakoutScore: Math.round(totalBreakoutScore / videos.length),
      mostCommonReason,
    };
  }

  function getAnalystTakeaways(
    videos: Video[],
    creators: Creator[],
    breakoutPosts: Record<number, Video[]>
  ) {
    if (videos.length <= 2) {
      return [
        "The current filtered set is small, so treat any pattern here as directional rather than definitive.",
        "Use the active filter to compare a broader set before making a strong content bet.",
        "Prioritize collecting a few more recent videos to strengthen the signal.",
      ];
    }

    const totalVideos = videos.length;
    const recentVideos = videos.filter((video) => {
      const publishedTime = video.publishedAt
        ? new Date(video.publishedAt).getTime()
        : Date.now();
      const ageInDays = Math.max(
        0,
        (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
      );

      return ageInDays <= 7;
    });
    const highEngagementVideos = videos.filter((video) => {
      const reason = getBreakoutReason(video);
      return reason === "High engagement" || reason === "Strong comments";
    });
    const commentHeavyVideos = videos.filter((video) => {
      const commentCount =
        typeof video.commentCount === "number" && Number.isFinite(video.commentCount)
          ? video.commentCount
          : 0;
      return commentCount >= 10;
    });

    const creatorAverages = creators
      .filter(
        (creator) =>
          creator.platform.toLowerCase() === "youtube" &&
          normalizeYoutubeHandle(creator.youtube_handle ?? "")
      )
      .map((creator) => {
        const creatorVideos = sortVideosByPerformance(breakoutPosts[creator.id] ?? []).filter(
          (video) => matchesVideoFilter(video, videoFilter)
        );
        const summary = getCreatorVideoSummary(creatorVideos);

        return {
          name: creator.name,
          averageBreakoutScore: summary.averageBreakoutScore,
          videosAnalyzed: creatorVideos.length,
        };
      })
      .filter((creator) => creator.videosAnalyzed > 0)
      .sort((leftCreator, rightCreator) => {
        return rightCreator.averageBreakoutScore - leftCreator.averageBreakoutScore;
      });

    const topCreator = creatorAverages[0];
    const secondCreator = creatorAverages[1];

    const takeaways: string[] = [];

    if (recentVideos.length / totalVideos >= 0.5) {
      takeaways.push(
        "Breakout momentum in the current set is being driven heavily by recent uploads."
      );
    } else {
      takeaways.push(
        "Older videos are still contributing meaningfully, so the current winners are not purely freshness-driven."
      );
    }

    if (highEngagementVideos.length / totalVideos >= 0.5) {
      takeaways.push(
        "High engagement is outperforming raw view count in the current filtered set."
      );
    } else if (commentHeavyVideos.length / totalVideos >= 0.4) {
      takeaways.push(
        "Comments are a strong signal right now, with conversation showing up across multiple visible videos."
      );
    } else {
      takeaways.push(
        "View velocity is doing more of the work here than deeper engagement signals."
      );
    }

    if (
      topCreator &&
      (!secondCreator ||
        topCreator.averageBreakoutScore >= secondCreator.averageBreakoutScore * 1.25)
    ) {
      takeaways.push(
        `${topCreator.name} is clearly leading the current set on average breakout score.`
      );
    } else {
      takeaways.push(
        "Performance is relatively distributed, with no single creator dominating the visible set."
      );
    }

    return takeaways.slice(0, 3);
  }

  function getWinningPatterns(
    videos: Video[],
    creators: Creator[],
    breakoutPosts: Record<number, Video[]>
  ) {
    if (videos.length === 0) {
      return [
        "No visible videos are available, so there is not enough signal to identify a winning pattern yet.",
        "Try switching filters or broadening the current view to surface more comparable videos.",
        "Once more videos are visible, this section will summarize the repeated traits among the strongest performers.",
      ];
    }

    const strongVideos = videos.filter((video) => {
      const breakoutScore =
        typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
          ? video.breakoutScore
          : 0;
      return breakoutScore >= 3000;
    });

    const recentVideos = videos.filter((video) => {
      const publishedTime = video.publishedAt
        ? new Date(video.publishedAt).getTime()
        : Date.now();
      const ageInDays = Math.max(
        0,
        (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
      );

      return ageInDays <= 7;
    });

    const highEngagementVideos = videos.filter((video) => {
      const reason = getBreakoutReason(video);
      return reason === "High engagement" || reason === "Strong comments";
    });

    const commentHeavyVideos = videos.filter((video) => {
      const commentCount =
        typeof video.commentCount === "number" && Number.isFinite(video.commentCount)
          ? video.commentCount
          : 0;
      return commentCount >= 10;
    });

    const visibleYoutubeCreators = creators.filter(
      (creator) =>
        creator.platform.toLowerCase() === "youtube" &&
        normalizeYoutubeHandle(creator.youtube_handle ?? "")
    );

    const creatorVisibleBreakdown = visibleYoutubeCreators
      .map((creator) => {
        const creatorVisibleVideos = sortVideosByPerformance(breakoutPosts[creator.id] ?? []).filter(
          (video) => matchesVideoFilter(video, videoFilter)
        );

        return {
          creatorName: creator.name,
          visibleVideos: creatorVisibleVideos.length,
          strongVideos: creatorVisibleVideos.filter((video) => {
            const breakoutScore =
              typeof video.breakoutScore === "number" && Number.isFinite(video.breakoutScore)
                ? video.breakoutScore
                : 0;
            return breakoutScore >= 3000;
          }).length,
        };
      })
      .filter((creator) => creator.visibleVideos > 0)
      .sort((leftCreator, rightCreator) => {
        if (rightCreator.strongVideos !== leftCreator.strongVideos) {
          return rightCreator.strongVideos - leftCreator.strongVideos;
        }

        return rightCreator.visibleVideos - leftCreator.visibleVideos;
      });

    const topCreator = creatorVisibleBreakdown[0];

    const patterns: string[] = [];

    if (recentVideos.length / videos.length >= 0.5) {
      patterns.push("Recent videos are dominating the visible set, so momentum is clustering around newer uploads.");
    } else {
      patterns.push("Winning videos are not purely recent, which suggests durable topics are still carrying breakout potential.");
    }

    if (highEngagementVideos.length / videos.length >= 0.5) {
      patterns.push("High-engagement videos are overrepresented, so audience response is showing up as a repeat winning trait.");
    } else if (commentHeavyVideos.length / videos.length >= 0.4) {
      patterns.push("Comment-heavy videos appear frequently, making discussion intensity a strong repeated signal.");
    } else {
      patterns.push("The strongest visible videos lean more on broad reach than unusually high engagement density.");
    }

    if (strongVideos.length / videos.length >= 0.4) {
      patterns.push("The visible winners are concentrated in the highest breakout tier, not just the middle of the pack.");
    } else if (topCreator && topCreator.strongVideos >= 2) {
      patterns.push(`${topCreator.creatorName} is clustering a meaningful share of the strongest visible videos.`);
    } else {
      patterns.push("Top performance is relatively distributed, without one dominant repeat pattern across the strongest videos.");
    }

    return patterns.slice(0, 3);
  }

  function getCreatorLeaderboardEntry(
    creator: Creator,
    videos: Video[]
  ): CreatorLeaderboardEntry {
    const creatorSummary = getCreatorVideoSummary(videos);

    return {
      creatorId: creator.id,
      creatorName: creator.name,
      totalRecentViews: creatorSummary.totalRecentViews,
      averageBreakoutScore: creatorSummary.averageBreakoutScore,
      topVideoBreakoutScore: creatorSummary.topVideoBreakoutScore,
      videosAnalyzed: videos.length,
      consistencyScore: creatorSummary.consistencyScore,
    };
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
    breakoutPosts
  );
  const winningPatterns = getWinningPatterns(
    visibleFilteredVideos,
    creators,
    breakoutPosts
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
