import { INTELLIGENCE_THRESHOLDS } from "@/app/lib/config/thresholds";

export type BreakoutScoreInput = {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: string;
};

function getAgeInDays(publishedAt?: string) {
  const { hoursPerDay, millisecondsPerSecond, minimumVideoAgeDays, minutesPerHour, secondsPerMinute } =
    INTELLIGENCE_THRESHOLDS.time;
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : Date.now();

  return Math.max(
    minimumVideoAgeDays,
    (Date.now() - publishedTime) /
      (millisecondsPerSecond * secondsPerMinute * minutesPerHour * hoursPerDay)
  );
}

export function calculateBreakoutScore({
  commentCount,
  likeCount,
  publishedAt,
  viewCount,
}: BreakoutScoreInput) {
  const { scoreCommentWeight, scoreLikeWeight, scoreVelocityDivisor } =
    INTELLIGENCE_THRESHOLDS.breakout;
  const ageInDays = getAgeInDays(publishedAt);
  const viewVelocity = viewCount / ageInDays;

  return Math.round(
    viewVelocity / scoreVelocityDivisor +
      likeCount * scoreLikeWeight +
      commentCount * scoreCommentWeight
  );
}

