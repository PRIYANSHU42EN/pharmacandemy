import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTodayStr } from './index';

describe('getTodayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format standard dates correctly (YYYY-MM-DD)', () => {
    const date = new Date(2024, 10, 15); // November 15, 2024 (month is 0-indexed)
    vi.setSystemTime(date);

    expect(getTodayStr()).toBe('2024-11-15');
  });

  it('should pad single-digit months and days with leading zeros', () => {
    const date = new Date(2024, 0, 5); // January 5, 2024
    vi.setSystemTime(date);

    expect(getTodayStr()).toBe('2024-01-05');
  });

  it('should handle end-of-year dates', () => {
    const date = new Date(2023, 11, 31); // December 31, 2023
    vi.setSystemTime(date);

    expect(getTodayStr()).toBe('2023-12-31');
  });

  it('should handle leap year dates', () => {
    const date = new Date(2024, 1, 29); // February 29, 2024
    vi.setSystemTime(date);

    expect(getTodayStr()).toBe('2024-02-29');
  });
});
