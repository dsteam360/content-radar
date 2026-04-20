"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  aggregateCreatorStats,
  formatCompactNumber,
  formatPublishedTime,
  getAnalystTakeaways,
  getBenchmarkSummary,
  getBreakoutReason,
  getContentOpportunities,
  getCreatorDiversificationSummary,
  getCreatorComparison,
  getCreatorBenchmarkStatus,
  getCreatorMomentumDelta,
  getCreatorLeaderboardEntry,
  getExecutiveSummary,
  getInsightConfidence,
  getOutlierAlerts,
  getPatternSnapshot,
  getScenarioViewData,
  getSignalShiftSummary,
  getTopBreakoutScore,
  getTopSignals,
  getWatchlistCandidates,
  getWinningPatterns,
  matchesVideoFilter,
  normalizeYoutubeHandle,
  sortVideosByPerformance,
  type Creator,
  type CreatorDiversificationSummary,
  type CreatorBenchmarkStatus,
  type CreatorComparisonMetric,
  type CreatorLeaderboardEntry,
  type CreatorMomentumDelta,
  type InsightConfidence,
  type OutlierAlert,
  type ScenarioMode,
  type SignalShiftSummary,
  type TopSignalVideo,
  type Video,
  type VideoFilter,
} from "./lib/youtube-insights";
import { supabase } from "./lib/supabase";

type DashboardStateCardProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  isActionDisabled?: boolean;
  tone?: "default" | "error";
};

function DashboardStateCard({
  title,
  message,
  actionLabel,
  onAction,
  isActionDisabled = false,
  tone = "default",
}: DashboardStateCardProps) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/30 bg-red-950/20"
      : "border-zinc-800 bg-zinc-900";

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={isActionDisabled}
          className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

type SignalCardProps = {
  label: string;
  video: TopSignalVideo | null;
  metricLabel: string;
  metricValue: string;
};

function SignalCard({
  label,
  video,
  metricLabel,
  metricValue,
}: SignalCardProps) {
  if (!video) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">
        {video.title || "Untitled video"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {video.channelTitle || "Tracked YouTube creator"}
      </p>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {metricLabel}
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{metricValue}</p>
      </div>
    </div>
  );
}

type BenchmarkBadgeProps = {
  label: string;
  status: CreatorBenchmarkStatus["breakoutStatus"];
};

function BenchmarkBadge({ label, status }: BenchmarkBadgeProps) {
  const toneClasses =
    status === "Above"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "Near"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneClasses}`}
    >
      {label}: {status} Benchmark
    </span>
  );
}

type ComparisonMetricRowProps = {
  label: string;
  metric: CreatorComparisonMetric;
  formatter?: (value: number) => string;
};

function ComparisonMetricRow({
  label,
  metric,
  formatter = (value) => value.toString(),
}: ComparisonMetricRowProps) {
  const getValueClasses = (winner: CreatorComparisonMetric["winner"]) => {
    if (winner === "tie") {
      return "text-white";
    }

    return winner === "left"
      ? "text-emerald-300"
      : "text-zinc-400";
  };

  const getRightValueClasses = (winner: CreatorComparisonMetric["winner"]) => {
    if (winner === "tie") {
      return "text-white";
    }

    return winner === "right"
      ? "text-emerald-300"
      : "text-zinc-400";
  };

  return (
    <div className="grid grid-cols-[1fr,auto,auto] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-sm text-zinc-300">{label}</p>
      <p className={`text-sm font-semibold ${getValueClasses(metric.winner)}`}>
        {formatter(metric.leftValue)}
      </p>
      <p className={`text-sm font-semibold ${getRightValueClasses(metric.winner)}`}>
        {formatter(metric.rightValue)}
      </p>
    </div>
  );
}

type MomentumBadgeProps = {
  momentum: CreatorMomentumDelta;
};

function MomentumBadge({ momentum }: MomentumBadgeProps) {
  const toneClasses =
    momentum.momentumLabel === "Accelerating"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : momentum.momentumLabel === "Cooling"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  const deltaPrefix =
    momentum.viewsPerHourDelta > 0 ? "+" : momentum.viewsPerHourDelta < 0 ? "" : "";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneClasses}`}
    >
      {momentum.momentumLabel} · {deltaPrefix}
      {formatCompactNumber(momentum.viewsPerHourDelta)} vph
    </span>
  );
}

type InsightConfidenceBadgeProps = {
  confidence: InsightConfidence;
};

function InsightConfidenceBadge({ confidence }: InsightConfidenceBadgeProps) {
  const toneClasses =
    confidence.level === "High"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : confidence.level === "Medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneClasses}`}
      >
        Confidence: {confidence.level}
      </span>
      <span className="text-xs text-zinc-500">{confidence.reason}</span>
    </div>
  );
}

type OutlierAlertCardProps = {
  alert: OutlierAlert;
};

function OutlierAlertCard({ alert }: OutlierAlertCardProps) {
  const toneClasses =
    alert.level === "warning"
      ? "border-amber-500/30 bg-amber-500/10"
      : "border-zinc-800 bg-zinc-950/70";
  const badgeClasses =
    alert.level === "warning"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-zinc-900 text-zinc-300";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClasses}`}>
          {alert.level}
        </span>
        <p className="text-sm font-semibold text-white">{alert.title}</p>
      </div>
      <p className="mt-2 text-sm text-zinc-300">{alert.message}</p>
    </div>
  );
}

type CreatorDiversificationCardProps = {
  diversification: CreatorDiversificationSummary;
};

function CreatorDiversificationCard({
  diversification,
}: CreatorDiversificationCardProps) {
  const toneClasses =
    diversification.level === "High"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : diversification.level === "Medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Creator Diversification
          </h3>
          <p className="text-sm text-gray-400">
            How broad the current visible opportunity set is across creators
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneClasses}`}
        >
          {diversification.level}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Active Creators
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {diversification.activeCreators}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Leader Share
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {diversification.leaderSharePercent}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {diversification.creatorShareLeader}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-300">{diversification.summary}</p>
    </div>
  );
}

type SignalShiftCardProps = {
  shiftSummary: SignalShiftSummary;
};

function SignalShiftCard({ shiftSummary }: SignalShiftCardProps) {
  if (!shiftSummary.changed) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Signal Shifts</h3>
        <p className="text-sm text-gray-400">
          What changed versus the broader filtered baseline
        </p>
      </div>

      <p className="text-sm font-medium text-white">{shiftSummary.headline}</p>

      <ul className="mt-4 space-y-3 text-sm text-zinc-200">
        {shiftSummary.bullets.map((bullet) => (
          <li
            key={bullet}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  type LeaderboardSortMode =
    | "Avg Breakout"
    | "Breakout Rate"
    | "Views/Hour"
    | "Recent Views";
  type SavedViewName =
    | "Default Radar"
    | "Breakout Scan"
    | "Engagement Scan"
    | "Early Movers";
  type SavedViewPreset = {
    name: SavedViewName;
    videoFilter: VideoFilter;
    scenarioMode: ScenarioMode;
    leaderboardSortMode: LeaderboardSortMode;
  };

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
  const [youtubeErrorMessage, setYoutubeErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("All");
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("Balanced");
  const [leaderboardSortMode, setLeaderboardSortMode] =
    useState<LeaderboardSortMode>("Avg Breakout");
  const [leftComparedCreatorId, setLeftComparedCreatorId] = useState<number | null>(
    null
  );
  const [rightComparedCreatorId, setRightComparedCreatorId] = useState<number | null>(
    null
  );

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
    setYoutubeErrorMessage("");

    try {
      const breakoutEntries = await Promise.all(
        youtubeCreators.map(async (creator) => {
          const normalizedHandle = normalizeYoutubeHandle(
            creator.youtube_handle ?? ""
          );

          if (!normalizedHandle) {
            return {
              creatorId: creator.id,
              videos: [],
              failed: false,
            } as const;
          }

          const response = await fetch(
            `/api/youtube/recent?handle=${encodeURIComponent(normalizedHandle)}`
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            console.error(`Failed to load videos for ${creator.name}`, data);
            return {
              creatorId: creator.id,
              videos: [],
              failed: true,
            } as const;
          }

          return {
            creatorId: creator.id,
            videos: data.videos ?? [],
            failed: false,
          } as const;
        })
      );

      const failedCreators = breakoutEntries.filter((entry) => entry.failed);

      if (failedCreators.length > 0) {
        setYoutubeErrorMessage(
          failedCreators.length === youtubeCreators.length
            ? "We couldn't load recent YouTube videos right now. Retry the fetch or check the creator handle and API key."
            : `We loaded most creator videos, but ${failedCreators.length} fetch${failedCreators.length === 1 ? "" : "es"} failed. Retry to refresh the missing YouTube results.`
        );
      }

      setBreakoutPosts(
        Object.fromEntries(
          breakoutEntries.map((entry) => [entry.creatorId, entry.videos])
        )
      );
    } catch (error) {
      console.error("Error loading breakout posts:", error);
      setYoutubeErrorMessage(
        "We couldn't load recent YouTube videos right now. Retry the fetch or check the creator handle and API key."
      );
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
      setYoutubeErrorMessage("");
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
  const totalFetchedYoutubeVideos = youtubeCreators.reduce((totalVideos, creator) => {
    return totalVideos + (breakoutPosts[creator.id]?.length ?? 0);
  }, 0);

  const leaderboardSortValue = (entry: CreatorLeaderboardEntry) => {
    if (leaderboardSortMode === "Breakout Rate") {
      return entry.breakoutRate;
    }

    if (leaderboardSortMode === "Views/Hour") {
      return entry.avgViewsPerHour;
    }

    if (leaderboardSortMode === "Recent Views") {
      return entry.totalRecentViews;
    }

    return entry.averageBreakoutScore;
  };

  const sortCreatorLeaderboard = (
    leftCreator: CreatorLeaderboardEntry,
    rightCreator: CreatorLeaderboardEntry
  ) => {
    const sortValueDifference =
      leaderboardSortValue(rightCreator) - leaderboardSortValue(leftCreator);

    if (sortValueDifference !== 0) {
      return sortValueDifference;
    }

    if (rightCreator.averageBreakoutScore !== leftCreator.averageBreakoutScore) {
      return rightCreator.averageBreakoutScore - leftCreator.averageBreakoutScore;
    }

    if (rightCreator.breakoutRate !== leftCreator.breakoutRate) {
      return rightCreator.breakoutRate - leftCreator.breakoutRate;
    }

    if (rightCreator.totalRecentViews !== leftCreator.totalRecentViews) {
      return rightCreator.totalRecentViews - leftCreator.totalRecentViews;
    }

    return leftCreator.creatorName.localeCompare(rightCreator.creatorName);
  };

  const creatorLeaderboard = youtubeCreators
    .map((creator) =>
      getCreatorLeaderboardEntry(
        creator,
        sortVideosByPerformance(breakoutPosts[creator.id] ?? [])
      )
    )
    .sort(sortCreatorLeaderboard);
  const creatorAnalyticsById = useMemo(() => {
    return Object.fromEntries(
      youtubeCreators.map((creator) => [
        creator.id,
        aggregateCreatorStats(sortVideosByPerformance(breakoutPosts[creator.id] ?? [])),
      ])
    ) as Record<number, ReturnType<typeof aggregateCreatorStats>>;
  }, [breakoutPosts, youtubeCreators]);

  const baseVisibleFilteredVideos = youtubeCreators.flatMap((creator) =>
    sortVideosByPerformance(breakoutPosts[creator.id] ?? []).filter((video) =>
      matchesVideoFilter(video, videoFilter)
    )
  );
  const benchmarkSummary = getBenchmarkSummary(baseVisibleFilteredVideos);
  const scenarioViewData = getScenarioViewData(
    baseVisibleFilteredVideos,
    benchmarkSummary,
    scenarioMode
  );
  const visibleFilteredVideos = scenarioViewData.visibleVideos;
  const executiveSummary = getExecutiveSummary(
    visibleFilteredVideos,
    benchmarkSummary,
    scenarioMode
  );
  const insightConfidence = getInsightConfidence(visibleFilteredVideos);
  const outlierAlerts = getOutlierAlerts(
    visibleFilteredVideos,
    creators,
    breakoutPosts,
    videoFilter
  );
  const creatorDiversification = getCreatorDiversificationSummary(
    visibleFilteredVideos
  );
  const signalShiftSummary = getSignalShiftSummary(
    visibleFilteredVideos,
    baseVisibleFilteredVideos
  );
  const patternSnapshot = getPatternSnapshot(visibleFilteredVideos);
  const topSignals = getTopSignals(visibleFilteredVideos);
  const contentOpportunities = getContentOpportunities(
    visibleFilteredVideos,
    benchmarkSummary
  );
  const watchlistCandidates = getWatchlistCandidates(
    visibleFilteredVideos,
    benchmarkSummary
  );
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
  const hasBenchmarkData = visibleFilteredVideos.length > 0;
  const comparableCreators = creatorLeaderboard.filter((entry) => entry.videosAnalyzed > 0);
  const selectedLeftCreator = youtubeCreators.find(
    (creator) => creator.id === leftComparedCreatorId
  );
  const selectedRightCreator = youtubeCreators.find(
    (creator) => creator.id === rightComparedCreatorId
  );
  const leftCreatorAnalytics =
    leftComparedCreatorId !== null ? creatorAnalyticsById[leftComparedCreatorId] : null;
  const rightCreatorAnalytics =
    rightComparedCreatorId !== null ? creatorAnalyticsById[rightComparedCreatorId] : null;
  const creatorComparison =
    leftCreatorAnalytics && rightCreatorAnalytics
      ? getCreatorComparison(leftCreatorAnalytics, rightCreatorAnalytics)
      : null;

  const videoFilterOptions: VideoFilter[] = [
    "All",
    "Top Breakouts",
    "High Engagement",
    "Recent Surge",
  ];
  const scenarioModeOptions: ScenarioMode[] = [
    "Balanced",
    "Breakout Hunt",
    "Engagement Hunt",
    "Emerging Watchlist",
  ];
  const leaderboardSortOptions: LeaderboardSortMode[] = [
    "Avg Breakout",
    "Breakout Rate",
    "Views/Hour",
    "Recent Views",
  ];
  const savedViewPresets: SavedViewPreset[] = [
    {
      name: "Default Radar",
      videoFilter: "All",
      scenarioMode: "Balanced",
      leaderboardSortMode: "Avg Breakout",
    },
    {
      name: "Breakout Scan",
      videoFilter: "Top Breakouts",
      scenarioMode: "Breakout Hunt",
      leaderboardSortMode: "Avg Breakout",
    },
    {
      name: "Engagement Scan",
      videoFilter: "High Engagement",
      scenarioMode: "Engagement Hunt",
      leaderboardSortMode: "Breakout Rate",
    },
    {
      name: "Early Movers",
      videoFilter: "All",
      scenarioMode: "Emerging Watchlist",
      leaderboardSortMode: "Views/Hour",
    },
  ];
  const activeSavedView = useMemo(() => {
    return (
      savedViewPresets.find((preset) => {
        return (
          preset.videoFilter === videoFilter &&
          preset.scenarioMode === scenarioMode &&
          preset.leaderboardSortMode === leaderboardSortMode
        );
      })?.name ?? "Custom View"
    );
  }, [leaderboardSortMode, scenarioMode, videoFilter]);

  const retryYoutubeFetch = () => {
    if (!breakoutLoading && youtubeCreators.length > 0) {
      loadBreakoutPosts(youtubeCreators);
    }
  };

  const applySavedView = (preset: SavedViewPreset) => {
    setVideoFilter(preset.videoFilter);
    setScenarioMode(preset.scenarioMode);
    setLeaderboardSortMode(preset.leaderboardSortMode);
  };

  useEffect(() => {
    if (comparableCreators.length < 2) {
      setLeftComparedCreatorId(null);
      setRightComparedCreatorId(null);
      return;
    }

    const defaultLeftId = comparableCreators[0]?.creatorId ?? null;
    const defaultRightId = comparableCreators[1]?.creatorId ?? null;

    setLeftComparedCreatorId((currentId) => {
      if (
        currentId !== null &&
        comparableCreators.some((creator) => creator.creatorId === currentId)
      ) {
        return currentId;
      }

      return defaultLeftId;
    });

    setRightComparedCreatorId((currentId) => {
      if (
        currentId !== null &&
        currentId !== leftComparedCreatorId &&
        comparableCreators.some((creator) => creator.creatorId === currentId)
      ) {
        return currentId;
      }

      return defaultRightId;
    });
  }, [comparableCreators, leftComparedCreatorId]);

  const handleLeftCreatorChange = (creatorId: number) => {
    setLeftComparedCreatorId(creatorId);

    if (creatorId === rightComparedCreatorId) {
      const fallbackCreator = comparableCreators.find(
        (creator) => creator.creatorId !== creatorId
      );
      setRightComparedCreatorId(fallbackCreator?.creatorId ?? null);
    }
  };

  const handleRightCreatorChange = (creatorId: number) => {
    setRightComparedCreatorId(creatorId);

    if (creatorId === leftComparedCreatorId) {
      const fallbackCreator = comparableCreators.find(
        (creator) => creator.creatorId !== creatorId
      );
      setLeftComparedCreatorId(fallbackCreator?.creatorId ?? null);
    }
  };

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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-400">YouTube creators only</span>
                <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
                  Scenario: {scenarioMode}
                </span>
                <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
                  View: {activeSavedView}
                </span>
              </div>
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

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Saved Views
              </p>
              <span className="text-xs text-zinc-500">
                Active: {activeSavedView}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedViewPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applySavedView(preset)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeSavedView === preset.name
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {scenarioModeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setScenarioMode(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  scenarioMode === option
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  {executiveSummary.headline}
                </p>
                <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                  {executiveSummary.subheadline}
                </p>
                <div className="mt-3">
                  <InsightConfidenceBadge confidence={insightConfidence} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200">
                  {executiveSummary.dominantSignal}
                </span>
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200">
                  {executiveSummary.marketState}
                </span>
              </div>
            </div>
          </div>

          {visibleFilteredVideos.length > 0 && (
            <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {scenarioViewData.emphasizeEngagement ? (
                <>
                  <SignalCard
                    label="Best Engagement"
                    video={topSignals.mostEngagingVideo}
                    metricLabel="Engagement Rate"
                    metricValue={`${(
                      (topSignals.mostEngagingVideo?.engagementRate ?? 0) * 100
                    ).toFixed(1)}%`}
                  />
                  <SignalCard
                    label="Strongest Comments"
                    video={topSignals.strongestCommentVideo}
                    metricLabel="Comments"
                    metricValue={formatCompactNumber(
                      topSignals.strongestCommentVideo?.commentCount
                    )}
                  />
                  <SignalCard
                    label="Fastest Rising"
                    video={topSignals.fastestVideo}
                    metricLabel="Views / Hour"
                    metricValue={formatCompactNumber(
                      topSignals.fastestVideo?.viewsPerHour
                    )}
                  />
                  <SignalCard
                    label="Top Breakout"
                    video={topSignals.topBreakoutVideo}
                    metricLabel="Breakout Score"
                    metricValue={formatCompactNumber(
                      topSignals.topBreakoutVideo?.breakoutScore
                    )}
                  />
                </>
              ) : scenarioViewData.emphasizeWatchlist ? (
                <>
                  <SignalCard
                    label="Fastest Rising"
                    video={topSignals.fastestVideo}
                    metricLabel="Views / Hour"
                    metricValue={formatCompactNumber(
                      topSignals.fastestVideo?.viewsPerHour
                    )}
                  />
                  <SignalCard
                    label="Top Breakout"
                    video={topSignals.topBreakoutVideo}
                    metricLabel="Breakout Score"
                    metricValue={formatCompactNumber(
                      topSignals.topBreakoutVideo?.breakoutScore
                    )}
                  />
                  <SignalCard
                    label="Best Engagement"
                    video={topSignals.mostEngagingVideo}
                    metricLabel="Engagement Rate"
                    metricValue={`${(
                      (topSignals.mostEngagingVideo?.engagementRate ?? 0) * 100
                    ).toFixed(1)}%`}
                  />
                  <SignalCard
                    label="Strongest Comments"
                    video={topSignals.strongestCommentVideo}
                    metricLabel="Comments"
                    metricValue={formatCompactNumber(
                      topSignals.strongestCommentVideo?.commentCount
                    )}
                  />
                </>
              ) : (
                <>
                  <SignalCard
                    label="Top Breakout"
                    video={topSignals.topBreakoutVideo}
                    metricLabel="Breakout Score"
                    metricValue={formatCompactNumber(
                      topSignals.topBreakoutVideo?.breakoutScore
                    )}
                  />
                  <SignalCard
                    label="Fastest Rising"
                    video={topSignals.fastestVideo}
                    metricLabel="Views / Hour"
                    metricValue={formatCompactNumber(
                      topSignals.fastestVideo?.viewsPerHour
                    )}
                  />
                  <SignalCard
                    label="Best Engagement"
                    video={topSignals.mostEngagingVideo}
                    metricLabel="Engagement Rate"
                    metricValue={`${(
                      (topSignals.mostEngagingVideo?.engagementRate ?? 0) * 100
                    ).toFixed(1)}%`}
                  />
                  <SignalCard
                    label="Strongest Comments"
                    video={topSignals.strongestCommentVideo}
                    metricLabel="Comments"
                    metricValue={formatCompactNumber(
                      topSignals.strongestCommentVideo?.commentCount
                    )}
                  />
                </>
              )}
            </div>
          )}

          {comparableCreators.length >= 2 &&
            selectedLeftCreator &&
            selectedRightCreator &&
            creatorComparison && (
              <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Compare Creators
                    </h3>
                    <p className="text-sm text-gray-400">
                      Side-by-side benchmarking for the current tracked YouTube set
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={leftComparedCreatorId ?? ""}
                      onChange={(event) =>
                        handleLeftCreatorChange(Number(event.target.value))
                      }
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
                    >
                      {youtubeCreators.map((creator) => (
                        <option
                          key={creator.id}
                          value={creator.id}
                          disabled={creator.id === rightComparedCreatorId}
                        >
                          {creator.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rightComparedCreatorId ?? ""}
                      onChange={(event) =>
                        handleRightCreatorChange(Number(event.target.value))
                      }
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
                    >
                      {youtubeCreators.map((creator) => (
                        <option
                          key={creator.id}
                          value={creator.id}
                          disabled={creator.id === leftComparedCreatorId}
                        >
                          {creator.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-[1fr,auto,auto] items-center gap-3 px-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Metric
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {selectedLeftCreator.name}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {selectedRightCreator.name}
                  </p>
                </div>

                <div className="space-y-3">
                  <ComparisonMetricRow
                    label="Avg Breakout Score"
                    metric={creatorComparison.avgBreakoutScore}
                    formatter={formatCompactNumber}
                  />
                  <ComparisonMetricRow
                    label="Breakout Rate"
                    metric={creatorComparison.breakoutRate}
                    formatter={(value) => `${value}%`}
                  />
                  <ComparisonMetricRow
                    label="Avg Views / Hour"
                    metric={creatorComparison.avgViewsPerHour}
                    formatter={formatCompactNumber}
                  />
                  <ComparisonMetricRow
                    label="Avg Engagement Rate"
                    metric={creatorComparison.avgEngagementRate}
                    formatter={(value) => `${(value * 100).toFixed(1)}%`}
                  />
                  <ComparisonMetricRow
                    label="Recent Views"
                    metric={creatorComparison.totalRecentViews}
                    formatter={formatCompactNumber}
                  />
                  <ComparisonMetricRow
                    label="Top Video Breakout"
                    metric={creatorComparison.topVideoBreakoutScore}
                    formatter={formatCompactNumber}
                  />
                </div>
              </div>
            )}

          {!breakoutLoading && creatorLeaderboard.length > 0 && (
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        YouTube Leaderboard
                      </h3>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
                        Sorted by {leaderboardSortMode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Ranked by average breakout score across recent videos
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {leaderboardSortOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setLeaderboardSortMode(option)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          leaderboardSortMode === option
                            ? "bg-white text-black"
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
                      {creatorLeaderboard.length} creators
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {creatorLeaderboard.map((entry, index) => (
                    <div
                      key={entry.creatorId}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 md:grid-cols-[auto,1.2fr,repeat(5,minmax(0,1fr))]"
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
                        <div className="mt-2">
                          <MomentumBadge momentum={entry.momentum} />
                        </div>
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
                          Breakout Rate
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {entry.breakoutRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Avg Views/Hour
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(entry.avgViewsPerHour)}
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

                {outlierAlerts.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Outlier Alerts
                      </h3>
                      <p className="text-sm text-gray-400">
                        Signals that may be distorting the current read
                      </p>
                    </div>

                    <div className="space-y-3">
                      {outlierAlerts.map((alert) => (
                        <OutlierAlertCard
                          key={`${alert.level}-${alert.title}`}
                          alert={alert}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <SignalShiftCard shiftSummary={signalShiftSummary} />

                <CreatorDiversificationCard
                  diversification={creatorDiversification}
                />

                {visibleFilteredVideos.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Benchmark Summary
                      </h3>
                      <p className="text-sm text-gray-400">
                        Relative baselines for the videos visible under the current
                        filter
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Median Views
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(benchmarkSummary.medianViews)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Median Breakout
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(benchmarkSummary.medianBreakoutScore)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Median Views/Hour
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(benchmarkSummary.medianViewsPerHour)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          High Breakout
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(
                            benchmarkSummary.highBreakoutThreshold
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          High Velocity
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(
                            benchmarkSummary.highVelocityThreshold
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          High Engagement
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {(benchmarkSummary.highEngagementThreshold * 100).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {scenarioViewData.emphasizeWatchlist && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Watchlist Candidates
                      </h3>
                      <p className="text-sm text-gray-400">
                        Emerging videos worth watching before they become obvious winners
                      </p>
                    </div>

                    {watchlistCandidates.length > 0 ? (
                      <div className="space-y-3">
                        {watchlistCandidates.map((video) => (
                          <div
                            key={video.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-white">
                                  {video.title}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {video.channelTitle || "Tracked YouTube creator"}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                {formatCompactNumber(video.viewsPerHour)} vph
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-400">
                              {video.watchlistReason}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400">
                        Not enough emerging videos stand out yet. Broaden the filter or
                        wait for fresher uploads to surface new watchlist candidates.
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Content Opportunities
                    </h3>
                    <p className="text-sm text-gray-400">
                      What the current visible signal set suggests you should create
                      next
                    </p>
                  </div>

                  <ul className="space-y-3 text-sm text-zinc-200">
                    {contentOpportunities.map((opportunity) => (
                      <li
                        key={opportunity}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                      >
                        {opportunity}
                      </li>
                    ))}
                  </ul>
                </div>

                {!scenarioViewData.emphasizeWatchlist && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Watchlist Candidates
                      </h3>
                      <p className="text-sm text-gray-400">
                        Emerging videos worth watching before they become obvious winners
                      </p>
                    </div>

                    {watchlistCandidates.length > 0 ? (
                      <div className="space-y-3">
                        {watchlistCandidates.map((video) => (
                          <div
                            key={video.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-white">
                                  {video.title}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {video.channelTitle || "Tracked YouTube creator"}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                {formatCompactNumber(video.viewsPerHour)} vph
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-400">
                              {video.watchlistReason}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400">
                        Not enough emerging videos stand out yet. Broaden the filter or
                        wait for fresher uploads to surface new watchlist candidates.
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Analyst Takeaways
                    </h3>
                    <p className="text-sm text-gray-400">
                      Plain-English observations from the current visible set
                    </p>
                    <div className="mt-3">
                      <InsightConfidenceBadge confidence={insightConfidence} />
                    </div>
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
                    <div className="mt-3">
                      <InsightConfidenceBadge confidence={insightConfidence} />
                    </div>
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

          {breakoutLoading && totalFetchedYoutubeVideos === 0 ? (
            <DashboardStateCard
              title="Loading YouTube intelligence"
              message="We’re pulling the latest tracked uploads, scoring momentum, and preparing the dashboard for review."
            />
          ) : youtubeCreators.length === 0 ? (
            <DashboardStateCard
              title="Track a YouTube creator to unlock analytics"
              message="Add at least one YouTube creator with a valid handle above to populate the leaderboard, patterns, and breakout tracking."
            />
          ) : totalFetchedYoutubeVideos === 0 ? (
            <DashboardStateCard
              title={
                youtubeErrorMessage
                  ? "We couldn't load YouTube videos"
                  : "No recent YouTube videos returned"
              }
              message={
                youtubeErrorMessage ||
                "Your tracked YouTube creators are connected, but no recent videos came back yet. Check the handle, wait for a new upload, or retry the fetch."
              }
              actionLabel="Retry YouTube fetch"
              onAction={retryYoutubeFetch}
              isActionDisabled={breakoutLoading}
              tone={youtubeErrorMessage ? "error" : "default"}
            />
          ) : (
            <div className="space-y-6">
              {youtubeErrorMessage && (
                <DashboardStateCard
                  title="Some YouTube results need another pass"
                  message={youtubeErrorMessage}
                  actionLabel="Retry YouTube fetch"
                  onAction={retryYoutubeFetch}
                  isActionDisabled={breakoutLoading}
                  tone="error"
                />
              )}

              {youtubeCreators.map((creator) => {
                  const creatorVideos = sortVideosByPerformance(
                    breakoutPosts[creator.id] ?? []
                  );
                  const filteredCreatorVideos = creatorVideos.filter((video) =>
                    matchesVideoFilter(video, videoFilter)
                  );
                  const scenarioFilteredCreatorVideos = getScenarioViewData(
                    filteredCreatorVideos,
                    benchmarkSummary,
                    scenarioMode
                  ).visibleVideos;
                  const topBreakoutScore = getTopBreakoutScore(creatorVideos);
                  const creatorAnalytics = aggregateCreatorStats(creatorVideos);
                  const creatorMomentum = getCreatorMomentumDelta(creatorVideos);
                  const creatorBenchmarkStatus = hasBenchmarkData
                    ? getCreatorBenchmarkStatus(creatorAnalytics, benchmarkSummary)
                    : null;

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

                      {creatorBenchmarkStatus && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          <BenchmarkBadge
                            label="Breakout"
                            status={creatorBenchmarkStatus.breakoutStatus}
                          />
                          <BenchmarkBadge
                            label="Velocity"
                            status={creatorBenchmarkStatus.velocityStatus}
                          />
                          <BenchmarkBadge
                            label="Engagement"
                            status={creatorBenchmarkStatus.engagementStatus}
                          />
                          <MomentumBadge momentum={creatorMomentum} />
                        </div>
                      )}

                      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Recent Views
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatCompactNumber(creatorAnalytics.totalRecentViews)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Avg Breakout
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatCompactNumber(creatorAnalytics.avgBreakoutScore)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Breakout Rate
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {creatorAnalytics.breakoutRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Avg Views/Hour
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatCompactNumber(creatorAnalytics.avgViewsPerHour)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatCompactNumber(creatorAnalytics.avgLikes)} likes avg
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatCompactNumber(creatorAnalytics.avgComments)} comments avg
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Top Video
                          </p>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                            {creatorAnalytics.topVideoTitle}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Breakout {formatCompactNumber(creatorAnalytics.topVideoBreakoutScore)}
                          </p>
                        </div>
                      </div>

                      {scenarioFilteredCreatorVideos.length ? (
                        <div className="space-y-3">
                          {scenarioFilteredCreatorVideos.map((video) => {
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
                        <DashboardStateCard
                          title="No videos match this filter"
                          message={`No recent videos from ${creator.name} match the ${videoFilter.toLowerCase()} view right now. Try another filter to widen the signal.`}
                          actionLabel="Show all videos"
                          onAction={() => setVideoFilter("All")}
                        />
                      )}
                    </div>
                  );
                })}

              {visibleFilteredVideos.length === 0 && (
                <DashboardStateCard
                  title="No visible videos under the current filter"
                  message={`The ${videoFilter.toLowerCase()} filter is narrowing the set down to zero visible videos. Reset to All to compare the full tracked YouTube feed again.`}
                  actionLabel="Reset to All"
                  onAction={() => setVideoFilter("All")}
                />
              )}
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
