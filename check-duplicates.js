// Check for duplicate userId entries in highscores collection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD3kkZu-F42hTjVxCsR6vxmUCIZO1u_Wq8",
  authDomain: "paper-plane-drift.firebaseapp.com",
  projectId: "paper-plane-drift",
  storageBucket: "paper-plane-drift.firebasestorage.app",
  messagingSenderId: "634992682945",
  appId: "1:634992682945:web:3b78c08d09c21ffebcb063"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("\n🔍 Checking for duplicate userId entries\n");
console.log("=" .repeat(70));

async function checkDuplicates() {
  try {
    const q = query(collection(db, 'highscores'), orderBy('score', 'desc'));
    const snapshot = await getDocs(q);

    console.log(`\nTotal records: ${snapshot.size}\n`);

    const userMap = {};
    const duplicates = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const username = data.username || data.name || 'N/A';
      const score = data.score;

      if (!userId) {
        console.log(`⚠️ Record without userId: ${doc.id}`);
        return;
      }

      if (userMap[userId]) {
        // Duplicate found!
        duplicates.push({
          userId,
          username,
          records: [
            ...userMap[userId].records,
            { docId: doc.id, score, username }
          ]
        });
        userMap[userId].records.push({ docId: doc.id, score, username });
        userMap[userId].count++;
      } else {
        userMap[userId] = {
          userId,
          username,
          count: 1,
          records: [{ docId: doc.id, score, username }]
        };
      }
    });

    // Find all users with duplicates
    const usersWithDuplicates = Object.values(userMap).filter(u => u.count > 1);

    if (usersWithDuplicates.length === 0) {
      console.log("✅ No duplicates found! Each user has exactly 1 record.\n");
    } else {
      console.log(`❌ Found ${usersWithDuplicates.length} users with duplicate records:\n`);

      usersWithDuplicates.forEach(user => {
        console.log(`\n👤 User: ${user.username} (${user.userId})`);
        console.log(`   Records: ${user.count}`);
        user.records.forEach((record, idx) => {
          console.log(`   ${idx + 1}. Score: ${record.score} | Doc ID: ${record.docId}`);
        });
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n📊 Summary:");
    console.log(`   Total Records: ${snapshot.size}`);
    console.log(`   Unique Users: ${Object.keys(userMap).length}`);
    console.log(`   Users with Duplicates: ${usersWithDuplicates.length}`);
    console.log("\n");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkDuplicates();
