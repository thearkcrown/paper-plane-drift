# CrazyGames SDK Integration Guide

Complete guide for using the CrazyGames SDK in Paper Plane Drift.

## Overview

The CrazyGames SDK is fully integrated with automatic development mode detection, comprehensive error handling, and full TypeScript support.

## Features Implemented

✅ **Game Events**
- Loading start/stop
- Gameplay start/stop
- Happy time (celebrations)
- Invite links (multiplayer)

✅ **Advertisement**
- Midgame ads
- Rewarded ads
- Adblock detection
- Banner ads

✅ **User System**
- User authentication
- Token management
- Account linking

✅ **Development Mode**
- Auto-detects localhost
- Simulates all SDK calls
- Detailed console logging
- No actual ads in development

## Quick Start

### 1. SDK Initialization

The SDK initializes automatically on app start:

```typescript
import { initCrazyGames } from './services/crazyGamesService';

// In App.tsx useEffect
useEffect(() => {
  const initSDK = async () => {
    const success = await initCrazyGames();
    if (success) {
      console.log("SDK ready");
    }
  };
  initSDK();
}, []);
```

### 2. Game Events

```typescript
import {
  gameplayStart,
  gameplayStop,
  happyTime
} from './services/crazyGamesService';

// Start playing
const startGame = () => {
  gameplayStart();
  // ... game logic
};

// Game over
const handleGameOver = () => {
  gameplayStop();
  happyTime(); // Celebrate!
};
```

### 3. Advertisements

#### Midgame Ads (Game Over / Between Levels)

```typescript
import { requestMidgameAd } from './services/crazyGamesService';

const showGameOverAd = async () => {
  const success = await requestMidgameAd({
    adStarted: () => {
      console.log("Ad started - pause game");
      // Mute audio, pause game
    },
    adFinished: () => {
      console.log("Ad finished - resume");
      // Resume game, unmute
    },
    adError: (error) => {
      console.log("Ad failed", error);
      // Continue without ad
    }
  });
};
```

#### Rewarded Ads (Extra Lives, Bonuses)

```typescript
import { requestRewardedAd } from './services/crazyGamesService';

const watchAdForReward = async () => {
  const success = await requestRewardedAd({
    adStarted: () => {
      // Ad is playing
    },
    adFinished: () => {
      // Give reward only if finished
      givePlayerExtraEraser();
    },
    adError: (error) => {
      // No reward if error
      alert("Ad not available");
    }
  });

  return success; // true if ad completed
};
```

## API Reference

### Core Functions

#### `initCrazyGames(): Promise<boolean>`
Initialize the SDK. Call once on app start.

**Returns:** `true` if SDK loaded successfully, `false` otherwise

**Example:**
```typescript
const sdkReady = await initCrazyGames();
```

#### `isCrazyGamesSDKAvailable(): boolean`
Check if SDK is available (not in dev mode).

**Returns:** `true` if SDK is loaded and available

---

### Game Events

#### `sdkGameLoadingStart()`
Signal that game is loading resources.

**When to use:** Start of app, loading screen

#### `sdkGameLoadingStop()`
Signal that loading is complete.

**When to use:** After assets loaded, game ready

#### `gameplayStart()`
Signal that actual gameplay has started.

**When to use:** When player starts flying

#### `gameplayStop()`
Signal that gameplay has stopped.

**When to use:** Game over, pause, menu

#### `happyTime()`
Signal a celebration or achievement.

**When to use:**
- High score achieved
- Level completed
- Major milestone
- **Currently used:** On game over (celebration)

---

### Advertisement Functions

#### `requestMidgameAd(callbacks?): Promise<boolean>`
Request a midgame advertisement.

**Parameters:**
```typescript
{
  adStarted?: () => void;   // Ad playback started
  adFinished?: () => void;  // Ad completed
  adError?: (error) => void; // Ad failed/blocked
}
```

**Returns:** Promise that resolves to `true` if ad completed

**Best Practices:**
- Show between rounds or at game over
- Pause game and mute audio during ad
- Don't show more than once every 3-5 minutes
- Continue game even if ad fails

**Example:**
```typescript
await requestMidgameAd({
  adStarted: () => pauseGame(),
  adFinished: () => resumeGame(),
  adError: () => resumeGame()
});
```

#### `requestRewardedAd(callbacks?): Promise<boolean>`
Request a rewarded advertisement.

**Parameters:** Same as midgame ad

**Returns:** Promise that resolves to `true` if ad completed

**Best Practices:**
- User must consent/click to watch
- Only give reward if `adFinished` is called
- Make reward worthwhile (extra life, bonus items)
- Clearly communicate what reward is

**Example:**
```typescript
const watched = await requestRewardedAd({
  adFinished: () => {
    givePlayerEraser();
    showSuccessMessage();
  }
});

if (!watched) {
  alert("Ad not available right now");
}
```

#### `checkAdblock(): Promise<boolean>`
Check if user has an adblocker.

**Returns:** `true` if adblock detected

**Use case:** Politely ask users to disable adblock

---

### Banner Ads

#### `requestBanner(options)`
Show banner advertisement.

**Parameters:**
```typescript
{
  id: string;          // Unique banner ID
  size: string;        // e.g., "728x90", "300x250"
  position: string;    // "top", "bottom", etc.
}
```

#### `clearBanner()`
Remove current banner.

#### `clearAllBanners()`
Remove all banners.

**Best Practices:**
- Don't obstruct gameplay
- Clear banners during gameplay
- Show during menus/pause screens

---

### User Functions

#### `getUserToken(): Promise<string | null>`
Get authenticated user token.

**Returns:** User token or `null` if not authenticated

#### `showAuthPrompt(): Promise<any>`
Show authentication prompt to user.

**Returns:** Authentication result

---

## Development Mode

### Auto-Detection

The SDK automatically detects development mode:
- `localhost`
- `127.0.0.1`
- `192.168.x.x` (local network)

### Dev Mode Features

In development mode:
- All SDK calls are simulated
- Console logs with 🎮 emoji prefix
- Ads resolve after 1-2 seconds
- No actual SDK calls made
- No need to deploy to test

### Console Output

```
🎮 [DEV] SDK: Game loading started
🎮 [DEV] SDK: Gameplay started
📺 [DEV] SDK: Midgame ad requested
🎉 [DEV] SDK: Happy time!
```

### Testing Production

To test real SDK behavior:
1. Deploy to CrazyGames test environment
2. Check browser console for ✅ messages
3. Test all ad types and events

---

## Best Practices

### Ad Frequency

**Midgame Ads:**
- ✅ Every 3-5 minutes
- ✅ At natural breaks (game over, level complete)
- ❌ Mid-gameplay
- ❌ More than once per 2 minutes

**Rewarded Ads:**
- ✅ User-initiated only
- ✅ Clear reward communication
- ✅ Optional, not required
- ❌ Forced ads

### Game Flow

```
1. App Start
   └─ initCrazyGames()
   └─ sdkGameLoadingStart()

2. Assets Loaded
   └─ sdkGameLoadingStop()

3. Player Clicks Play
   └─ gameplayStart()
   └─ [Actual gameplay]

4. Game Over
   └─ gameplayStop()
   └─ happyTime()
   └─ [Optional: requestMidgameAd()]

5. Restart
   └─ gameplayStart()
```

### Error Handling

All SDK functions handle errors gracefully:
- Never throw exceptions
- Continue game if SDK unavailable
- Log warnings to console
- Safe to call anytime

### Audio Management

```typescript
const showAd = async () => {
  const currentVolume = volume;

  await requestMidgameAd({
    adStarted: () => {
      setVolume(0); // Mute game
    },
    adFinished: () => {
      setVolume(currentVolume); // Restore
    },
    adError: () => {
      setVolume(currentVolume); // Restore
    }
  });
};
```

---

## Common Issues

### SDK Not Loading

**Problem:** `⚠️ CrazyGames SDK not found`

**Solutions:**
1. Check `index.html` includes SDK script:
   ```html
   <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
   ```

2. Verify script loads before React app
3. Check browser console for 404 errors
4. Clear cache and reload

### Ads Not Showing

**Problem:** Ads requested but not displayed

**Causes:**
- In development mode (expected)
- Adblock enabled
- Too frequent ad requests
- Game not approved yet

**Debug:**
```typescript
const hasAdblock = await checkAdblock();
console.log("Adblock:", hasAdblock);

const available = isCrazyGamesSDKAvailable();
console.log("SDK available:", available);
```

### TypeScript Errors

**Problem:** Type errors with SDK

**Solution:** Types are defined in `crazyGamesService.ts`
```typescript
// Correct import
import { requestMidgameAd, type AdCallbacks } from './services/crazyGamesService';
```

---

## Testing Checklist

### Local Development
- [x] SDK initializes without errors
- [x] Dev mode logs appear
- [x] All events trigger without crashes
- [x] Simulated ads resolve correctly

### Production Testing
- [ ] Deploy to CrazyGames test environment
- [ ] Verify SDK loads (check console)
- [ ] Test midgame ad at game over
- [ ] Test rewarded ad flow
- [ ] Verify happyTime triggers
- [ ] Check gameplay events fire correctly
- [ ] Test with/without adblock

### Edge Cases
- [ ] SDK fails to load (graceful fallback)
- [ ] Adblock enabled
- [ ] Slow connection
- [ ] Multiple quick ad requests
- [ ] Browser back button during ad

---

## Future Enhancements

### Potential Features

**Rewarded Continue:**
```typescript
// Watch ad to continue after crash
const offerContinue = async () => {
  const watched = await requestRewardedAd();
  if (watched) {
    restoreGameState();
    gameplayStart();
  } else {
    showGameOver();
  }
};
```

**Multiplayer Invites:**
```typescript
import { inviteLink } from './services/crazyGamesService';

const createRoom = () => {
  const roomId = generateRoomId();
  inviteLink(roomId);
};
```

**User Accounts:**
```typescript
const saveProgress = async () => {
  const token = await getUserToken();
  if (token) {
    // Save to CrazyGames cloud
  }
};
```

---

## Resources

- **CrazyGames SDK Docs:** https://docs.crazygames.com/sdk/
- **Developer Portal:** https://developer.crazygames.com/
- **SDK GitHub:** https://github.com/crazygames/crazygames-sdk-html5

---

## Support

**SDK Issues:**
- Check console for error messages
- Verify SDK version matches docs
- Test in incognito mode (no extensions)
- Contact CrazyGames support

**Game Rejection:**
Common reasons:
- Too many ads
- Poor user experience
- SDK not implemented
- Performance issues

---

**Last Updated:** 2025-11-25
**SDK Version:** v3
**Game:** Paper Plane Drift
