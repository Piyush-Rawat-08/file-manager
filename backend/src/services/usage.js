import { File } from '../models/File.js';

export async function usageFor(ownerId) {
  const [row] = await File.aggregate([
    { $match: { ownerId } },
    { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } },
  ]);
  return { bytes: row?.bytes ?? 0, count: row?.count ?? 0 };
}

export async function totalStoredBytes() {
  const [row] = await File.aggregate([{ $group: { _id: null, bytes: { $sum: '$size' } } }]);
  return row?.bytes ?? 0;
}
