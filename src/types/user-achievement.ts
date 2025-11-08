
import { Timestamp } from 'firebase/firestore';

export type UserAchievement = {
  id: string;
  userId: string;
  pair: string; // The TA/ISIC pair achieved
  awardedAt: Timestamp;
};
