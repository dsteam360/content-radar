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
};

export type VideoFilter =
  | "All"
  | "Top Breakouts"
  | "High Engagement"
  | "Recent Surge";

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
  };
}
