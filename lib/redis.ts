import { Redis } from "@upstash/redis";

/**
 * Redis client for Upstash.
 * Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in environment variables.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Cache helper to get data from cache or fetch and store it.
 * @param key Redis key
 * @param fetcher Async function to fetch data if cache miss
 * @param ttl Time to live in seconds
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // default 5 mins
): Promise<T> {
  // If Redis is not configured, just fetch and return
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return await fetcher();
  }

  try {
    const redisPromise = redis.get<T>(key);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
    
    const cached = await Promise.race([redisPromise, timeoutPromise]);
    
    if (cached !== null) {
      console.log(`[Redis] HIT: ${key}`);
      return cached;
    } else {
      console.log(`[Redis] MISS/TIMEOUT: ${key}`);
    }
  } catch (err) {
    console.error(`[Redis] Get error for ${key}:`, err);
  }

  console.log(`[Redis] MISS: ${key}`);
  const data = await fetcher();

  try {
    await redis.set(key, data, { ex: ttl });
  } catch (err) {
    console.error(`[Redis] Set error for ${key}:`, err);
  }

  return data;
}

/**
 * Invalidate cache by key pattern or specific key.
 */
export async function invalidateCache(key: string) {
  try {
    await redis.del(key);
    console.log(`[Redis] INVALIDATED: ${key}`);
  } catch (err) {
    console.error(`[Redis] Invalidation error for ${key}:`, err);
  }
}
