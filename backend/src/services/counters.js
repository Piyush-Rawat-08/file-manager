import { Counter } from '../models/Counter.js';

export const today = () => new Date().toISOString().slice(0, 10); // UTC day

/**
 * Atomically adds `amount` to a counter unless that would pass `limit`.
 * Returns true when allowed. The filter only matches while there is room;
 * when it does not match, the upsert hits the unique key and throws E11000.
 */
export async function consume(key, amount, limit) {
  if (amount > limit) return false;
  try {
    await Counter.findOneAndUpdate(
      { key, value: { $lte: limit - amount } },
      { $inc: { value: amount }, $setOnInsert: { expiresAt: new Date(Date.now() + 40 * 24 * 3600 * 1000) } },
      { upsert: true },
    );
    return true;
  } catch (err) {
    if (err?.code === 11000) return false;
    throw err;
  }
}
