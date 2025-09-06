import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['earn', 'redeem', 'referral'], required: true },
    amount: { type: Number, required: true },
    meta: { type: Object },
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);