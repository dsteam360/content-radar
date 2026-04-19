import { INTELLIGENCE_THRESHOLDS } from "@/app/lib/config/thresholds";

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
    return 0;
  }

  return Math.max(0, value);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function getAgeInDays(publishedAt?: string, minimumAgeDays = 0) {
  const {
    hoursPerDay,
    millisecondsPerSecond,
    minutesPerHour,
    secondsPerMinute,
  } = INTELLIGENCE_THRESHOLDS.time;
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : Date.now();

  return Math.max(
    Math.max(0, minimumAgeDays),
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
  const { scoreCommentWeight, scoreLikeWeight, scoreVelocityDivisor } =
    INTELLIGENCE_THRESHOLDS.breakout;
  const { minimumVideoAgeDays } = INTELLIGENCE_THRESHOLDS.time;
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const ageInDays = Math.max(1, getAgeInDays(publishedAt, minimumVideoAgeDays));
  const safeVelocityDivisor = Math.max(1, scoreVelocityDivisor);
  const viewVelocity = safeViewCount / ageInDays;
  const rawScore =
    viewVelocity / safeVelocityDivisor +
    safeLikeCount * scoreLikeWeight +
    safeCommentCount * scoreCommentWeight;

  return clampNumber(Math.round(rawScore), 0, 100);
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
    0,
    100
  );
  const safeViewCount = getSafeNonNegativeNumber(viewCount);
  const safeLikeCount = getSafeNonNegativeNumber(likeCount);
  const safeCommentCount = getSafeNonNegativeNumber(commentCount);
  const ageInDays = Math.max(1, getAgeInDays(publishedAt, minimumVideoAgeDays));
  const viewVelocity = safeViewCount / ageInDays;
  const engagementRate =
    safeViewCount > 0
      ? (safeLikeCount + safeCommentCount * commentWeight) / safeViewCount
      : 0;

  if (safeCommentCount >= strongCommentsMinimum) {
    return "Strong comments";
  }

  if (
    engagementRate >= highEngagementRateMinimum ||
    safeLikeCount >= highLikesMinimum
  ) {
    return "High engagement";
  }

  if (ageInDays <= recentWindowDays && safeBreakoutScore >= strongScoreMinimum) {
    return "Recent surge";
  }

  if (
    viewVelocity >= fastViewsPerDayMinimum ||
    safeViewCount >= fastViewsTotalMinimum
  ) {
    return "Fast views";
  }

  if (safeBreakoutScore > 0 || safeViewCount > 0 || safeLikeCount > 0 || safeCommentCount > 0) {
    return "Steady traction";
  }

  return "No significant signal";
}
