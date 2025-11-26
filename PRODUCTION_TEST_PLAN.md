# Production Test Plan - Paper Plane Drift

## Overview
This document outlines how the highscore system works in production with CrazyGames SDK integration.

## Key Changes
- ✅ Removed manual name input
- ✅ Highscores now use CrazyGames user ID and username
- ✅ Auto-save for logged-in users
- ✅ Login prompt for non-logged-in users
- ✅ Backward compatible with old data

## Production Flow

### 1. Game Initialization
```
1. App loads → initCrazyGames()
2. SDK loads from https://sdk.crazygames.com/crazygames-sdk-v3.js
3. getUser() called automatically
   - If user logged in → stores user data (userId, username)
   - If not logged in → cgUser = null
4. Game ready to play
```

### 2. Gameplay
```
1. User plays game
2. Game over occurs
3. Teacher report generated (AI grade)
4. Automatic save logic:
   - If cgUser exists → Auto-save score with username
   - If cgUser is null → Show "Log in to save score" prompt
```

### 3. Score Saving (Logged In Users)

**Firestore Data Structure:**
```json
{
  "userId": "UOuZBKgjwpY9k4TSBB2NPugbsHD2",
  "username": "RustyCake.ZU9H",
  "score": 1250,
  "grade": "B+",
  "timestamp": Timestamp
}
```

**What Gets Stored:**
- `userId` - Unique CrazyGames user identifier
- `username` - Display name from CrazyGames
- `score` - Distance flown (in meters)
- `grade` - Teacher's grade (A+, B, C-, etc.)
- `timestamp` - When score was achieved

**What Doesn't Get Stored:**
- ❌ Player's input name
- ❌ Profile picture
- ❌ JWT token
- ❌ Email or personal data

### 4. Score Saving (Non-Logged In Users)

**UI Shown:**
```
┌─────────────────────────────────┐
│ Want to save your score?       │
│                                 │
│ [ Log in to CrazyGames ]       │
└─────────────────────────────────┘
```

**Flow:**
1. User clicks "Log in to CrazyGames"
2. `showAuthPrompt()` called → CrazyGames login modal appears
3. User logs in successfully
4. `getUser()` called again → gets user data
5. Score automatically saved with new user data
6. Leaderboard refreshed

### 5. Leaderboard Display

**Data Fetching:**
- Top 5 scores fetched from Firestore
- Sorted by score (descending)
- Includes: username, score, grade

**Display:**
```
Class Rankings
━━━━━━━━━━━━━━━━━━━━━━━━━
1. RustyCake.ZU9H    1250m  A+
2. DevPlayer         980m   B
3. Anonymous         750m   C+
```

**Highlighting:**
- Current user's scores highlighted in blue
- "Score saved as [username]" confirmation shown

## Development Mode Behavior

### Auto-Detection
Development mode when hostname is:
- `localhost`
- `127.0.0.1`
- `192.168.x.x`

### Mock Data
```javascript
// Development user
{
  userId: "dev_user_123",
  username: "DevPlayer",
  profilePictureUrl: ""
}
```

### SDK Calls
All SDK calls logged with `🎮 [DEV]` prefix:
```
🎮 [DEV] SDK: Game loading started
👤 [DEV] SDK: Get user - mock user returned
👤 [DEV] SDK: Auth prompt - simulating successful login
```

## Production Testing Checklist

### Pre-Deployment
- [x] Build succeeds without errors
- [x] TypeScript compilation passes
- [x] No console errors in development mode
- [x] Mock user system works in development

### On CrazyGames Platform

#### Test 1: Logged In User
1. [ ] Load game on CrazyGames
2. [ ] Verify SDK initializes (check console for ✅)
3. [ ] Verify user is retrieved (username should show)
4. [ ] Play game to completion
5. [ ] Verify score auto-saves
6. [ ] Check "Score saved as [username]" appears
7. [ ] Verify score appears in leaderboard
8. [ ] Verify username is highlighted in blue

**Expected Console Logs:**
```
🎮 Initializing CrazyGames SDK...
✅ SDK initialized successfully
👤 CG SDK: User retrieved
👤 User retrieved: [YourUsername]
```

#### Test 2: Not Logged In User
1. [ ] Load game in incognito/private mode
2. [ ] Verify SDK initializes
3. [ ] Verify no user retrieved (cgUser = null)
4. [ ] Play game to completion
5. [ ] Verify "Want to save your score?" prompt shows
6. [ ] Click "Log in to CrazyGames" button
7. [ ] Complete login flow
8. [ ] Verify score saves after login
9. [ ] Verify username appears correctly

**Expected Console Logs:**
```
🎮 Initializing CrazyGames SDK...
✅ SDK initialized successfully
👤 No user logged in
```

#### Test 3: Leaderboard
1. [ ] Verify top 5 scores load correctly
2. [ ] Verify usernames display (not "Anonymous")
3. [ ] Verify scores are sorted by highest first
4. [ ] Verify grades display correctly
5. [ ] Verify current user's scores highlighted
6. [ ] Test with empty leaderboard (shows "No rankings yet")

#### Test 4: Error Handling
1. [ ] Test with Firestore unavailable
   - Should log warning
   - Game should continue
   - Scores won't save but game playable

2. [ ] Test with SDK not loading
   - Should timeout after 3 seconds
   - Game should continue
   - Shows "No user logged in" state

3. [ ] Test login failure
   - User cancels login prompt
   - Score doesn't save
   - Can retry login

4. [ ] Test with old data (missing username field)
   - Should display as "Anonymous"
   - Game doesn't crash
   - New scores save with username

## Edge Cases Handled

### ✅ User Not Logged In
- Shows login prompt instead of crashing
- Can play game without saving scores
- Can log in after game over to save score

### ✅ SDK Not Available
- Game continues without SDK features
- Development mode simulation works
- Graceful degradation

### ✅ Backward Compatibility
- Old scores without username show as "Anonymous"
- New scores always include username
- No database migration needed

### ✅ Network Failures
- Firestore errors logged, don't crash game
- User sees warning but can continue
- Can retry on next game

### ✅ Multiple Sessions
- Each user identified by unique userId
- Username can change (fetched fresh each time)
- Scores tied to userId, not username

## Firestore Security Rules

Ensure these rules are in place:

```javascript
match /highscores/{scoreId} {
  // Anyone can read leaderboard
  allow read: if true;

  // Only logged in users can write
  allow create: if request.auth != null
    && request.resource.data.userId is string
    && request.resource.data.username is string
    && request.resource.data.score is number
    && request.resource.data.grade is string;
}
```

## Monitoring & Analytics

### Key Metrics to Track
1. **User Login Rate**
   - % of users who log in
   - % of scores saved

2. **SDK Load Success**
   - SDK initialization success rate
   - Average load time

3. **Score Submission**
   - Successful saves
   - Failed saves (and reasons)

4. **Error Rates**
   - SDK errors
   - Firestore errors
   - Authentication errors

### Console Logs to Monitor

**Success Indicators:**
```
✅ SDK initialized successfully
👤 CG SDK: User retrieved
👤 User logged in: [username]
```

**Warning Indicators:**
```
⚠️ SDK unavailable, continuing without SDK features
Firestore not initialized, skipping save.
👤 No user logged in
```

**Error Indicators:**
```
CG SDK Error (Get User): [error]
Error saving score: [error]
Login error: [error]
```

## Rollback Plan

If issues occur in production:

1. **Immediate**: Monitor error logs
2. **If SDK fails**: Game still playable, just no score saving
3. **If Firestore fails**: Game playable, scores not saved
4. **If critical bug**: Can quickly add localStorage fallback:

```javascript
// Emergency fallback
if (!cgUser) {
  const localName = prompt("Enter name");
  localStorage.setItem('scores', ...);
}
```

## Success Criteria

✅ Build completes without errors
✅ SDK initializes in production
✅ Logged-in users can save scores
✅ Non-logged-in users see login prompt
✅ Leaderboard displays correctly
✅ No crashes when SDK unavailable
✅ Old data displays as "Anonymous"
✅ Current user's scores highlighted
✅ Login flow works end-to-end
✅ Scores persist across sessions

## Contact & Support

- **SDK Issues**: Check CrazyGames Developer Portal
- **Firestore Issues**: Check Firebase Console
- **Game Issues**: Check browser console logs

---

**Last Updated**: 2025-11-25
**Version**: 1.0
**Status**: Ready for Production Testing
