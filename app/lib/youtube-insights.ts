import { INTELLIGENCE_THRESHOLDS } from "@/app/lib/config/thresholds";
import {
  calculateBreakoutScore,
  getBreakoutReason,
  getHoursSincePublished,
} from "@/app/lib/youtube-scoring";

export { getBreakoutReason } from "@/app/lib/youtube-scoring";

export type Creator = {
  id: number;
  name: string;
  platform: string;
  youtube_handle?: string | null;
  youtube_channel_id?: string | null;
  created_at?: string;
};

export type Video = {
  id: string;
  title: string;
  publishedAt: string;
  currentTimestamp?: number;
  thumbnail?: string;
  channelTitle?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  breakoutScore: number;
  breakoutReason: string;
};

export type CreatorLeaderboardEntry = {
  creatorId: number;
  creatorName: string;
  totalRecentViews: number;
  averageBreakoutScore: number;
  topVideoBreakoutScore: number;
  videosAnalyzed: number;
  consistencyScore: number;
  breakoutRate: number;
  avgViewsPerHour: number;
  avgLikes: number;
  avgComments: number;
  momentum: CreatorMomentumDelta;
};

export type VideoFilter =
  | "All"
  | "Top Breakouts"
  | "High Engagement"
  | "Recent Surge";

export type ScenarioMode =
  | "Balanced"
  | "Breakout Hunt"
  | "Engagement Hunt"
  | "Emerging Watchlist";

export type PatternSnapshot = {
  visibleVideos: number;
  averageViews: number;
  averageBreakoutScore: number;
  mostCommonReason: string;
};

export type CreatorAnalytics = {
  totalVideos: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgBreakoutScore: number;
  breakoutRate: number;
  avgViewsPerHour: number;
  avgEngagementRate: number;
  topPerformer: Video | null;
  totalRecentViews: number;
  topVideoTitle: string;
  topVideoBreakoutScore: number;
  consistencyScore: number;
};

export type CreatorMomentumDelta = {
  breakoutDelta: number;
  viewsPerHourDelta: number;
  engagementDelta: number;
  momentumLabel: "Accelerating" | "Stable" | "Cooling";
};

export type TopSignalVideo = Video & {
  viewsPerHour: number;
  engagementRate: number;
  commentDensity: number;
};

export type TopSignals = {
  topBreakoutVideo: TopSignalVideo | null;
  fastestVideo: TopSignalVideo | null;
  mostEngagingVideo: TopSignalVideo | null;
  strongestCommentVideo: TopSignalVideo | null;
};

export type BenchmarkSummary = {
  medianViews: number;
  medianBreakoutScore: number;
  medianViewsPerHour: number;
  medianEngagementRate: number;
  highBreakoutThreshold: number;
  highVelocityThreshold: number;
  highEngagementThreshold: number;
};

export type BenchmarkStatus = "Above" | "Near" | "Below";

export type CreatorBenchmarkStatus = {
  breakoutStatus: BenchmarkStatus;
  velocityStatus: BenchmarkStatus;
  engagementStatus: BenchmarkStatus;
};

export type ComparisonWinner = "left" | "right" | "tie";

export type CreatorComparisonMetric = {
  leftValue: number;
  rightValue: number;
  winner: ComparisonWinner;
};

export type CreatorComparison = {
  avgBreakoutScore: CreatorComparisonMetric;
  breakoutRate: CreatorComparisonMetric;
  avgViewsPerHour: CreatorComparisonMetric;
  avgEngagementRate: CreatorComparisonMetric;
  totalRecentViews: CreatorComparisonMetric;
  topVideoBreakoutScore: CreatorComparisonMetric;
};

export type WatchlistCandidate = {
  id: string;
  title: string;
  channelTitle?: string;
  breakoutScore: number;
  viewsPerHour: number;
  watchlistReason: string;
};

export type ScenarioViewData = {
  visibleVideos: Video[];
  emphasizeTopSignals: boolean;
  emphasizeEngagement: boolean;
  emphasizeWatchlist: boolean;
};

export type ExecutiveSummary = {
  headline: string;
  subheadline: string;
  dominantSignal: string;
  marketState: string;
};

export type InsightConfidence = {
  level: "High" | "Medium" | "Low";
  score: number;
  reason: string;
};

export type OutlierAlert = {
  level: "info" | "warning";
  title: string;
  message: string;
};

export type CreatorDiversificationSummary = {
  level: "High" | "Medium" | "Low";
  activeCreators: number;
  creatorShareLeader: string;
  leaderSharePercent: number;
  summary: string;
};

type CreatorVideoSummary = {
  totalRecentViews: number;
  averageBreakoutScore: number;
  topVideoTitle: string;
  topVideoBreakoutScore: number;
  consistencyScore: number;
};

function getSafeNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getPercentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((leftValue, rightValue) => {
    return leftValue - rightValue;
  });
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentile) - 1)
  );

  return sortedValues[index] ?? 0;
}

function getBenchmarkLevel(
  value: number,
  medianThreshold: number,
  highThreshold: number
): BenchmarkStatus {
  if (value >= highThreshold) {
    return "Above";
  }

  if (value >= medianThreshold) {
    return "Near";
  }

  return "Below";
}

function compareMetric(leftValue: number, rightValue: number): CreatorComparisonMetric {
  return {
    leftValue,
    rightValue,
    winner:
      leftValue === rightValue ? "tie" : leftValue > rightValue ? "left" : "right",
  };
}

function enrichVideoMetrics(video: Video): TopSignalVideo {
  const breakoutScore = calculateBreakoutScore(video);
  const viewCount = getSafeNumber(video.viewCount);
  const likeCount = getSafeNumber(video.likeCount);
  const commentCount = getSafeNumber(video.commentCount);
  const hoursSincePublished = getHoursSincePublished(
    video.publishedAt,
    video.currentTimestamp
  );
  const engagementRate =
    viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
  const commentDensity = viewCount > 0 ? commentCount / viewCount : 0;

  return {
    ...video,
    breakoutScore,
    breakoutReason: getBreakoutReason({
      ...video,
      breakoutScore,
    }),
    viewsPerHour: viewCount / hoursSincePublished,
    engagementRate,
    commentDensity,
  };
}

export function formatPublishedTime(publishedAt: string) {
  const {
    hoursPerDay,
    millisecondsPerSecond,
    minutesPerHour,
    secondsPerMinute,
  } = INTELLIGENCE_THRESHOLDS.time;
  const publishedDate = new Date(publishedAt);
  const diffSeconds = Math.floor(
    (Date.now() - publishedDate.getTime()) / millisecondsPerSecond
  );

  if (diffSeconds < secondsPerMinute) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / secondsPerMinute);
  if (diffMinutes < minutesPerHour) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / minutesPerHour);
  if (diffHours < hoursPerDay) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / hoursPerDay);
  return `${diffDays}d ago`;
}

export function formatCompactNumber(value?: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(getSafeNumber(value));
}

export function normalizeYoutubeHandle(handle: string) {
  const trimmedHandle = handle.trim();

  if (!trimmedHandle) {
    return "";
  }

  return trimmedHandle.startsWith("@") ? trimmedHandle : `@${trimmedHandle}`;
}

export function getTopBreakoutScore(videos: Video[]) {
  return videos.reduce((topScore, video) => {
    return Math.max(topScore, getSafeNumber(video.breakoutScore));
  }, 0);
}

export function getCreatorMomentumDelta(videos: Video[]): CreatorMomentumDelta {
  if (videos.length < 2) {
    return {
      breakoutDelta: 0,
      viewsPerHourDelta: 0,
      engagementDelta: 0,
      momentumLabel: "Stable",
    };
  }

  const orderedVideos = [...videos]
    .map(enrichVideoMetrics)
    .sort((leftVideo, rightVideo) => {
      return (
        new Date(rightVideo.publishedAt).getTime() -
        new Date(leftVideo.publishedAt).getTime()
      );
    });

  const splitIndex = Math.ceil(orderedVideos.length / 2);
  const recentVideos = orderedVideos.slice(0, splitIndex);
  const olderVideos = orderedVideos.slice(splitIndex);

  if (recentVideos.length === 0 || olderVideos.length === 0) {
    return {
      breakoutDelta: 0,
      viewsPerHourDelta: 0,
      engagementDelta: 0,
      momentumLabel: "Stable",
    };
  }

  const getAverage = (
    slice: TopSignalVideo[],
    selector: (video: TopSignalVideo) => number
  ) => {
    return slice.reduce((sum, video) => sum + selector(video), 0) / slice.length;
  };

  const breakoutDelta =
    getAverage(recentVideos, (video) => video.breakoutScore) -
    getAverage(olderVideos, (video) => video.breakoutScore);
  const viewsPerHourDelta =
    getAverage(recentVideos, (video) => video.viewsPerHour) -
    getAverage(olderVideos, (video) => video.viewsPerHour);
  const engagementDelta =
    getAverage(recentVideos, (video) => video.engagementRate) -
    getAverage(olderVideos, (video) => video.engagementRate);

  const momentumScore =
    (breakoutDelta > 0 ? 1 : breakoutDelta < 0 ? -1 : 0) +
    (viewsPerHourDelta > 0 ? 2 : viewsPerHourDelta < 0 ? -2 : 0) +
    (engagementDelta > 0 ? 1 : engagementDelta < 0 ? -1 : 0);

  return {
    breakoutDelta: Math.round(breakoutDelta),
    viewsPerHourDelta: Math.round(viewsPerHourDelta),
    engagementDelta: Number(engagementDelta.toFixed(3)),
    momentumLabel:
      momentumScore >= 2 ? "Accelerating" : momentumScore <= -2 ? "Cooling" : "Stable",
  };
}

export function aggregateCreatorStats(videos: Video[]): CreatorAnalytics {
  const { percentageBase, qualifiedVideoScoreMinimum } =
    INTELLIGENCE_THRESHOLDS.consistency;

  if (videos.length === 0) {
    return {
      totalVideos: 0,
      avgViews: 0,
      avgLikes: 0,
      avgComments: 0,
      avgBreakoutScore: 0,
      breakoutRate: 0,
      avgViewsPerHour: 0,
      avgEngagementRate: 0,
      topPerformer: null,
      totalRecentViews: 0,
      topVideoTitle: "No recent videos",
      topVideoBreakoutScore: 0,
      consistencyScore: 0,
    };
  }

  const aggregatedVideos = videos.map((video) => {
    const enrichedVideo = enrichVideoMetrics(video);

    return {
      ...enrichedVideo,
      safeViewCount: getSafeNumber(enrichedVideo.viewCount),
      safeLikeCount: getSafeNumber(enrichedVideo.likeCount),
      safeCommentCount: getSafeNumber(enrichedVideo.commentCount),
      viewsPerHour: enrichedVideo.viewsPerHour,
    };
  });

  const totalViews = aggregatedVideos.reduce((sum, video) => {
    return sum + video.safeViewCount;
  }, 0);
  const totalLikes = aggregatedVideos.reduce((sum, video) => {
    return sum + video.safeLikeCount;
  }, 0);
  const totalComments = aggregatedVideos.reduce((sum, video) => {
    return sum + video.safeCommentCount;
  }, 0);
  const totalBreakoutScore = aggregatedVideos.reduce((sum, video) => {
    return sum + video.breakoutScore;
  }, 0);
  const totalViewsPerHour = aggregatedVideos.reduce((sum, video) => {
    return sum + video.viewsPerHour;
  }, 0);
  const totalEngagementRate = aggregatedVideos.reduce((sum, video) => {
    return sum + video.engagementRate;
  }, 0);
  const breakoutVideos = aggregatedVideos.filter((video) => {
    return video.breakoutScore >= qualifiedVideoScoreMinimum;
  }).length;
  const topPerformer = aggregatedVideos.reduce((currentTopVideo, video) => {
    return video.breakoutScore > currentTopVideo.breakoutScore
      ? video
      : currentTopVideo;
  }, aggregatedVideos[0]);
  const breakoutRate = Math.round(
    (breakoutVideos / aggregatedVideos.length) * percentageBase
  );

  return {
    totalVideos: aggregatedVideos.length,
    avgViews: Math.round(totalViews / aggregatedVideos.length),
    avgLikes: Math.round(totalLikes / aggregatedVideos.length),
    avgComments: Math.round(totalComments / aggregatedVideos.length),
    avgBreakoutScore: Math.round(totalBreakoutScore / aggregatedVideos.length),
    breakoutRate,
    avgViewsPerHour: Math.round(totalViewsPerHour / aggregatedVideos.length),
    avgEngagementRate: totalEngagementRate / aggregatedVideos.length,
    topPerformer,
    totalRecentViews: totalViews,
    topVideoTitle: topPerformer.title || "Untitled video",
    topVideoBreakoutScore: topPerformer.breakoutScore,
    consistencyScore: breakoutRate,
  };
}

export function getCreatorVideoSummary(videos: Video[]): CreatorVideoSummary {
  const creatorAnalytics = aggregateCreatorStats(videos);

  return {
    totalRecentViews: creatorAnalytics.totalRecentViews,
    averageBreakoutScore: creatorAnalytics.avgBreakoutScore,
    topVideoTitle: creatorAnalytics.topVideoTitle,
    topVideoBreakoutScore: creatorAnalytics.topVideoBreakoutScore,
    consistencyScore: creatorAnalytics.consistencyScore,
  };
}

export function sortVideosByPerformance(videos: Video[]) {
  return [...videos].sort((leftVideo, rightVideo) => {
    const leftBreakoutScore = getSafeNumber(leftVideo.breakoutScore);
    const rightBreakoutScore = getSafeNumber(rightVideo.breakoutScore);

    if (rightBreakoutScore !== leftBreakoutScore) {
      return rightBreakoutScore - leftBreakoutScore;
    }

    return getSafeNumber(rightVideo.viewCount) - getSafeNumber(leftVideo.viewCount);
  });
}

export function matchesVideoFilter(video: Video, filter: VideoFilter) {
  const breakoutScore = getSafeNumber(video.breakoutScore);
  const breakoutReason = getBreakoutReason(video);
  const { topBreakoutFilterMinimum } = INTELLIGENCE_THRESHOLDS.breakout;

  if (filter === "Top Breakouts") {
    return breakoutScore >= topBreakoutFilterMinimum;
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

export function getPatternSnapshot(videos: Video[]): PatternSnapshot {
  if (videos.length === 0) {
    return {
      visibleVideos: 0,
      averageViews: 0,
      averageBreakoutScore: 0,
      mostCommonReason: "No visible pattern",
    };
  }

  const totalViews = videos.reduce((sum, video) => {
    return sum + getSafeNumber(video.viewCount);
  }, 0);

  const totalBreakoutScore = videos.reduce((sum, video) => {
    return sum + getSafeNumber(video.breakoutScore);
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

export function getCreatorDiversificationSummary(
  videos: Video[]
): CreatorDiversificationSummary {
  const { smallSampleMaximumVideos } = INTELLIGENCE_THRESHOLDS.analysis;

  if (videos.length === 0) {
    return {
      level: "Low",
      activeCreators: 0,
      creatorShareLeader: "No active creator",
      leaderSharePercent: 0,
      summary: "No visible creator mix is available yet, so diversification cannot be assessed.",
    };
  }

  const creatorCounts = videos.reduce<Record<string, number>>((counts, video) => {
    const creatorName = video.channelTitle?.trim() || "Unknown creator";
    counts[creatorName] = (counts[creatorName] ?? 0) + 1;
    return counts;
  }, {});

  const rankedCreators = Object.entries(creatorCounts).sort(
    (leftEntry, rightEntry) => rightEntry[1] - leftEntry[1]
  );
  const leaderEntry = rankedCreators[0] ?? ["Unknown creator", videos.length];
  const activeCreators = rankedCreators.length;
  const leaderSharePercent = Math.round((leaderEntry[1] / videos.length) * 100);

  if (videos.length <= smallSampleMaximumVideos) {
    return {
      level: "Low",
      activeCreators,
      creatorShareLeader: leaderEntry[0],
      leaderSharePercent,
      summary:
        "The visible set is still small, so any diversification read should be treated as directional only.",
    };
  }

  if (activeCreators >= 4 && leaderSharePercent <= 35) {
    return {
      level: "High",
      activeCreators,
      creatorShareLeader: leaderEntry[0],
      leaderSharePercent,
      summary:
        "The current opportunity set is broadly spread across creators, which makes the read more balanced.",
    };
  }

  if (activeCreators >= 2 && leaderSharePercent <= 55) {
    return {
      level: "Medium",
      activeCreators,
      creatorShareLeader: leaderEntry[0],
      leaderSharePercent,
      summary: `${leaderEntry[0]} leads the current set, but the opportunity mix still has multiple active contributors.`,
    };
  }

  return {
    level: "Low",
    activeCreators,
    creatorShareLeader: leaderEntry[0],
    leaderSharePercent,
    summary: `${leaderEntry[0]} is supplying most of the visible opportunities, so the current read is fairly concentrated.`,
  };
}

export function getTopSignals(videos: Video[]): TopSignals {
  if (videos.length === 0) {
    return {
      topBreakoutVideo: null,
      fastestVideo: null,
      mostEngagingVideo: null,
      strongestCommentVideo: null,
    };
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);

  const getTopVideo = (
    compare: (leftVideo: TopSignalVideo, rightVideo: TopSignalVideo) => number
  ) => {
    return enrichedVideos.reduce((topVideo, video) => {
      if (!topVideo) {
        return video;
      }

      return compare(video, topVideo) > 0 ? video : topVideo;
    }, null as TopSignalVideo | null);
  };

  return {
    topBreakoutVideo: getTopVideo((leftVideo, rightVideo) => {
      const breakoutDelta = leftVideo.breakoutScore - rightVideo.breakoutScore;

      if (breakoutDelta !== 0) {
        return breakoutDelta;
      }

      return getSafeNumber(leftVideo.viewCount) - getSafeNumber(rightVideo.viewCount);
    }),
    fastestVideo: getTopVideo((leftVideo, rightVideo) => {
      const velocityDelta = leftVideo.viewsPerHour - rightVideo.viewsPerHour;

      if (velocityDelta !== 0) {
        return velocityDelta;
      }

      return leftVideo.breakoutScore - rightVideo.breakoutScore;
    }),
    mostEngagingVideo: getTopVideo((leftVideo, rightVideo) => {
      const engagementDelta = leftVideo.engagementRate - rightVideo.engagementRate;

      if (engagementDelta !== 0) {
        return engagementDelta;
      }

      return getSafeNumber(leftVideo.likeCount) - getSafeNumber(rightVideo.likeCount);
    }),
    strongestCommentVideo: getTopVideo((leftVideo, rightVideo) => {
      const commentDelta =
        getSafeNumber(leftVideo.commentCount) - getSafeNumber(rightVideo.commentCount);

      if (commentDelta !== 0) {
        return commentDelta;
      }

      return leftVideo.commentDensity - rightVideo.commentDensity;
    }),
  };
}

export function getBenchmarkSummary(videos: Video[]): BenchmarkSummary {
  if (videos.length === 0) {
    return {
      medianViews: 0,
      medianBreakoutScore: 0,
      medianViewsPerHour: 0,
      medianEngagementRate: 0,
      highBreakoutThreshold: 0,
      highVelocityThreshold: 0,
      highEngagementThreshold: 0,
    };
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);

  return {
    medianViews: Math.round(
      getPercentile(
        enrichedVideos.map((video) => getSafeNumber(video.viewCount)),
        0.5
      )
    ),
    medianBreakoutScore: Math.round(
      getPercentile(
        enrichedVideos.map((video) => video.breakoutScore),
        0.5
      )
    ),
    medianViewsPerHour: Math.round(
      getPercentile(
        enrichedVideos.map((video) => video.viewsPerHour),
        0.5
      )
    ),
    medianEngagementRate: Number(
      getPercentile(
        enrichedVideos.map((video) => video.engagementRate),
        0.5
      ).toFixed(3)
    ),
    highBreakoutThreshold: Math.round(
      getPercentile(
        enrichedVideos.map((video) => video.breakoutScore),
        0.75
      )
    ),
    highVelocityThreshold: Math.round(
      getPercentile(
        enrichedVideos.map((video) => video.viewsPerHour),
        0.75
      )
    ),
    highEngagementThreshold: Number(
      getPercentile(
        enrichedVideos.map((video) => video.engagementRate),
        0.75
      ).toFixed(3)
    ),
  };
}

export function getCreatorBenchmarkStatus(
  creatorAnalytics: CreatorAnalytics,
  benchmarkSummary: BenchmarkSummary
): CreatorBenchmarkStatus {
  return {
    breakoutStatus: getBenchmarkLevel(
      creatorAnalytics.avgBreakoutScore,
      benchmarkSummary.medianBreakoutScore,
      benchmarkSummary.highBreakoutThreshold
    ),
    velocityStatus: getBenchmarkLevel(
      creatorAnalytics.avgViewsPerHour,
      benchmarkSummary.medianViewsPerHour,
      benchmarkSummary.highVelocityThreshold
    ),
    engagementStatus: getBenchmarkLevel(
      creatorAnalytics.avgEngagementRate,
      benchmarkSummary.medianEngagementRate,
      benchmarkSummary.highEngagementThreshold
    ),
  };
}

export function getCreatorComparison(
  leftCreatorAnalytics: CreatorAnalytics,
  rightCreatorAnalytics: CreatorAnalytics
): CreatorComparison {
  return {
    avgBreakoutScore: compareMetric(
      leftCreatorAnalytics.avgBreakoutScore,
      rightCreatorAnalytics.avgBreakoutScore
    ),
    breakoutRate: compareMetric(
      leftCreatorAnalytics.breakoutRate,
      rightCreatorAnalytics.breakoutRate
    ),
    avgViewsPerHour: compareMetric(
      leftCreatorAnalytics.avgViewsPerHour,
      rightCreatorAnalytics.avgViewsPerHour
    ),
    avgEngagementRate: compareMetric(
      leftCreatorAnalytics.avgEngagementRate,
      rightCreatorAnalytics.avgEngagementRate
    ),
    totalRecentViews: compareMetric(
      leftCreatorAnalytics.totalRecentViews,
      rightCreatorAnalytics.totalRecentViews
    ),
    topVideoBreakoutScore: compareMetric(
      leftCreatorAnalytics.topVideoBreakoutScore,
      rightCreatorAnalytics.topVideoBreakoutScore
    ),
  };
}

export function getContentOpportunities(
  videos: Video[],
  benchmarkSummary: BenchmarkSummary
) {
  const {
    engagementDominanceShareMinimum,
    maxInsightItems,
    recentMomentumShareMinimum,
    smallSampleMaximumVideos,
    topTierConcentrationShareMinimum,
  } = INTELLIGENCE_THRESHOLDS.analysis;
  const { topTierScoreMinimum } = INTELLIGENCE_THRESHOLDS.breakout;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length <= smallSampleMaximumVideos) {
    return [
      "Collect a few more visible videos before locking in a content pattern.",
      "Use the current filter to widen the sample, then look for repeat winners.",
      "Once the visible set grows, this panel will suggest clearer next-bet content angles.",
    ];
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);
  const recentVideos = enrichedVideos.filter((video) => {
    const publishedTime = new Date(video.publishedAt).getTime();
    const ageInDays = Math.max(
      0,
      (Date.now() - publishedTime) /
        (millisecondsPerSecond *
          INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
          INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
          INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
    );

    return ageInDays <= recentWindowDays;
  });
  const highEngagementVideos = enrichedVideos.filter((video) => {
    return video.engagementRate >= benchmarkSummary.highEngagementThreshold;
  });
  const highVelocityVideos = enrichedVideos.filter((video) => {
    return video.viewsPerHour >= benchmarkSummary.highVelocityThreshold;
  });
  const topTierVideos = enrichedVideos.filter((video) => {
    return video.breakoutScore >= Math.max(
      topTierScoreMinimum,
      benchmarkSummary.highBreakoutThreshold
    );
  });
  const commentDrivenVideos = enrichedVideos.filter((video) => {
    return video.commentDensity > 0 && video.commentDensity >= video.engagementRate * 0.35;
  });

  const opportunities: string[] = [];

  if (recentVideos.length / enrichedVideos.length >= recentMomentumShareMinimum) {
    opportunities.push(
      "Create around fresh timely angles now, because recent uploads are driving most of the visible momentum."
    );
  }

  if (highEngagementVideos.length / enrichedVideos.length >= engagementDominanceShareMinimum) {
    opportunities.push(
      "Prioritize formats that invite response, because engagement is outperforming raw reach in the current set."
    );
  } else if (commentDrivenVideos.length / enrichedVideos.length >= 0.33) {
    opportunities.push(
      "Lean into opinionated prompts or strong POV hooks, because comment-heavy videos are beating passive consumption."
    );
  }

  if (highVelocityVideos.length / enrichedVideos.length >= 0.4) {
    opportunities.push(
      "Front-load the payoff in the first few seconds, because view velocity is the main winning trait right now."
    );
  }

  if (topTierVideos.length / enrichedVideos.length >= topTierConcentrationShareMinimum) {
    opportunities.push(
      `Aim above a breakout score of ${benchmarkSummary.highBreakoutThreshold}, because the strongest winners are clustering in that upper performance band.`
    );
  }

  if (opportunities.length === 0) {
    opportunities.push(
      "Build the next piece around the current median winner, then add a sharper hook or angle to push past the pack."
    );
    opportunities.push(
      "Use the benchmark summary as your floor, especially on views per hour and breakout score."
    );
    opportunities.push(
      "Test one tighter, more opinionated concept next to see if it can break out above the visible median."
    );
  }

  return opportunities.slice(0, maxInsightItems);
}

export function getWatchlistCandidates(
  videos: Video[],
  benchmarkSummary: BenchmarkSummary
): WatchlistCandidate[] {
  const { smallSampleMaximumVideos } = INTELLIGENCE_THRESHOLDS.analysis;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length <= smallSampleMaximumVideos) {
    return [];
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);
  const medianBreakoutFloor = Math.max(0, benchmarkSummary.medianBreakoutScore * 0.85);
  const nearTopBreakoutCeiling = Math.max(
    benchmarkSummary.highBreakoutThreshold,
    benchmarkSummary.medianBreakoutScore + 1
  );

  const scoredCandidates = enrichedVideos
    .map((video) => {
      const publishedTime = new Date(video.publishedAt).getTime();
      const ageInDays = Math.max(
        0,
        (Date.now() - publishedTime) /
          (millisecondsPerSecond *
            INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
            INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
            INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
      );
      const isRecent = ageInDays <= recentWindowDays;
      const aboveMedianVelocity = video.viewsPerHour >= benchmarkSummary.medianViewsPerHour;
      const nearMedianBreakout = video.breakoutScore >= medianBreakoutFloor;
      const strongEngagement =
        video.engagementRate >= benchmarkSummary.medianEngagementRate ||
        video.commentDensity >= benchmarkSummary.medianEngagementRate * 0.4;
      const isObviousWinner =
        video.breakoutScore >= benchmarkSummary.highBreakoutThreshold &&
        video.viewsPerHour >= benchmarkSummary.highVelocityThreshold;

      const candidateScore =
        (aboveMedianVelocity ? 3 : 0) +
        (nearMedianBreakout ? 2 : 0) +
        (strongEngagement ? 2 : 0) +
        (isRecent ? 2 : 0) +
        (video.engagementRate >= benchmarkSummary.highEngagementThreshold ? 1 : 0);

      let watchlistReason = "Early traction is building faster than the current median.";

      if (aboveMedianVelocity && strongEngagement) {
        watchlistReason =
          "Above-median velocity and engagement suggest this could break out next.";
      } else if (aboveMedianVelocity && isRecent) {
        watchlistReason =
          "Fresh upload with fast early velocity makes this worth watching closely.";
      } else if (strongEngagement) {
        watchlistReason =
          "Audience response is strong even before this has become a top breakout.";
      } else if (nearMedianBreakout) {
        watchlistReason =
          "Already near the current breakout median with room to push higher.";
      }

      return {
        id: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        breakoutScore: video.breakoutScore,
        viewsPerHour: video.viewsPerHour,
        watchlistReason,
        candidateScore,
        isObviousWinner,
        withinEmergingBand: video.breakoutScore < nearTopBreakoutCeiling,
        qualifies: aboveMedianVelocity && (nearMedianBreakout || strongEngagement) && isRecent,
      };
    })
    .filter((video) => video.qualifies && !video.isObviousWinner && video.withinEmergingBand)
    .sort((leftVideo, rightVideo) => {
      if (rightVideo.candidateScore !== leftVideo.candidateScore) {
        return rightVideo.candidateScore - leftVideo.candidateScore;
      }

      if (rightVideo.viewsPerHour !== leftVideo.viewsPerHour) {
        return rightVideo.viewsPerHour - leftVideo.viewsPerHour;
      }

      return rightVideo.breakoutScore - leftVideo.breakoutScore;
    })
    .slice(0, 5);

  return scoredCandidates.map((video) => {
    return {
      id: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      breakoutScore: video.breakoutScore,
      viewsPerHour: Math.round(video.viewsPerHour),
      watchlistReason: video.watchlistReason,
    };
  });
}

export function getScenarioViewData(
  videos: Video[],
  benchmarkSummary: BenchmarkSummary,
  scenarioMode: ScenarioMode
): ScenarioViewData {
  const enrichedVideos = videos.map(enrichVideoMetrics);
  const watchlistIds = new Set(
    getWatchlistCandidates(videos, benchmarkSummary).map((video) => video.id)
  );

  const orderedVideos = [...enrichedVideos].sort((leftVideo, rightVideo) => {
    if (scenarioMode === "Breakout Hunt") {
      if (rightVideo.breakoutScore !== leftVideo.breakoutScore) {
        return rightVideo.breakoutScore - leftVideo.breakoutScore;
      }

      return rightVideo.viewsPerHour - leftVideo.viewsPerHour;
    }

    if (scenarioMode === "Engagement Hunt") {
      if (rightVideo.engagementRate !== leftVideo.engagementRate) {
        return rightVideo.engagementRate - leftVideo.engagementRate;
      }

      if (rightVideo.commentDensity !== leftVideo.commentDensity) {
        return rightVideo.commentDensity - leftVideo.commentDensity;
      }

      return rightVideo.breakoutScore - leftVideo.breakoutScore;
    }

    if (scenarioMode === "Emerging Watchlist") {
      const leftIsWatchlist = watchlistIds.has(leftVideo.id) ? 1 : 0;
      const rightIsWatchlist = watchlistIds.has(rightVideo.id) ? 1 : 0;

      if (rightIsWatchlist !== leftIsWatchlist) {
        return rightIsWatchlist - leftIsWatchlist;
      }

      if (rightVideo.viewsPerHour !== leftVideo.viewsPerHour) {
        return rightVideo.viewsPerHour - leftVideo.viewsPerHour;
      }

      return rightVideo.breakoutScore - leftVideo.breakoutScore;
    }

    if (rightVideo.breakoutScore !== leftVideo.breakoutScore) {
      return rightVideo.breakoutScore - leftVideo.breakoutScore;
    }

    return getSafeNumber(rightVideo.viewCount) - getSafeNumber(leftVideo.viewCount);
  });

  return {
    visibleVideos: orderedVideos.map((video) => {
      return {
        ...video,
        breakoutScore: video.breakoutScore,
        breakoutReason: video.breakoutReason,
      };
    }),
    emphasizeTopSignals: scenarioMode === "Breakout Hunt",
    emphasizeEngagement: scenarioMode === "Engagement Hunt",
    emphasizeWatchlist: scenarioMode === "Emerging Watchlist",
  };
}

export function getExecutiveSummary(
  videos: Video[],
  benchmarkSummary: BenchmarkSummary,
  scenarioMode: ScenarioMode
): ExecutiveSummary {
  const {
    engagementDominanceShareMinimum,
    recentMomentumShareMinimum,
    smallSampleMaximumVideos,
    topTierConcentrationShareMinimum,
  } = INTELLIGENCE_THRESHOLDS.analysis;
  const { topTierScoreMinimum } = INTELLIGENCE_THRESHOLDS.breakout;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length <= smallSampleMaximumVideos) {
    return {
      headline: "Signal is still forming",
      subheadline:
        "There are not enough visible videos yet to call the market confidently.",
      dominantSignal: "Limited sample",
      marketState: "Early read",
    };
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);
  const recentVideos = enrichedVideos.filter((video) => {
    const publishedTime = new Date(video.publishedAt).getTime();
    const ageInDays = Math.max(
      0,
      (Date.now() - publishedTime) /
        (millisecondsPerSecond *
          INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
          INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
          INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
    );

    return ageInDays <= recentWindowDays;
  });
  const highEngagementVideos = enrichedVideos.filter((video) => {
    return video.engagementRate >= benchmarkSummary.highEngagementThreshold;
  });
  const fastVideos = enrichedVideos.filter((video) => {
    return video.viewsPerHour >= benchmarkSummary.highVelocityThreshold;
  });
  const topTierVideos = enrichedVideos.filter((video) => {
    return video.breakoutScore >= Math.max(
      topTierScoreMinimum,
      benchmarkSummary.highBreakoutThreshold
    );
  });
  const watchlistCandidates = getWatchlistCandidates(videos, benchmarkSummary);

  let headline = "Market looks balanced";
  let subheadline =
    "The current visible set is mixed, with no single performance trait dominating.";
  let dominantSignal = "Balanced signal";
  let marketState = "Mixed market";

  if (scenarioMode === "Engagement Hunt") {
    headline = "Engagement is driving the edge";
    subheadline =
      "Response quality is doing more work than raw reach in the current filtered set.";
    dominantSignal = "Engagement-led";
    marketState = "Interactive market";
  } else if (scenarioMode === "Emerging Watchlist" && watchlistCandidates.length > 0) {
    headline = "Emerging watchlist is active";
    subheadline =
      "Several rising videos are showing early velocity before becoming obvious winners.";
    dominantSignal = "Early momentum";
    marketState = "Pre-breakout window";
  } else if (topTierVideos.length / enrichedVideos.length >= topTierConcentrationShareMinimum) {
    headline = "Breakout winners are concentrated";
    subheadline =
      "A tight upper band is controlling the strongest outcomes in the visible set.";
    dominantSignal = "Breakout concentration";
    marketState = "Leader-driven";
  } else if (recentVideos.length / enrichedVideos.length >= recentMomentumShareMinimum) {
    headline = "Momentum is freshness-driven";
    subheadline =
      "Recent uploads are setting the pace, so timing and topicality matter right now.";
    dominantSignal = "Freshness";
    marketState = "Fast-moving market";
  } else if (highEngagementVideos.length / enrichedVideos.length >= engagementDominanceShareMinimum) {
    headline = "Engagement is outperforming reach";
    subheadline =
      "Videos with stronger audience response are outrunning broader but shallower reach.";
    dominantSignal = "Engagement strength";
    marketState = "Response-led";
  } else if (fastVideos.length / enrichedVideos.length >= 0.4) {
    headline = "Velocity is shaping the winners";
    subheadline =
      "Fast-rising videos are setting the tone more than steady accumulation.";
    dominantSignal = "Velocity";
    marketState = "Momentum market";
  }

  return {
    headline,
    subheadline,
    dominantSignal,
    marketState,
  };
}

export function getInsightConfidence(videos: Video[]): InsightConfidence {
  const {
    dominantCreatorMultiplier,
    recentMomentumShareMinimum,
    smallSampleMaximumVideos,
  } = INTELLIGENCE_THRESHOLDS.analysis;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length <= smallSampleMaximumVideos) {
    return {
      level: "Low",
      score: 28,
      reason: "Too few visible videos to trust the broader pattern yet.",
    };
  }

  const enrichedVideos = videos.map(enrichVideoMetrics);
  const uniqueCreators = new Set(
    enrichedVideos
      .map((video) => video.channelTitle?.trim())
      .filter((channelTitle): channelTitle is string => Boolean(channelTitle))
  );
  const creatorCount = Math.max(1, uniqueCreators.size);
  const recentVideos = enrichedVideos.filter((video) => {
    const publishedTime = new Date(video.publishedAt).getTime();
    const ageInDays = Math.max(
      0,
      (Date.now() - publishedTime) /
        (millisecondsPerSecond *
          INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
          INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
          INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
    );

    return ageInDays <= recentWindowDays;
  });
  const creatorVideoCounts = enrichedVideos.reduce<Record<string, number>>(
    (counts, video) => {
      const creatorKey = video.channelTitle?.trim() || "Unknown creator";
      counts[creatorKey] = (counts[creatorKey] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const orderedCreatorCounts = Object.values(creatorVideoCounts).sort(
    (leftValue, rightValue) => rightValue - leftValue
  );
  const topCreatorShare =
    (orderedCreatorCounts[0] ?? 0) / Math.max(1, enrichedVideos.length);
  const topTwoShare =
    ((orderedCreatorCounts[0] ?? 0) + (orderedCreatorCounts[1] ?? 0)) /
    Math.max(1, enrichedVideos.length);
  const recentShare = recentVideos.length / enrichedVideos.length;

  let score = 52;

  score += Math.min(20, (enrichedVideos.length - smallSampleMaximumVideos) * 3);
  score += Math.min(15, Math.max(0, creatorCount - 1) * 5);
  score += recentShare >= recentMomentumShareMinimum ? 10 : 4;
  score -= topCreatorShare >= dominantCreatorMultiplier ? 16 : 0;
  score -= topTwoShare >= 0.8 ? 12 : 0;

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  if (normalizedScore >= 75) {
    return {
      level: "High",
      score: normalizedScore,
      reason: "The visible set is broad enough and not overly concentrated in just a few videos.",
    };
  }

  if (normalizedScore >= 50) {
    return {
      level: "Medium",
      score: normalizedScore,
      reason:
        creatorCount <= 1
          ? "The read is useful, but it leans on a narrow creator mix."
          : "The pattern looks directionally useful, but the current set is still somewhat concentrated.",
    };
  }

  return {
    level: "Low",
    score: normalizedScore,
    reason:
      topCreatorShare >= dominantCreatorMultiplier || topTwoShare >= 0.8
        ? "A small number of videos are dominating the visible set, so confidence is limited."
        : "The current signal mix is still too thin to treat as a strong market read.",
  };
}

export function getOutlierAlerts(
  videos: Video[],
  creators: Creator[],
  breakoutPosts: Record<number, Video[]>,
  videoFilter: VideoFilter
): OutlierAlert[] {
  const {
    dominantCreatorMultiplier,
    maxInsightItems,
    smallSampleMaximumVideos,
  } = INTELLIGENCE_THRESHOLDS.analysis;

  if (videos.length === 0) {
    return [];
  }

  const alerts: OutlierAlert[] = [];
  const totalVisibleViews = videos.reduce((sum, video) => {
    return sum + getSafeNumber(video.viewCount);
  }, 0);
  const topVideo = sortVideosByPerformance(videos)[0] ?? null;
  const topVideoShare =
    topVideo && totalVisibleViews > 0
      ? getSafeNumber(topVideo.viewCount) / totalVisibleViews
      : 0;

  if (topVideo && topVideoShare >= 0.45) {
    alerts.push({
      level: topVideoShare >= 0.6 ? "warning" : "info",
      title: "Single video dominance",
      message: `"${topVideo.title || "Untitled video"}" is driving ${Math.round(
        topVideoShare * 100
      )}% of visible views, so the current read may be skewed by one breakout.`,
    });
  }

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
      const analytics = aggregateCreatorStats(creatorVideos);

      return {
        creatorName: creator.name,
        averageBreakoutScore: analytics.avgBreakoutScore,
        visibleVideos: creatorVideos.length,
      };
    })
    .filter((creator) => creator.visibleVideos > 0)
    .sort((leftCreator, rightCreator) => {
      return rightCreator.averageBreakoutScore - leftCreator.averageBreakoutScore;
    });

  const topCreator = creatorAverages[0];
  const secondCreator = creatorAverages[1];

  if (
    topCreator &&
    topCreator.visibleVideos >= 2 &&
    (!secondCreator ||
      topCreator.averageBreakoutScore >=
        secondCreator.averageBreakoutScore * dominantCreatorMultiplier)
  ) {
    alerts.push({
      level: secondCreator ? "warning" : "info",
      title: "Creator concentration",
      message: secondCreator
        ? `${topCreator.creatorName} is materially ahead on average breakout score, which is concentrating the current read.`
        : `${topCreator.creatorName} is carrying the current view almost alone, so cross-creator comparisons are limited.`,
    });
  }

  if (videos.length <= smallSampleMaximumVideos || videos.length <= 3) {
    alerts.push({
      level: "info",
      title: "Narrow visible set",
      message:
        "The current filter is showing a very small slice of videos, so treat the pattern as directional rather than definitive.",
    });
  } else {
    const topTwoVisibleShare =
      sortVideosByPerformance(videos)
        .slice(0, 2)
        .reduce((sum, video) => sum + getSafeNumber(video.viewCount), 0) /
      Math.max(1, totalVisibleViews);

    if (topTwoVisibleShare >= 0.7) {
      alerts.push({
        level: "warning",
        title: "Top-heavy view",
        message: `The top 2 visible videos account for ${Math.round(
          topTwoVisibleShare * 100
        )}% of visible views, so the market read is unusually concentrated.`,
      });
    }
  }

  return alerts.slice(0, maxInsightItems);
}

export function getAnalystTakeaways(
  videos: Video[],
  creators: Creator[],
  breakoutPosts: Record<number, Video[]>,
  videoFilter: VideoFilter
) {
  const {
    commentsSignalShareMinimum,
    dominantCreatorMultiplier,
    engagementDominanceShareMinimum,
    maxInsightItems,
    recentMomentumShareMinimum,
    smallSampleMaximumVideos,
  } = INTELLIGENCE_THRESHOLDS.analysis;
  const { strongCommentsMinimum } = INTELLIGENCE_THRESHOLDS.engagement;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length <= smallSampleMaximumVideos) {
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
      (Date.now() - publishedTime) /
        (millisecondsPerSecond *
          INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
          INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
          INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
    );

    return ageInDays <= recentWindowDays;
  });
  const highEngagementVideos = videos.filter((video) => {
    const reason = getBreakoutReason(video);
    return reason === "High engagement" || reason === "Strong comments";
  });
  const commentHeavyVideos = videos.filter((video) => {
    return getSafeNumber(video.commentCount) >= strongCommentsMinimum;
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

  if (recentVideos.length / totalVideos >= recentMomentumShareMinimum) {
    takeaways.push(
      "Breakout momentum in the current set is being driven heavily by recent uploads."
    );
  } else {
    takeaways.push(
      "Older videos are still contributing meaningfully, so the current winners are not purely freshness-driven."
    );
  }

  if (highEngagementVideos.length / totalVideos >= engagementDominanceShareMinimum) {
    takeaways.push(
      "High engagement is outperforming raw view count in the current filtered set."
    );
  } else if (commentHeavyVideos.length / totalVideos >= commentsSignalShareMinimum) {
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
      topCreator.averageBreakoutScore >=
        secondCreator.averageBreakoutScore * dominantCreatorMultiplier)
  ) {
    takeaways.push(
      `${topCreator.name} is clearly leading the current set on average breakout score.`
    );
  } else {
    takeaways.push(
      "Performance is relatively distributed, with no single creator dominating the visible set."
    );
  }

  return takeaways.slice(0, maxInsightItems);
}

export function getWinningPatterns(
  videos: Video[],
  creators: Creator[],
  breakoutPosts: Record<number, Video[]>,
  videoFilter: VideoFilter
) {
  const {
    commentsSignalShareMinimum,
    creatorClusterStrongVideosMinimum,
    engagementDominanceShareMinimum,
    maxInsightItems,
    recentMomentumShareMinimum,
    topTierConcentrationShareMinimum,
  } = INTELLIGENCE_THRESHOLDS.analysis;
  const { topTierScoreMinimum } = INTELLIGENCE_THRESHOLDS.breakout;
  const { strongCommentsMinimum } = INTELLIGENCE_THRESHOLDS.engagement;
  const { millisecondsPerSecond, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;

  if (videos.length === 0) {
    return [
      "No visible videos are available, so there is not enough signal to identify a winning pattern yet.",
      "Try switching filters or broadening the current view to surface more comparable videos.",
      "Once more videos are visible, this section will summarize the repeated traits among the strongest performers.",
    ];
  }

  const strongVideos = videos.filter(
    (video) => getSafeNumber(video.breakoutScore) >= topTierScoreMinimum
  );

  const recentVideos = videos.filter((video) => {
    const publishedTime = video.publishedAt
      ? new Date(video.publishedAt).getTime()
      : Date.now();
    const ageInDays = Math.max(
      0,
      (Date.now() - publishedTime) /
        (millisecondsPerSecond *
          INTELLIGENCE_THRESHOLDS.time.secondsPerMinute *
          INTELLIGENCE_THRESHOLDS.time.minutesPerHour *
          INTELLIGENCE_THRESHOLDS.time.hoursPerDay)
    );

    return ageInDays <= recentWindowDays;
  });

  const highEngagementVideos = videos.filter((video) => {
    const reason = getBreakoutReason(video);
    return reason === "High engagement" || reason === "Strong comments";
  });

  const commentHeavyVideos = videos.filter(
    (video) => getSafeNumber(video.commentCount) >= strongCommentsMinimum
  );

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
          return getSafeNumber(video.breakoutScore) >= topTierScoreMinimum;
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

  if (recentVideos.length / videos.length >= recentMomentumShareMinimum) {
    patterns.push(
      "Recent videos are dominating the visible set, so momentum is clustering around newer uploads."
    );
  } else {
    patterns.push(
      "Winning videos are not purely recent, which suggests durable topics are still carrying breakout potential."
    );
  }

  if (highEngagementVideos.length / videos.length >= engagementDominanceShareMinimum) {
    patterns.push(
      "High-engagement videos are overrepresented, so audience response is showing up as a repeat winning trait."
    );
  } else if (commentHeavyVideos.length / videos.length >= commentsSignalShareMinimum) {
    patterns.push(
      "Comment-heavy videos appear frequently, making discussion intensity a strong repeated signal."
    );
  } else {
    patterns.push(
      "The strongest visible videos lean more on broad reach than unusually high engagement density."
    );
  }

  if (strongVideos.length / videos.length >= topTierConcentrationShareMinimum) {
    patterns.push(
      "The visible winners are concentrated in the highest breakout tier, not just the middle of the pack."
    );
  } else if (
    topCreator &&
    topCreator.strongVideos >= creatorClusterStrongVideosMinimum
  ) {
    patterns.push(
      `${topCreator.creatorName} is clustering a meaningful share of the strongest visible videos.`
    );
  } else {
    patterns.push(
      "Top performance is relatively distributed, without one dominant repeat pattern across the strongest videos."
    );
  }

  return patterns.slice(0, maxInsightItems);
}

export function getCreatorLeaderboardEntry(
  creator: Creator,
  videos: Video[]
): CreatorLeaderboardEntry {
  const creatorAnalytics = aggregateCreatorStats(videos);
  const momentum = getCreatorMomentumDelta(videos);

  return {
    creatorId: creator.id,
    creatorName: creator.name,
    totalRecentViews: creatorAnalytics.totalRecentViews,
    averageBreakoutScore: creatorAnalytics.avgBreakoutScore,
    topVideoBreakoutScore: creatorAnalytics.topVideoBreakoutScore,
    videosAnalyzed: creatorAnalytics.totalVideos,
    consistencyScore: creatorAnalytics.consistencyScore,
    breakoutRate: creatorAnalytics.breakoutRate,
    avgViewsPerHour: creatorAnalytics.avgViewsPerHour,
    avgLikes: creatorAnalytics.avgLikes,
    avgComments: creatorAnalytics.avgComments,
    momentum,
  };
}
