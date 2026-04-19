import {
  BREAKOUT_REASON_LABELS,
  INTELLIGENCE_THRESHOLDS,
  MAX_SCORE,
  MIN_DIVISOR,
  MIN_SCORE,
} from "@/app/lib/config/thresholds";

export type ScoredVideoInput = {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  breakoutScore?: number;
  publishedAt?: string;
};

export type ScoredVideoOutput = {
  breakoutScore: number;
  breakoutReason: string;
};

function getSafeNonNegativeNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MIN_SCORE;
  }

  return Math.max(MIN_SCORE, value);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function getAgeInDays(publishedAt?: string, minimumAgeDays = MIN_SCORE) {
  const {
    hoursPerDay,
    millisecondsPerSecond,
    minutesPerHour,
    secondsPerMinute,
  } = INTELLIGENCE_THRESHOLDS.time;
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : Date.now();

  return Math.max(
    Math.max(MIN_SCORE, minimumAgeDays),
    (Date.now() - publishedTime) /
      (millisecondsPerSecond * secondsPerMinute * minutesPerHour * hoursPerDay)
  );
}

export function calculateBreakoutScore({
  commentCount,
  likeCount,
  publishedAt,
  viewCount,
}: ScoredVideoInput) {
  const {
    commentVelocityWeight,
    likeRatioWeight,
    maxScore,
    minViewsBaseline,
    viewGrowthWeight,
  } = INTELLIGENCE_THRESHOLDS.breakout;
  const { minimumVideoAgeDays } = INTELLIGENCE_THRESHOLDS.time;
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const ageInDays = Math.max(MIN_DIVISOR, getAgeInDays(publishedAt, minimumVideoAgeDays));
  const safeViewsBaseline = Math.max(MIN_DIVISOR, minViewsBaseline);
  const viewVelocity = safeViewCount / ageInDays;
  const weightedViewGrowth =
    (viewVelocity / safeViewsBaseline) * viewGrowthWeight;
  const weightedLikeRatio = safeLikeCount * likeRatioWeight;
  const weightedCommentVelocity = safeCommentCount * commentVelocityWeight;
  const rawScore =
    weightedViewGrowth + weightedLikeRatio + weightedCommentVelocity;

  return clampNumber(Math.round(rawScore), MIN_SCORE, Math.min(MAX_SCORE, maxScore));
}

export function getBreakoutReason({
  breakoutScore,
  commentCount,
  likeCount,
  publishedAt,
  viewCount,
}: ScoredVideoInput) {
  const {
    commentWeight,
    fastViewsPerDayMinimum,
    fastViewsTotalMinimum,
    highEngagementRateMinimum,
    highLikesMinimum,
    strongCommentsMinimum,
  } = INTELLIGENCE_THRESHOLDS.engagement;
  const { strongScoreMinimum } = INTELLIGENCE_THRESHOLDS.breakout;
  const { minimumVideoAgeDays, recentWindowDays } = INTELLIGENCE_THRESHOLDS.time;
  const safeBreakoutScore = clampNumber(
    getSafeNonNegativeNumber(breakoutScore),
    MIN_SCORE,
    MAX_SCORE
  );
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const ageInDays = Math.max(MIN_DIVISOR, getAgeInDays(publishedAt, minimumVideoAgeDays));
  const viewVelocity = safeViewCount / ageInDays;
  const engagementRate =
    safeViewCount > MIN_SCORE
      ? (safeLikeCount + safeCommentCount * commentWeight) / safeViewCount
      : MIN_SCORE;

  if (safeCommentCount >= strongCommentsMinimum) {
    return BREAKOUT_REASON_LABELS.strongComments;
  }

  if (
    engagementRate >= highEngagementRateMinimum ||
    safeLikeCount >= highLikesMinimum
  ) {
    return BREAKOUT_REASON_LABELS.highEngagement;
  }

  if (ageInDays <= recentWindowDays && safeBreakoutScore >= strongScoreMinimum) {
    return BREAKOUT_REASON_LABELS.recentSurge;
  }

  if (
    viewVelocity >= fastViewsPerDayMinimum ||
    safeViewCount >= fastViewsTotalMinimum
  ) {
    return BREAKOUT_REASON_LABELS.fastViews;
  }

  if (
    safeBreakoutScore > MIN_SCORE ||
    safeViewCount > MIN_SCORE ||
    safeLikeCount > MIN_SCORE ||
    safeCommentCount > MIN_SCORE
  ) {
    return BREAKOUT_REASON_LABELS.steadyTraction;
  }

  return BREAKOUT_REASON_LABELS.noSignificantSignal;
}
