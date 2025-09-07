// Reward model: represents a redeemable item users can withdraw
// method: 'freefire' | 'pubg' | 'vodafone_cash'
// label: display name (e.g., '100 دايموند')
// qty: quantity unit (e.g., 100 diamonds, 60 UC, 10 EGP)
// pricePoints: points cost to redeem
// enabled: whether item is visible/selectable
import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['freefire', 'pubg', 'vodafone_cash'], required: true },
    label: { type: String, required: true },
    qty: { type: Number, required: true },
    pricePoints: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

export const Reward = mongoose.model('Reward', rewardSchema);