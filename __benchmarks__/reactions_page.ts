import { performance } from "perf_hooks";

// Mock data parameters
const MOCK_ROOMS_COUNT = 2000;
const MOCK_MESSAGES_PER_ROOM = 100;
const ITERATIONS = 20;

console.log(`Setting up benchmark with ${MOCK_ROOMS_COUNT} rooms and ${MOCK_MESSAGES_PER_ROOM} messages per room...`);

const rooms = Array.from({ length: MOCK_ROOMS_COUNT }, (_, i) => ({
  room_id: `room_${i}`,
  metadata: { title: `Room ${i}` },
  context_type: i % 2 === 0 ? "urgent_work" : "general",
}));

const loadedRoomsData: Record<string, any[]> = {};

rooms.forEach((room) => {
  loadedRoomsData[room.room_id] = Array.from({ length: MOCK_MESSAGES_PER_ROOM }, (_, i) => ({
    id: `msg_${room.room_id}_${i}`,
    headers: { senderName: "User " + i },
    reactions: i % 5 === 0 ? {
      unique: { "👍": { total: 1 } }
    } : null,
  }));
});

function benchmarkCurrent() {
  const list: any[] = [];
  const start = performance.now();

  Object.entries(loadedRoomsData).forEach(([roomId, messages]) => {
    const roomInfo = rooms.find(r => r.room_id === roomId);
    if (!roomInfo) return;

    messages.forEach(msg => {
      if (!msg.reactions) return;

      const allReactions = {
        ...(msg.reactions.unique || {}),
        ...(msg.reactions.distinct || {}),
        ...(msg.reactions.multiple || {}),
      };

      const parsedReactions = Object.entries(allReactions)
        .map(([emoji, data]: [string, any]) => ({
          emoji,
          count: data.total || 0
        }))
        .filter(r => r.count > 0);

      if (parsedReactions.length > 0) {
        list.push({
          id: msg.id,
          roomId,
        });
      }
    });
  });

  const end = performance.now();
  return { time: end - start, count: list.length };
}

function benchmarkOptimized() {
  const list: any[] = [];
  const start = performance.now();

  // Optimization: Map of rooms for O(1) lookup
  const roomsMap = new Map();
  for (const room of rooms) {
    roomsMap.set(room.room_id, room);
  }

  Object.entries(loadedRoomsData).forEach(([roomId, messages]) => {
    const roomInfo = roomsMap.get(roomId);
    if (!roomInfo) return;

    messages.forEach(msg => {
      if (!msg.reactions) return;

      const allReactions = {
        ...(msg.reactions.unique || {}),
        ...(msg.reactions.distinct || {}),
        ...(msg.reactions.multiple || {}),
      };

      const parsedReactions = Object.entries(allReactions)
        .map(([emoji, data]: [string, any]) => ({
          emoji,
          count: data.total || 0
        }))
        .filter(r => r.count > 0);

      if (parsedReactions.length > 0) {
        list.push({
          id: msg.id,
          roomId,
        });
      }
    });
  });

  const end = performance.now();
  return { time: end - start, count: list.length };
}

console.log("Warming up...");
benchmarkCurrent();
benchmarkOptimized();

console.log(`Running ${ITERATIONS} iterations...`);
let currentTotal = 0;
let optimizedTotal = 0;

for (let i = 0; i < ITERATIONS; i++) {
  currentTotal += benchmarkCurrent().time;
  optimizedTotal += benchmarkOptimized().time;
}

const currentAvg = currentTotal / ITERATIONS;
const optimizedAvg = optimizedTotal / ITERATIONS;
const improvement = currentAvg / optimizedAvg;

console.log("\n--- BENCHMARK RESULTS ---");
console.log(`Current approach (O(N*M) lookups): ${currentAvg.toFixed(2)}ms`);
console.log(`Optimized approach (Map O(1) lookups): ${optimizedAvg.toFixed(2)}ms`);
console.log(`Improvement: ${(improvement).toFixed(2)}x faster`);
console.log(`Difference: ${(currentAvg - optimizedAvg).toFixed(2)}ms saved per execution`);
