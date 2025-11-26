import { db } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

export interface HighScore {
  id?: string;
  userId: string;
  username?: string;
  score: number;
  timestamp: any;
  grade: string;
}

const SCORES_COLLECTION = 'highscores';

/**
 * Save or update a user's high score.
 * Uses the userId as the document ID to avoid duplicates.
 */
export const saveHighScore = async (
  userId: string,
  username: string,
  score: number,
  grade: string
) => {
  if (!db) {
    console.warn("Firestore not initialized, skipping save.");
    return false;
  }

  try {
    // Document reference with userId as the ID (prevents duplicates)
    const scoreRef = doc(db, SCORES_COLLECTION, userId);

    // Check if user already has a score
    const existing = await getDoc(scoreRef);

    if (existing.exists()) {
      const existingScore = existing.data().score || 0;

      if (score > existingScore) {
        // Update only if higher
        await setDoc(scoreRef, {
          userId,
          username,
          score,
          grade,
          timestamp: Timestamp.now(),
        });

        console.log(`🔥 Updated highscore: ${existingScore} → ${score}`);
        return true;
      } else {
        console.log(`⚠️ New score ${score} ≤ existing ${existingScore}, no update.`);
        return false;
      }
    }

    // No record — create one
    await setDoc(scoreRef, {
      userId,
      username,
      score,
      grade,
      timestamp: Timestamp.now(),
    });

    console.log(`✨ New highscore created for ${username}: ${score}`);
    return true;

  } catch (error) {
    console.error("Error saving score: ", error);
    return false;
  }
};

/**
 * Fetch leaderboard sorted by highest score.
 */
export const getLeaderboard = async (limitCount = 10): Promise<HighScore[]> => {
  if (!db) {
    console.warn("Firestore not initialized, skipping fetch.");
    return [];
  }

  try {
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const scores: HighScore[] = [];

    snapshot.forEach((docSnap) => {
      scores.push({ id: docSnap.id, ...docSnap.data() } as HighScore);
    });

    return scores;

  } catch (error) {
    console.error("Error fetching leaderboard: ", error);
    return [];
  }
};