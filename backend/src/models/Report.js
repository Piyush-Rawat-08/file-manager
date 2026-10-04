import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    reason: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true },
);

export const Report = mongoose.model('Report', reportSchema);
