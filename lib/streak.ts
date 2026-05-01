/**
 * Streak Calculation Logic
 * 
 * Rules:
 * 1. If first time: streak = 1
 * 2. If last active was yesterday: streak += 1
 * 3. If last active was today: do nothing (already updated)
 * 4. Otherwise (missed day): streak = 1
 */

export interface StreakResult {
  newStreak: number;
  lastActiveDate: string;
  shouldUpdate: boolean;
}

export function calculateStreak(lastActiveDateStr: string | null, currentStreak: number = 0): StreakResult {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 1. First time user
  if (!lastActiveDateStr) {
    return {
      newStreak: 1,
      lastActiveDate: today,
      shouldUpdate: true
    };
  }

  // Normalize last active date to YYYY-MM-DD for comparison
  const lastDate = new Date(lastActiveDateStr);
  const lastDateStr = lastDate.toISOString().split('T')[0];

  // 2. Already active today
  if (lastDateStr === today) {
    return {
      newStreak: Math.max(currentStreak, 1),
      lastActiveDate: today,
      shouldUpdate: false
    };
  }

  // 3. Check if last active was yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDateStr === yesterdayStr) {
    // Yesterday was the last active day -> Increment
    return {
      newStreak: currentStreak + 1,
      lastActiveDate: today,
      shouldUpdate: true
    };
  }

  // 4. Missed a day (or more) -> Reset
  return {
    newStreak: 1,
    lastActiveDate: today,
    shouldUpdate: true
  };
}
