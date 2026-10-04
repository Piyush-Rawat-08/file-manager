import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true }, // User id
    name: { type: String, required: true },
    storageKey: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    shareToken: { type: String, unique: true, sparse: true },
    disabled: { type: Boolean, default: false }, // set by moderation
  },
  { timestamps: true },
);

fileSchema.index({ ownerId: 1, createdAt: -1 });

export const File = mongoose.model('File', fileSchema);
