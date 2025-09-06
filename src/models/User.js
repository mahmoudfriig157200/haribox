import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, index: true, unique: true, sparse: true },
    passwordHash: { type: String },
    googleId: { type: String, index: true },
    name: String,
    avatar: String,

    points: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'banned'], default: 'active' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    myReferralCode: { type: String, unique: true, index: true },
    referrerCode: { type: String, index: true },

    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.validatePassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

// Ensure unique referral code
userSchema.pre('save', function (next) {
  if (!this.myReferralCode) {
    this.myReferralCode = Math.random().toString(36).slice(2, 10);
  }
  next();
});

export const User = mongoose.model('User', userSchema);