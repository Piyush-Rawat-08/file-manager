import mongoose from 'mongoose';

// Generic usage counter (daily caps). Old rows expire automatically.
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number }, // no default: it would conflict with $inc on upsert
  expiresAt: { type: Date, index: { expires: 0 } },
});

export const Counter = mongoose.model('Counter', counterSchema);
