
import { Redis } from '@upstash/redis'

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  console.log('Testing Redis with:', url)

  if (!url || !token) {
    console.error('Missing Redis credentials')
    return
  }

  const redis = new Redis({
    url,
    token,
  })

  try {
    const res = await redis.set('test_key', 'hello ' + new Date().toISOString())
    console.log('SET result:', res)
    const val = await redis.get('test_key')
    console.log('GET result:', val)
  } catch (err) {
    console.error('Redis test failed:', err)
  }
}

testRedis()
