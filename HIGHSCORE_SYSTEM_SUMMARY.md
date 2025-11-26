# Highscore System - CrazyGames SDK Integration

## 🎯 What Changed

### Before
```
User plays → Game over → Enter name manually → Save to Firestore
                         ↓
                    localStorage stores name
                         ↓
                    Show in leaderboard
```

### After
```
User plays → Game over → Check CrazyGames login
                         ↓
            ┌────────────┴────────────┐
            │                         │
        Logged In               Not Logged In
            │                         │
            ↓                         ↓
    Auto-save with              Show login button
    CrazyGames username              │
            │                         ↓
            ↓                   User clicks login
    Show in leaderboard              │
    (highlighted)                    ↓
                            CrazyGames auth prompt
                                     │
                                     ↓
                              Login successful
                                     │
                                     ↓
                            Auto-save score
                                     │
                                     ↓
                            Show in leaderboard
```

## 📊 Data Flow

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Game Initialization                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├→ Load CrazyGames SDK
                  │  └→ window.CrazyGames.SDK
                  │
                  ├→ Call getUser()
                  │  └→ Returns: { userId, username, profilePictureUrl }
                  │     OR null if not logged in
                  │
                  └→ Store user data in state
                     └→ cgUser state

┌─────────────────────────────────────────────────────────────┐
│                       Game Play                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├→ gameplayStart()
                  ├→ Player flies plane
                  ├→ Dodge obstacles
                  └→ Game over

┌─────────────────────────────────────────────────────────────┐
│                    Score Submission                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├→ Get teacher's grade (AI)
                  │
                  ├→ Check if cgUser exists?
                  │
          ┌───────┴────────┐
          │                │
         YES              NO
          │                │
          ↓                ↓
    saveHighScore()    Show login prompt
          │                │
          ↓                ├→ User clicks "Log in"
    Firestore:            │
    {                      ↓
      userId: "ABC123",   showAuthPrompt()
      username: "Player", │
      score: 1250,        ↓
      grade: "A+",       Login successful
      timestamp: Date     │
    }                     ↓
          │              getUser() again
          │               │
          ↓               ↓
    Score saved!    saveHighScore()
          │               │
          └───────┬───────┘
                  │
                  ↓
          Refresh leaderboard
                  │
                  ↓
          Show in UI with highlighting
```

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│              Development Mode (localhost)                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├→ Auto-detect localhost
                  │  └→ isInDevelopment = true
                  │
                  ├→ Mock SDK calls
                  │  └→ Console logs: 🎮 [DEV]
                  │
                  ├→ getUser() returns mock user:
                  │  {
                  │    userId: "dev_user_123",
                  │    username: "DevPlayer",
                  │    profilePictureUrl: ""
                  │  }
                  │
                  └→ All SDK functions simulated
                     ├→ gameplayStart() → console.log
                     ├→ showAuthPrompt() → returns success
                     └→ No actual SDK calls made
```

## 🔧 Code Changes

### 1. CrazyGames SDK Service
**File**: `services/crazyGamesService.ts`

```typescript
// Added interface
export interface CrazyGamesUser {
  userId: string;
  username: string;
  profilePictureUrl: string;
}

// Added function
export const getUser = async (): Promise<CrazyGamesUser | null> => {
  // Development: Returns mock user
  // Production: Calls SDK and returns user or null
}

// Updated function
export const showAuthPrompt = async (): Promise<any> => {
  // Development: Simulates login
  // Production: Shows CrazyGames login modal
}
```

### 2. Firebase Service
**File**: `services/firebaseService.ts`

```typescript
// Updated interface
export interface HighScore {
  id?: string;
  userId: string;          // ← Changed from 'name'
  username?: string;       // ← New field (optional for old data)
  score: number;
  timestamp: any;
  grade: string;
}

// Updated function signature
export const saveHighScore = async (
  userId: string,          // ← Changed from 'name'
  username: string,        // ← New parameter
  score: number,
  grade: string
) => {
  // Now saves userId and username instead of manual name
}
```

### 3. App Component
**File**: `App.tsx`

**Removed:**
- ❌ `playerName` state
- ❌ `setPlayerName` state setter
- ❌ localStorage for player name
- ❌ Manual name input form
- ❌ `handleSubmitScore` function

**Added:**
- ✅ `cgUser` state (CrazyGamesUser | null)
- ✅ `handleLogin` function
- ✅ Auto-fetch user on SDK init
- ✅ Auto-save score if logged in
- ✅ Login button for non-logged-in users
- ✅ User status display

**Updated:**
- 🔄 Leaderboard display (shows username from DB)
- 🔄 Score highlighting (uses userId instead of name)
- 🔄 Game over screen UI

## 🎨 UI Changes

### Game Over Screen - Logged In
```
┌─────────────────────────────────────┐
│     Flight Terminated               │
│                                     │
│  ╔═══════════════════════════╗    │
│  ║  NEW PERSONAL RECORD!     ║    │
│  ╚═══════════════════════════╝    │
│                                     │
│  Distance: 1250m  │  Erasers: 3   │
│                                     │
│  +125 coins earned!                │
│                                     │
│  ┌─────────────────────────┐      │
│  │ Teacher's Note:    A+   │      │
│  │ "Excellent work!"       │      │
│  └─────────────────────────┘      │
│                                     │
│  ┌─────────────────────────┐      │
│  │ Playing as DevPlayer    │  ← Shows username
│  └─────────────────────────┘      │
│                                     │
│  Class Rankings                    │
│  1. DevPlayer      1250m  A+  ← Highlighted
│  2. OtherUser      980m   B        │
│  3. Anonymous      750m   C+       │
│                                     │
│  [ Try Again ]                     │
└─────────────────────────────────────┘
```

### Game Over Screen - Not Logged In
```
┌─────────────────────────────────────┐
│     Flight Terminated               │
│                                     │
│  Distance: 1250m  │  Erasers: 3   │
│                                     │
│  +125 coins earned!                │
│                                     │
│  ┌─────────────────────────┐      │
│  │ Teacher's Note:    A+   │      │
│  │ "Excellent work!"       │      │
│  └─────────────────────────┘      │
│                                     │
│  ┌────────────────────────────┐   │
│  │ Want to save your score?   │   │
│  │                            │   │
│  │ [ Log in to CrazyGames ]  │ ← Login button
│  └────────────────────────────┘   │
│                                     │
│  Class Rankings                    │
│  1. OtherUser      980m   B        │
│  2. AnotherUser    750m   C+       │
│                                     │
│  [ Try Again ]                     │
└─────────────────────────────────────┘
```

## 🔐 Security & Privacy

### What We Store
✅ **userId**: Unique CrazyGames identifier
✅ **username**: Display name (can change)
✅ **score**: Game performance
✅ **grade**: Teacher's evaluation
✅ **timestamp**: When score was achieved

### What We Don't Store
❌ Email addresses
❌ Real names
❌ Profile pictures
❌ JWT tokens
❌ Personal information
❌ IP addresses

### Data Access
- **Read**: Public (anyone can view leaderboard)
- **Write**: Only authenticated users
- **Update**: Not allowed (scores are immutable)
- **Delete**: Admin only

## 📈 Benefits

### For Players
1. **No Manual Entry**: No typing names after every game
2. **Persistent Identity**: Scores tied to account
3. **Cross-Device**: Same username everywhere
4. **Privacy**: No email/personal info needed
5. **Consistency**: Username managed by CrazyGames

### For Developers
1. **Less Code**: No name validation/sanitization
2. **Security**: Built-in authentication
3. **Spam Prevention**: Real users only
4. **Analytics**: Track unique users
5. **Platform Integration**: Native CrazyGames features

### For Platform
1. **User Engagement**: Encourages login
2. **Data Quality**: Real user data
3. **No Abuse**: Prevents fake names
4. **Compliance**: GDPR-friendly
5. **Tracking**: Better analytics

## 🧪 Testing

### Quick Test (Development)
```bash
# 1. Start development server
npm run dev

# 2. Open browser to localhost
# 3. Check console for:
#    🎮 [DEV] SDK: Game loading started
#    👤 [DEV] SDK: Get user - mock user returned

# 4. Play game to game over
# 5. Verify:
#    - "Playing as DevPlayer" shows
#    - Score auto-saves
#    - Leaderboard updates
```

### Production Simulation
```bash
# 1. Build for production
npm run build

# 2. Test on CrazyGames platform
# 3. Verify SDK loads:
#    ✅ SDK initialized successfully
#    👤 CG SDK: User retrieved

# 4. Test both scenarios:
#    - Logged in (auto-save)
#    - Not logged in (login prompt)
```

## 📝 Migration Notes

### Existing Players
- Old scores (with manual names) will show as "Anonymous"
- New scores will use CrazyGames username
- No data loss - old scores still in leaderboard
- Gradual migration as players play again

### Database
- No migration script needed
- Old format: `{ name: "string", ... }`
- New format: `{ userId: "string", username: "string", ... }`
- Both formats supported simultaneously

## 🚀 Deployment Checklist

- [x] Code changes complete
- [x] Build succeeds
- [x] TypeScript compiles
- [x] No console errors
- [x] Development mode tested
- [ ] Deploy to CrazyGames test environment
- [ ] Test with logged-in account
- [ ] Test without login
- [ ] Test login flow
- [ ] Test leaderboard display
- [ ] Verify old data compatibility
- [ ] Monitor error logs
- [ ] Deploy to production

---

**Status**: ✅ Ready for Production Testing
**Last Updated**: 2025-11-25
**Version**: 2.0
