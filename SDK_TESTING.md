# CrazyGames SDK Testing Guide

Quick guide for testing the CrazyGames SDK integration in Paper Plane Drift.

## Quick Start

### 1. Open the Game
```bash
npm run dev
```

### 2. Open Browser Console
- Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
- Press `Cmd+Option+I` (Mac)

### 3. Look for SDK Messages

You should see:
```
🎮 Initializing CrazyGames SDK...
🎮 Development Mode: CrazyGames SDK calls will be simulated
✅ SDK initialized successfully
🎮 [DEV] SDK: Game loading started
🎮 [DEV] SDK: Game loading stopped
```

## SDK Debug Panel

### Open the Debug Panel
Press **`Ctrl+Shift+D`** (or `Cmd+Shift+D` on Mac)

### Features
- **SDK Status**: Shows if SDK is in dev or production mode
- **Adblock Detection**: Test if adblock is active
- **Game Events**: Manually trigger gameplay start/stop/happyTime
- **Advertisements**: Test midgame and rewarded ads
- **Real-time Feedback**: See ad callbacks and status

### Using the Debug Panel

1. **Test Midgame Ad:**
   - Click "📺 Request Midgame Ad"
   - Watch console for callbacks
   - In dev mode: resolves after 1 second
   - Status shows: "Ad started!" → "Ad finished!" → "Ad completed ✅"

2. **Test Rewarded Ad:**
   - Click "🎁 Request Rewarded Ad"
   - In dev mode: resolves after 2 seconds
   - Should give reward only if completed

3. **Test Game Events:**
   - Click "▶️ Start" - fires `gameplayStart()`
   - Click "⏸️ Stop" - fires `gameplayStop()`
   - Click "🎉 Happy Time" - fires `happyTime()`

## Console Commands

Open browser console and test SDK functions directly:

```javascript
// Import functions (already available globally)
const {
  gameplayStart,
  gameplayStop,
  happyTime,
  requestMidgameAd
} = window;

// Test gameplay events
gameplayStart();
gameplayStop();
happyTime();

// Test ads with callbacks
await requestMidgameAd({
  adStarted: () => console.log("Ad started!"),
  adFinished: () => console.log("Ad finished!"),
  adError: (e) => console.error("Ad error:", e)
});
```

## Testing Scenarios

### Scenario 1: Normal Game Flow

1. Start game (press Space or tap)
2. Console should show:
   ```
   🎮 [DEV] SDK: Gameplay started
   ```

3. Let plane crash
4. Console should show:
   ```
   🎮 [DEV] SDK: Gameplay stopped
   🎉 [DEV] SDK: Happy time!
   ```

### Scenario 2: Pause/Resume

1. During gameplay, press `Escape`
2. Console shows:
   ```
   🎮 [DEV] SDK: Gameplay stopped
   ```

3. Press `Escape` again or click Resume
4. Console shows:
   ```
   🎮 [DEV] SDK: Gameplay started
   ```

### Scenario 3: Ad Integration (Future)

When you add midgame ads to game over:

```typescript
const handleGameOver = async () => {
  gameplayStop();

  // Show ad every other game over
  if (Math.random() > 0.5) {
    await requestMidgameAd({
      adStarted: () => {
        // Mute game audio
        setIsMuted(true);
      },
      adFinished: () => {
        // Restore audio
        setIsMuted(false);
        // Show game over screen
      }
    });
  }

  happyTime();
};
```

## Development vs Production

### Development Mode (localhost)
- ✅ All SDK calls are simulated
- ✅ Instant feedback (no real ads)
- ✅ Safe to test without SDK script
- ✅ Console logs with 🎮 prefix
- ✅ No CrazyGames approval needed

### Production Mode (crazygames.com)
- Real CrazyGames SDK loaded
- Actual ads shown to players
- Real ad revenue
- Requires game approval
- Console logs with 📊/🎮/🎉 prefix

## Common Development Workflows

### 1. Local Testing (Current)
```
localhost → Dev Mode → Simulated SDK → No actual ads
```

**Use for:**
- Feature development
- SDK integration testing
- Debugging game logic

### 2. Production Preview
```
Build → Upload to CG → Real SDK → Real ads (test mode)
```

**Use for:**
- Final testing before launch
- Ad placement verification
- Performance testing

## Debugging Tips

### SDK Not Initializing?

Check console for:
```
⚠️ CrazyGames SDK not found - continuing without SDK features
```

**Solutions:**
- Game still works! SDK is optional in development
- In production: Check if SDK script is loaded
- Verify `index.html` has SDK script tag

### Ads Not Working?

**In Development:**
- Expected! Ads are simulated
- Look for `🎁 [DEV] SDK: Rewarded ad requested`
- Ads resolve after 1-2 seconds automatically

**In Production:**
- Check adblock: Use debug panel "Check Adblock"
- Verify ad frequency (not too often)
- Check CrazyGames dashboard for ad status

### Events Not Firing?

**Check:**
1. Is SDK initialized? Look for "✅ SDK initialized"
2. Open debug panel (Ctrl+Shift+D)
3. Manually trigger events
4. Check browser console for errors

### TypeScript Errors?

```typescript
// Correct imports
import {
  gameplayStart,
  requestMidgameAd,
  type AdCallbacks  // Note: 'type' keyword
} from './services/crazyGamesService';
```

## Performance Testing

### Check SDK Impact

1. Open browser Performance tab
2. Start profiling
3. Play game for 1 minute
4. Stop profiling
5. Look for SDK-related calls

**Expected:**
- Minimal CPU usage from SDK
- No frame drops
- Smooth gameplay

### Network Tab

1. Open Network tab
2. Reload game
3. Look for SDK requests

**In Dev Mode:** No network requests (simulated)
**In Production:** SDK script load + ad requests

## Pre-Deployment Checklist

Before deploying to CrazyGames:

- [ ] SDK initializes without errors
- [ ] All game events fire correctly
- [ ] Test midgame ad integration
- [ ] Test rewarded ad integration (if used)
- [ ] Verify happyTime triggers on achievements
- [ ] Check console for errors
- [ ] Test with/without adblock
- [ ] Verify audio mutes during ads
- [ ] Game continues if ads fail
- [ ] No SDK calls during active gameplay

## Live Monitoring

After deployment to CrazyGames:

### Check Browser Console on Live Site
```
✅ CrazyGames SDK Initialized Successfully
📊 CG SDK: Loading started
📊 CG SDK: Loading stopped
🎮 CG SDK: Gameplay started
```

### Test Ad Flow
1. Play until game over
2. Observe ad (if shown)
3. Verify game resumes correctly
4. Check audio restored

### Monitor CrazyGames Dashboard
- Ad impressions
- Ad fill rate
- Error rate
- User engagement

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No console logs | Check if console is open, reload page |
| "SDK not found" warning | Normal in dev mode, ignore |
| Ads showing in dev | Not possible - ads are simulated |
| Can't open debug panel | Press Ctrl+Shift+D, check keyboard shortcuts |
| Game crashes on ad | Check error in console, report bug |
| Infinite ad loading | Check network tab, may be slow connection |

## Advanced Testing

### Test Ad Failure Handling

```javascript
// Manually trigger ad error
const { requestMidgameAd } = window;

await requestMidgameAd({
  adError: (err) => {
    console.log("Handling error:", err);
    // Game should continue normally
  }
});
```

### Test Rapid Events

```javascript
// Stress test
gameplayStart();
gameplayStop();
gameplayStart();
gameplayStop();
happyTime();
// Should handle gracefully
```

### Test During Gameplay

```javascript
// Should NOT call during active gameplay
// Bad practice, but SDK should handle it
happyTime(); // While plane is flying
```

## Support

**Questions?**
- Check `CRAZYGAMES_SDK.md` for full documentation
- Review `crazyGamesService.ts` for implementation
- Open browser console for detailed logs

**Found a Bug?**
- Note the exact console error
- Screenshot debug panel state
- Describe reproduction steps

---

**Quick Reference:**
- Debug Panel: `Ctrl+Shift+D`
- Pause Game: `Escape`
- Browser Console: `F12`

**Console Emoji Guide:**
- 🎮 = Game events
- 📺 = Midgame ads
- 🎁 = Rewarded ads
- 📊 = Loading events
- 🎉 = Happy time
- ✅ = Success
- ⚠️ = Warning
- ❌ = Error
