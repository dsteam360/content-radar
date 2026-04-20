export type RadarSnapshotRunType = "manual" | "scheduled";
export type RadarSnapshotStatus = "success" | "partial" | "failed";
export type CreatorSnapshotFetchStatus = "success" | "failed";

export type RadarSnapshotSummary = {
  trackedCreatorCount: number;
  activeCreatorCount: number;
  inactiveCreatorCount: number;
  averageBreakoutScore: number;
  medianViews: number;
  medianViewsPerHour: number;
  creatorCoveragePercent: number;
  failureCount: number;
  successfulCreatorCount: number;
};

export type RadarSnapshotRecord = {
  id: string;
  created_at: string;
  platform: string;
  creator_count: number;
  video_count: number;
  run_type: RadarSnapshotRunType;
  status: RadarSnapshotStatus;
  summary_json: RadarSnapshotSummary | null;
};

export type CreatorSnapshotMetadata = {
  fetchStatus: CreatorSnapshotFetchStatus;
  errorMessage?: string;
  breakoutDelta?: number;
  viewsPerHourDelta?: number;
  engagementDelta?: number;
};

export type CreatorSnapshotRecord = {
  id: string;
  radar_snapshot_id: string;
  creator_id: number | null;
  creator_name: string;
  platform: string;
  videos_analyzed: number;
  total_recent_views: number;
  average_breakout_score: number;
  breakout_rate: number;
  avg_views_per_hour: number;
  avg_engagement_rate: number;
  top_video_breakout_score: number;
  consistency_score: number;
  momentum_label: "Accelerating" | "Stable" | "Cooling";
  metadata_json: CreatorSnapshotMetadata | null;
};

export type SnapshotMetricDelta = {
  current: number;
  previous: number | null;
  delta: number | null;
};

export type SnapshotHistoryHealth = {
  snapshotCount: number;
  successfulSnapshotCount: number;
  lastRefreshAt: string | null;
  lastSuccessfulSnapshotAt: string | null;
  lastRunType: RadarSnapshotRunType | null;
  lastSnapshotStatus: RadarSnapshotStatus | null;
  hasEnoughHistory: boolean;
  summary: string;
};

export type SnapshotComparisonSummary = {
  available: boolean;
  basedOnSnapshotIds: string[];
  videoCount: SnapshotMetricDelta;
  averageBreakoutScore: SnapshotMetricDelta;
  medianViews: SnapshotMetricDelta;
  medianViewsPerHour: SnapshotMetricDelta;
  creatorCoveragePercent: SnapshotMetricDelta;
  summary: string;
};

export type CreatorTrendRow = {
  creatorId: number | null;
  creatorName: string;
  momentumLabel: "Accelerating" | "Stable" | "Cooling";
  current: {
    averageBreakoutScore: number;
    breakoutRate: number;
    avgViewsPerHour: number;
    totalRecentViews: number;
  };
  previous: {
    averageBreakoutScore: number;
    breakoutRate: number;
    avgViewsPerHour: number;
    totalRecentViews: number;
  } | null;
  delta: {
    averageBreakoutScore: number | null;
    breakoutRate: number | null;
    avgViewsPerHour: number | null;
    totalRecentViews: number | null;
  };
};

export type RecentSnapshotListItem = {
  id: string;
  createdAt: string;
  runType: RadarSnapshotRunType;
  status: RadarSnapshotStatus;
  creatorCount: number;
  videoCount: number;
};

export type RadarHistoryView = {
  health: SnapshotHistoryHealth;
  comparison: SnapshotComparisonSummary;
  creatorTrends: CreatorTrendRow[];
  recentSnapshots: RecentSnapshotListItem[];
};

export function getEmptyRadarHistoryView(summary?: string): RadarHistoryView {
  return {
    health: {
      snapshotCount: 0,
      successfulSnapshotCount: 0,
      lastRefreshAt: null,
      lastSuccessfulSnapshotAt: null,
      lastRunType: null,
      lastSnapshotStatus: null,
      hasEnoughHistory: false,
      summary:
        summary ??
        "No stored snapshots yet. Run a manual refresh to create the first historical baseline.",
    },
    comparison: {
      available: false,
      basedOnSnapshotIds: [],
      videoCount: buildMetricDelta(0, null),
      averageBreakoutScore: buildMetricDelta(0, null),
      medianViews: buildMetricDelta(0, null),
      medianViewsPerHour: buildMetricDelta(0, null),
      creatorCoveragePercent: buildMetricDelta(0, null),
      summary: "No snapshot history is available yet.",
    },
    creatorTrends: [],
    recentSnapshots: [],
  };
}

function toSnapshotSummary(
  summary: RadarSnapshotRecord["summary_json"],
  fallbackCreatorCount: number
): RadarSnapshotSummary {
  return {
    trackedCreatorCount: summary?.trackedCreatorCount ?? fallbackCreatorCount,
    activeCreatorCount: summary?.activeCreatorCount ?? 0,
    inactiveCreatorCount: summary?.inactiveCreatorCount ?? 0,
    averageBreakoutScore: summary?.averageBreakoutScore ?? 0,
    medianViews: summary?.medianViews ?? 0,
    medianViewsPerHour: summary?.medianViewsPerHour ?? 0,
    creatorCoveragePercent: summary?.creatorCoveragePercent ?? 0,
    failureCount: summary?.failureCount ?? 0,
    successfulCreatorCount: summary?.successfulCreatorCount ?? 0,
  };
}

function buildMetricDelta(
  current: number,
  previous: number | null
): SnapshotMetricDelta {
  return {
    current,
    previous,
    delta: previous === null ? null : current - previous,
  };
}

export function buildRadarSnapshotSummary(input: {
  trackedCreatorCount: number;
  activeCreatorCount: number;
  averageBreakoutScore: number;
  medianViews: number;
  medianViewsPerHour: number;
  failureCount: number;
  successfulCreatorCount: number;
}) {
  const creatorCoveragePercent =
    input.trackedCreatorCount > 0
      ? Math.round((input.activeCreatorCount / input.trackedCreatorCount) * 100)
      : 0;

  return {
    trackedCreatorCount: input.trackedCreatorCount,
    activeCreatorCount: input.activeCreatorCount,
    inactiveCreatorCount: Math.max(
      0,
      input.trackedCreatorCount - input.activeCreatorCount
    ),
    averageBreakoutScore: input.averageBreakoutScore,
    medianViews: input.medianViews,
    medianViewsPerHour: input.medianViewsPerHour,
    creatorCoveragePercent,
    failureCount: input.failureCount,
    successfulCreatorCount: input.successfulCreatorCount,
  } satisfies RadarSnapshotSummary;
}

export function buildRadarHistoryView(input: {
  snapshots: RadarSnapshotRecord[];
  creatorSnapshots: CreatorSnapshotRecord[];
}): RadarHistoryView {
  const snapshots = [...input.snapshots].sort((leftSnapshot, rightSnapshot) => {
    return (
      new Date(rightSnapshot.created_at).getTime() -
      new Date(leftSnapshot.created_at).getTime()
    );
  });
  const latestSnapshot = snapshots[0] ?? null;
  const comparableSnapshots = snapshots.filter((snapshot) => snapshot.status !== "failed");
  const currentComparableSnapshot = comparableSnapshots[0] ?? null;
  const previousComparableSnapshot = comparableSnapshots[1] ?? null;
  const currentSummary = currentComparableSnapshot
    ? toSnapshotSummary(
        currentComparableSnapshot.summary_json,
        currentComparableSnapshot.creator_count
      )
    : null;
  const previousSummary = previousComparableSnapshot
    ? toSnapshotSummary(
        previousComparableSnapshot.summary_json,
        previousComparableSnapshot.creator_count
      )
    : null;

  const health: SnapshotHistoryHealth = {
    snapshotCount: snapshots.length,
    successfulSnapshotCount: comparableSnapshots.length,
    lastRefreshAt: latestSnapshot?.created_at ?? null,
    lastSuccessfulSnapshotAt: currentComparableSnapshot?.created_at ?? null,
    lastRunType: latestSnapshot?.run_type ?? null,
    lastSnapshotStatus: latestSnapshot?.status ?? null,
    hasEnoughHistory: comparableSnapshots.length >= 2,
    summary:
      snapshots.length === 0
        ? "No stored snapshots yet. Run a manual refresh to create the first historical baseline."
        : comparableSnapshots.length >= 2
          ? "Snapshot comparisons are available and can be used to track changes over time."
          : "Only one usable snapshot is stored so far, so trend comparisons are still warming up.",
  };

  const comparison: SnapshotComparisonSummary = currentSummary
    ? {
        available: Boolean(previousSummary),
        basedOnSnapshotIds: [
          currentComparableSnapshot?.id,
          previousComparableSnapshot?.id,
        ].filter((snapshotId): snapshotId is string => Boolean(snapshotId)),
        videoCount: buildMetricDelta(
          currentComparableSnapshot?.video_count ?? 0,
          previousComparableSnapshot?.video_count ?? null
        ),
        averageBreakoutScore: buildMetricDelta(
          currentSummary.averageBreakoutScore,
          previousSummary?.averageBreakoutScore ?? null
        ),
        medianViews: buildMetricDelta(
          currentSummary.medianViews,
          previousSummary?.medianViews ?? null
        ),
        medianViewsPerHour: buildMetricDelta(
          currentSummary.medianViewsPerHour,
          previousSummary?.medianViewsPerHour ?? null
        ),
        creatorCoveragePercent: buildMetricDelta(
          currentSummary.creatorCoveragePercent,
          previousSummary?.creatorCoveragePercent ?? null
        ),
        summary: previousSummary
          ? "Snapshot-based comparison between the latest and previous usable refresh runs."
          : "A comparison baseline will appear after another successful or partial snapshot is stored.",
      }
    : {
        available: false,
        basedOnSnapshotIds: [],
        videoCount: buildMetricDelta(0, null),
        averageBreakoutScore: buildMetricDelta(0, null),
        medianViews: buildMetricDelta(0, null),
        medianViewsPerHour: buildMetricDelta(0, null),
        creatorCoveragePercent: buildMetricDelta(0, null),
        summary: "No snapshot history is available yet.",
      };

  const creatorTrends: CreatorTrendRow[] =
    currentComparableSnapshot && previousComparableSnapshot
      ? input.creatorSnapshots
          .filter(
            (snapshot) =>
              snapshot.radar_snapshot_id === currentComparableSnapshot.id &&
              snapshot.metadata_json?.fetchStatus !== "failed"
          )
          .sort((leftSnapshot, rightSnapshot) => {
            return (
              rightSnapshot.average_breakout_score - leftSnapshot.average_breakout_score
            );
          })
          .slice(0, 6)
          .map((currentCreatorSnapshot) => {
            const previousCreatorSnapshot =
              input.creatorSnapshots.find((snapshot) => {
                return (
                  snapshot.radar_snapshot_id === previousComparableSnapshot.id &&
                  snapshot.creator_id === currentCreatorSnapshot.creator_id
                );
              }) ??
              input.creatorSnapshots.find((snapshot) => {
                return (
                  snapshot.radar_snapshot_id === previousComparableSnapshot.id &&
                  snapshot.creator_name === currentCreatorSnapshot.creator_name
                );
              }) ??
              null;

            return {
              creatorId: currentCreatorSnapshot.creator_id,
              creatorName: currentCreatorSnapshot.creator_name,
              momentumLabel: currentCreatorSnapshot.momentum_label,
              current: {
                averageBreakoutScore: currentCreatorSnapshot.average_breakout_score,
                breakoutRate: currentCreatorSnapshot.breakout_rate,
                avgViewsPerHour: currentCreatorSnapshot.avg_views_per_hour,
                totalRecentViews: currentCreatorSnapshot.total_recent_views,
              },
              previous: previousCreatorSnapshot
                ? {
                    averageBreakoutScore:
                      previousCreatorSnapshot.average_breakout_score,
                    breakoutRate: previousCreatorSnapshot.breakout_rate,
                    avgViewsPerHour: previousCreatorSnapshot.avg_views_per_hour,
                    totalRecentViews: previousCreatorSnapshot.total_recent_views,
                  }
                : null,
              delta: {
                averageBreakoutScore: previousCreatorSnapshot
                  ? currentCreatorSnapshot.average_breakout_score -
                    previousCreatorSnapshot.average_breakout_score
                  : null,
                breakoutRate: previousCreatorSnapshot
                  ? currentCreatorSnapshot.breakout_rate -
                    previousCreatorSnapshot.breakout_rate
                  : null,
                avgViewsPerHour: previousCreatorSnapshot
                  ? currentCreatorSnapshot.avg_views_per_hour -
                    previousCreatorSnapshot.avg_views_per_hour
                  : null,
                totalRecentViews: previousCreatorSnapshot
                  ? currentCreatorSnapshot.total_recent_views -
                    previousCreatorSnapshot.total_recent_views
                  : null,
              },
            };
          })
      : [];

  const recentSnapshots: RecentSnapshotListItem[] = snapshots.slice(0, 5).map((snapshot) => ({
    id: snapshot.id,
    createdAt: snapshot.created_at,
    runType: snapshot.run_type,
    status: snapshot.status,
    creatorCount: snapshot.creator_count,
    videoCount: snapshot.video_count,
  }));

  return {
    health,
    comparison,
    creatorTrends,
    recentSnapshots,
  };
}
