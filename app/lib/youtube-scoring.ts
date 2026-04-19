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
  currentTimestamp?: number;
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

export function getHoursSincePublished(
  publishedAt?: string,
  currentTimestamp = Date.now()
) {
  const {
    millisecondsPerSecond,
    minutesPerHour,
    secondsPerMinute,
  } = INTELLIGENCE_THRESHOLDS.time;
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : currentTimestamp;

  return Math.max(
    MIN_DIVISOR,
    (currentTimestamp - publishedTime) /
      (millisecondsPerSecond * secondsPerMinute * minutesPerHour)
  );
}

function getAgeInDays(
  publishedAt?: string,
  currentTimestamp = Date.now(),
  minimumAgeDays = MIN_SCORE
) {
  const { hoursPerDay } = INTELLIGENCE_THRESHOLDS.time;

  return Math.max(
    Math.max(MIN_SCORE, minimumAgeDays),
    getHoursSincePublished(publishedAt, currentTimestamp) / hoursPerDay
  );
}

export function calculateBreakoutScore({
  commentCount,
  currentTimestamp,
  likeCount,
  publishedAt,
  viewCount,
}: ScoredVideoInput) {
  const {
    commentVelocityWeight,
    freshnessDecayFactor,
    likeRatioWeight,
    maxScore,
    minViewsBaseline,
    velocityWeight,
    viewGrowthWeight,
  } = INTELLIGENCE_THRESHOLDS.breakout;
  const { hoursPerDay, minimumVideoAgeDays } = INTELLIGENCE_THRESHOLDS.time;
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const safeCurrentTimestamp =
    typeof currentTimestamp === "number" && Number.isFinite(currentTimestamp)
      ? currentTimestamp
      : Date.now();
  const ageInDays = Math.max(
    MIN_DIVISOR / hoursPerDay,
    getAgeInDays(publishedAt, safeCurrentTimestamp, minimumVideoAgeDays)
  );
  const hoursSincePublished = getHoursSincePublished(
    publishedAt,
    safeCurrentTimestamp
  );
  const safeViewsBaseline = Math.max(MIN_DIVISOR, minViewsBaseline);
  const safeFreshnessDecayFactor = Math.max(MIN_DIVISOR, freshnessDecayFactor);
  const viewsPerHour = safeViewCount / hoursSincePublished;
  const commentsPerHour = safeCommentCount / hoursSincePublished;
  const likeRatio = safeLikeCount / Math.max(safeViewCount, safeViewsBaseline);
  const freshnessMultiplier =
    safeFreshnessDecayFactor /
    (hoursSincePublished + safeFreshnessDecayFactor);
  const weightedViewGrowth =
    (viewsPerHour / safeViewsBaseline) * viewGrowthWeight;
  const weightedLikeRatio = likeRatio * maxScore * likeRatioWeight;
  const weightedCommentVelocity = commentsPerHour * commentVelocityWeight;
  const weightedVelocityBoost =
    ((viewsPerHour / safeViewsBaseline) + commentsPerHour) *
    velocityWeight *
    freshnessMultiplier;
  const rawScore =
    (weightedViewGrowth +
      weightedLikeRatio +
      weightedCommentVelocity +
      weightedVelocityBoost) *
    freshnessMultiplier;

  return clampNumber(Math.round(rawScore), MIN_SCORE, Math.min(MAX_SCORE, maxScore));
}

export function getBreakoutReason({
  breakoutScore,
  commentCount,
  currentTimestamp,
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
  const {
    hoursPerDay,
    minimumVideoAgeDays,
    recentWindowDays,
  } = INTELLIGENCE_THRESHOLDS.time;
  const { freshnessDecayFactor } = INTELLIGENCE_THRESHOLDS.breakout;
  const safeBreakoutScore = clampNumber(
    getSafeNonNegativeNumber(breakoutScore),
    MIN_SCORE,
    MAX_SCORE
  );
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const safeCurrentTimestamp =
    typeof currentTimestamp === "number" && Number.isFinite(currentTimestamp)
      ? currentTimestamp
      : Date.now();
  const ageInDays = Math.max(
    MIN_DIVISOR / hoursPerDay,
    getAgeInDays(publishedAt, safeCurrentTimestamp, minimumVideoAgeDays)
  );
  const hoursSincePublished = getHoursSincePublished(
    publishedAt,
    safeCurrentTimestamp
  );
  const viewVelocity = safeViewCount / ageInDays;
  const viewsPerHour = safeViewCount / hoursSincePublished;
  const commentsPerHour = safeCommentCount / hoursSincePublished;
  const freshnessMultiplier =
    Math.max(MIN_DIVISOR, freshnessDecayFactor) /
    (hoursSincePublished + Math.max(MIN_DIVISOR, freshnessDecayFactor));
  const engagementRate =
    safeViewCount > MIN_SCORE
      ? (safeLikeCount + safeCommentCount * commentWeight) / safeViewCount
      : MIN_SCORE;
  const fastViewsPerHourMinimum = fastViewsPerDayMinimum / hoursPerDay;
  const strongCommentsPerHourMinimum = strongCommentsMinimum / hoursPerDay;

  if (
    viewsPerHour * freshnessMultiplier >= fastViewsPerHourMinimum &&
    hoursSincePublished <= recentWindowDays * hoursPerDay
  ) {
    return BREAKOUT_REASON_LABELS.rapidEarlyGrowth;
  }

  if (
    engagementRate >= highEngagementRateMinimum &&
    commentsPerHour * freshnessMultiplier >= strongCommentsPerHourMinimum
  ) {
    return BREAKOUT_REASON_LABELS.highVelocityEngagement;
  }

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
