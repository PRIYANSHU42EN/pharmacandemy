const DB_NAME = "CubepharmPDFCache";
const STORE_NAME = "pdf_buffers";
const VERSION = 1;
const MAX_AGE_DAYS = 7;

interface CacheEntry {
  url: string;
  buffer: ArrayBuffer;
  timestamp: number;
}

class IndexedDBCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
          reject(new Error("IndexedDB not supported"));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
            store.createIndex("timestamp", "timestamp", { unique: false });
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
          reject((event.target as IDBOpenDBRequest).error);
        };
      });
    }
    return this.dbPromise;
  }

  async get(url: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => {
          const result = request.result as CacheEntry | undefined;
          if (result) {
            // Check if it's older than MAX_AGE_DAYS
            const ageMs = Date.now() - result.timestamp;
            const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
            if (ageMs > maxAgeMs) {
              this.delete(url); // Expire it
              resolve(null);
            } else {
              // Update timestamp to mark as recently used (LRU)
              this.touch(url, result.buffer);
              resolve(result.buffer);
            }
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("[IndexedDBCache] Get failed:", err);
      return null;
    }
  }

  async set(url: string, buffer: ArrayBuffer): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const entry: CacheEntry = {
          url,
          buffer,
          timestamp: Date.now(),
        };

        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("[IndexedDBCache] Set failed:", err);
    }
  }

  // Updates the timestamp without re-saving if not needed, 
  // but for simplicity we just re-save.
  private async touch(url: string, buffer: ArrayBuffer): Promise<void> {
    this.set(url, buffer).catch(() => {});
  }

  async delete(url: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(url);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("[IndexedDBCache] Delete failed:", err);
    }
  }

  // Cleanup old entries (LRU eviction based on timestamp)
  async cleanup(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("timestamp");
        
        const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - maxAgeMs;

        // Iterate over entries older than cutoff
        const range = IDBKeyRange.upperBound(cutoff);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve(); // done
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("[IndexedDBCache] Cleanup failed:", err);
    }
  }
}

export const pdfCache = new IndexedDBCache();
