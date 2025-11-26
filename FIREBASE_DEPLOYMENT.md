# Firebase Deployment Guide

This guide explains how to deploy Firebase security rules and host your Paper Plane Drift game.

## Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase (if not already done):
```bash
firebase init
```
Select:
- Firestore (rules and indexes)
- Storage
- Hosting (optional)

## Project Structure

- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes for optimized queries
- `storage.rules` - Storage security rules
- `firebase.json` - Firebase project configuration

## Security Rules Overview

### Firestore Rules (`firestore.rules`)

**What's Protected:**
- **High Scores Collection** (`highscores`)
  - ✅ Anyone can READ leaderboard (public game)
  - ✅ Anyone can CREATE scores with validation
  - ❌ No UPDATES allowed (prevents cheating)
  - ❌ No DELETES allowed (maintains integrity)

**Validation Rules:**
- **Name**: 1-15 characters, alphanumeric + spaces/underscores/hyphens only
- **Score**: 0-999,999 (reasonable max)
- **Grade**: Valid format (A+, B, C-, F, etc.)
- **Timestamp**: Must be within last 5 minutes, not in future

**Anti-Cheat Measures:**
- Data type validation
- Value range validation
- Timestamp verification
- Pattern matching for names/grades
- No updates/deletes after creation

### Storage Rules (`storage.rules`)

Currently denies all access by default. Uncomment and modify sections if you need to:
- Store user profile pictures
- Upload game assets
- Store plane skin customizations

## Deploying Rules

### Deploy All Rules
```bash
firebase deploy
```

### Deploy Only Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Only Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### Deploy Only Storage Rules
```bash
firebase deploy --only storage
```

### Deploy Hosting (Game Files)
```bash
npm run build
firebase deploy --only hosting
```

## Testing Rules Locally

Start the Firebase emulator suite:
```bash
firebase emulators:start
```

This will start:
- Firestore emulator on `localhost:8080`
- Storage emulator on `localhost:9199`
- Hosting emulator on `localhost:5000`
- Emulator UI on `localhost:4000`

Update your `firebaseConfig.ts` to use emulators during development:
```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';

// After initializing Firestore
if (location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Testing Security Rules

Create test files in `firestore-rules-tests/`:

```bash
npm install --save-dev @firebase/rules-unit-testing
```

Example test:
```javascript
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

// Test valid score submission
await assertSucceeds(
  testDb.collection('highscores').add({
    name: 'Player1',
    score: 1000,
    grade: 'A+',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
);

// Test invalid score (too high)
await assertFails(
  testDb.collection('highscores').add({
    name: 'Cheater',
    score: 9999999,
    grade: 'A+',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
);
```

## Advanced: Rate Limiting

The current rules have basic rate limiting. For production, implement Cloud Functions:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.checkRateLimit = functions.firestore
  .document('highscores/{scoreId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const recentScores = await admin.firestore()
      .collection('highscores')
      .where('timestamp', '>', admin.firestore.Timestamp.now() - 300) // 5 mins
      .get();

    if (recentScores.size > 10) {
      // Too many submissions
      await snap.ref.delete();
      console.warn('Rate limit exceeded, score deleted');
    }
  });
```

Deploy functions:
```bash
firebase deploy --only functions
```

## Monitoring

1. **Firebase Console**: Monitor security rule violations
   - Go to: https://console.firebase.google.com
   - Select your project
   - Navigate to Firestore or Storage
   - Check the Rules tab for denied requests

2. **Set up Alerts**: Configure email alerts for suspicious activity

## Backup Strategy

Regularly backup your Firestore data:
```bash
gcloud firestore export gs://[BUCKET_NAME]/backups
```

## Security Best Practices

1. ✅ Never expose sensitive API keys in client code
2. ✅ Always validate data on server-side (rules)
3. ✅ Use Cloud Functions for complex business logic
4. ✅ Monitor Firebase usage and set budget alerts
5. ✅ Regularly review security rules
6. ✅ Test rules in emulator before deploying
7. ✅ Keep Firebase SDK and dependencies updated

## Troubleshooting

**"Permission Denied" errors:**
- Check that rules are deployed: `firebase deploy --only firestore:rules`
- Verify data matches validation rules
- Check Firebase Console for specific error messages

**Slow queries:**
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Check Firebase Console for missing index warnings

**Rules not updating:**
- Rules can take a few minutes to propagate
- Clear browser cache
- Verify deployment was successful

## Support

- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support
- Community: https://stackoverflow.com/questions/tagged/firebase

## Next Steps

1. Deploy the rules to production
2. Test thoroughly in emulator first
3. Monitor for security issues
4. Consider implementing Cloud Functions for advanced features
5. Set up automated backups
6. Configure usage alerts and budgets
