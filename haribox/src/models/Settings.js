// Settings model: holds dynamic pricing/base rules editable by admin
// For simplicity store a single document with known keys
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    // base pricing rules
    freefire_per100_points: { type: Number, default: 105 }, // points per 100 diamonds
    pubg_per60_points: { type: Number, default: 105 },      // points per 60 UC
    vodafone_points_per_egp: { type: Number, default: 2 },  // points cost per 1 EGP (so 100 pts = 50 EGP)
    updatedAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);