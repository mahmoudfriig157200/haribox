import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    amount: { type: Number, required: true },
    rewardType: { type: String, required: true }, // e.g., 'freefire', 'pubg', 'vodafone_cash'
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: String,
    // Method-specific fields
    method: { type: String, enum: ['freefire', 'pubg', 'vodafone_cash'], required: false },
    accountId: { type: String }, // in-game id for Free Fire / PUBG
    email: { type: String },     // email for game account
    walletNumber: { type: String }, // Vodafone Cash number (11 digits)
    walletName: { type: String },   // Wallet owner name
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);