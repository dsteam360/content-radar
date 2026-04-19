import { INTELLIGENCE_THRESHOLDS } from "@/app/lib/config/thresholds";

export type ScoredVideoInput = {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  breakoutScore?: number;
  publishedAt?: string;
};

function getSafeNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
    minimumAgeDays,
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
  const safeViewCount = getSafeNumber(viewCount);
  const safeLikeCount = getSafeNumber(likeCount);
  const safeCommentCount = getSafeNumber(commentCount);
  const ageInDays = getAgeInDays(publishedAt, minimumVideoAgeDays);
  const viewVelocity = safeViewCount / ageInDays;

  return Math.round(
    viewVelocity / scoreVelocityDivisor +
      safeLikeCount * scoreLikeWeight +
      safeCommentCount * scoreCommentWeight
  );
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
  const safeBreakoutScore = getSafeNumber(breakoutScore);
  const safeViewCount = getSafeNumber(viewCount);
  const safeLikeCount = getSafeNumber(likeCount);
  const safeCommentCount = getSafeNumber(commentCount);
  const ageInDays = getAgeInDays(publishedAt, minimumVideoAgeDays);
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

  return "Steady traction";
}
