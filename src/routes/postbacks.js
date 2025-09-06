import express from 'express';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

// OGAds Postback based on provided placeholders
// Example: https://website.com/postback.php?id={offer_id}&payout={payout}&ip={session_ip}&aff_sub={aff_sub}&aff_sub4={aff_sub4}&aff_sub5={aff_sub5}
router.get('/network', async (req, res) => {
  try {
    // Simple shared-secret check (set OGADS_POSTBACK_SECRET in .env and OGAds dashboard)
    const expected = (process.env.OGADS_POSTBACK_SECRET || '').toString();
    const provided = (req.query.secret || '').toString();
    if (!expected || provided !== expected) return res.status(403).send('forbidden');

    // Required: payout; Affiliate subs carry user identity
    const payout = Number(req.query.payout || 0);
    // Accept multiple possible sub fields. Prefer aff_sub, then subid/sub_id/uid, then aff_sub4.
    const sub = (req.query.aff_sub || req.query.subid || req.query.sub_id || req.query.uid || req.query.aff_sub4);
    const sub4 = req.query.aff_sub4; // advanced data
    const sub5 = req.query.aff_sub5; // advanced data
    const offerId = (req.query.id || req.query.offer_id || '').toString();

    if (!sub || !payout) return res.status(400).send('missing-fields');

    // Identify user by myReferralCode first, fallback to _id
    const user = await User.findOne({ $or: [{ myReferralCode: sub }, { _id: sub }] });
    if (!user) return res.status(404).send('user-not-found');

    // Convert payout ($) to points; default 1$ = 100 points but can override via POINTS_PER_USD
    const perUsd = Number(process.env.POINTS_PER_USD || 100);
    const safePayout = isFinite(payout) && payout > 0 ? payout : 0;
    const pointsToAdd = Math.round(safePayout * perUsd);
    if (pointsToAdd <= 0) return res.status(400).send('invalid-payout');

    // Basic de-duplication: if a similar OGAds earn for same user/offer/amount exists recently, ignore
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 48h window
    const existing = await Transaction.findOne({
      userId: user._id,
      type: 'earn',
      amount: pointsToAdd,
      'meta.network': 'ogads',
      ...(offerId ? { 'meta.offerId': offerId } : {}),
      createdAt: { $gte: since }
    });
    if (existing) return res.status(200).send('duplicate');

    user.points += pointsToAdd;
    await user.save();
    await Transaction.create({
      userId: user._id,
      type: 'earn',
      amount: pointsToAdd,
      meta: { network: 'ogads', offerId, raw: req.query, sub4, sub5 }
    });

    // Referral lifetime commission
    if (user.referrerCode && process.env.REFERRAL_LIFETIME_RATE) {
      const rate = Math.max(0, Math.min(1, Number(process.env.REFERRAL_LIFETIME_RATE || 0)));
      if (rate > 0) {
        const ref = await User.findOne({ myReferralCode: user.referrerCode });
        if (ref) {
          const bonus = Math.floor(pointsToAdd * rate);
          if (bonus > 0) {
            ref.points += bonus;
            await ref.save();
            await Transaction.create({ userId: ref._id, type: 'referral', amount: bonus, meta: { sourceUser: user._id, rate } });
          }
        }
      }
    }

    return res.status(200).send('ok');
  } catch (e) {
    return res.status(500).send('error');
  }
});

export default router;