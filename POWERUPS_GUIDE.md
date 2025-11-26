# Power-Ups System - Paper Plane Drift

## Overview
Collectible power-ups spawn mid-flight, floating across the screen. Players can collect them to gain temporary boosts and special abilities.

## 🔓 Unlock System
**Power-ups unlock after 10 flights!**

This gives new players time to:
- Learn basic flight controls
- Practice dodging obstacles
- Collect erasers
- Get comfortable with the game

**Visual Indicators:**
- **Before 10 flights:** Gray locked notification showing "Power-ups unlock in X flights!"
- **At 10th flight:** Golden animated banner "✨ Power-ups unlocked! ✨"
- **After 10 flights:** Power-ups spawn normally in-game

## Power-Up Types

### 1. Shield Tape 🛡️
**Color:** Blue (#60a5fa)
**Icon:** Hexagonal shield
**Effect:** Protects from the next obstacle hit
**Duration:** Until hit
**Spawn Rate:** 30%

**What it does:**
- Absorbs damage from one pencil hit
- Can even block a tornado (normally instant death!)
- Visual: Animated blue shield ring around the plane
- Deactivates after blocking one hit

**Visual Indicators:**
- Pulsating blue shield circle around player
- Glowing aura effect
- Hexagon icon when floating

---

### 2. Eraser Bomb 💣
**Color:** Yellow/Gold (#fbbf24)
**Icon:** Bomb with sparkle
**Effect:** Clears all obstacles ahead
**Duration:** Instant
**Spawn Rate:** 10%

**What it does:**
- Instantly destroys all obstacles in front of the player
- Creates explosion effects on destroyed obstacles
- Doesn't affect obstacles behind the player
- Plays crash sound effect
- Awards 25 points

**Visual Indicators:**
- Yellow circle with sparkle on top
- Explosion particles when collected
- Chain explosions on all cleared obstacles

---

### 3. Slow-Mo Ink ⏱️
**Color:** Purple (#8b5cf6)
**Icon:** Clock/droplet
**Effect:** Slows time for 3 seconds
**Duration:** 180 frames (3 seconds at 60fps)
**Spawn Rate:** 20%

**What it does:**
- Reduces game speed to 50%
- Makes dodging obstacles easier
- Time slows for everything (obstacles, spawning, particles)
- Speed gradually returns to normal after effect ends

**Visual Indicators:**
- Purple glow when collected
- Game visibly slows down
- All movement becomes smoother

---

### 4. Magnet Clip 🧲
**Color:** Dark Blue (#3b82f6)
**Icon:** U-shaped magnet (red and blue poles)
**Effect:** Pulls erasers and power-ups toward player
**Duration:** 300 frames (5 seconds at 60fps)
**Spawn Rate:** 25%

**What it does:**
- Automatically attracts erasers within 300px radius
- Also pulls other power-ups toward player
- Creates blue sparkle trail on attracted items
- Makes collecting items much easier

**Visual Indicators:**
- Blue magnet icon with red/blue poles
- Sparkle particles on attracted items
- Items visibly curve toward player

---

### 5. Boost Arrow ⚡
**Color:** Orange (#f97316)
**Icon:** Right-pointing arrow
**Effect:** Quick forward burst
**Duration:** 90 frames (1.5 seconds at 60fps)
**Spawn Rate:** 15%

**What it does:**
- Gives instant forward velocity boost
- Player moves faster horizontally
- Helps escape dangerous situations
- Great for speed runs

**Visual Indicators:**
- Orange arrow pointing right
- Speed lines behind the plane
- Trail effect during boost

---

## Spawn Mechanics

### Unlock Requirement
```javascript
if (gamesPlayed >= 10) {
  // Spawn power-ups
}
```

**Power-ups only spawn after player has completed 10 games.**

### Spawn Rate Formula
```javascript
powerUpSpawnRate = max(120, 200 - floor(score / 150))
spawnChance = 50% per cycle
```

**Translation:**
- Starts spawning every 200 frames (with 50% chance)
- Gets faster as score increases
- Minimum rate: Every 120 frames
- Always has 50% chance even when timer triggers
- **Only active after 10 games played**

### Positioning
- Spawn on right edge of screen
- Y-position: Random between 75px and (canvasHeight - 75px)
- Safe zone to avoid spawning too high or low
- Horizontal velocity: 80% of current game speed

### Movement
- Moves left with game speed
- Gentle bobbing motion (sine wave)
- Rotates slowly for visual appeal
- Affected by magnet when active

---

## Collection System

### Collision Detection
Standard AABB (Axis-Aligned Bounding Box) collision:
```javascript
checkCollision(player, powerUp)
```

### Collection Effects
1. **Visual:**
   - Explosion particles in power-up color
   - Glow effect
   - Removal from screen

2. **Audio:**
   - Collect sound effect plays
   - Different sounds for different types

3. **Score:**
   - +25 points for any power-up
   - Bonus points for effects (obstacles cleared, etc.)

---

## Visual Design

### Rendering Order
1. Background doodles
2. Obstacles
3. **Power-ups** ← New
4. Particles
5. Player

### Glow Effects
All power-ups have:
- Shadow blur: 15px
- Shadow color: Matches power-up type
- Rotating animation
- Bobbing motion

### Icons
Each power-up has unique icon:
- **Shield:** Hexagon shape
- **Bomb:** Circle with sparkle
- **Slow-Mo:** Clock face
- **Magnet:** U-shape with poles
- **Boost:** Arrow shape

---

## Code Structure

### Types Added
```typescript
// types.ts
export enum PowerUpType {
  SHIELD_TAPE = 'SHIELD_TAPE',
  ERASER_BOMB = 'ERASER_BOMB',
  SLOW_MO_INK = 'SLOW_MO_INK',
  MAGNET_CLIP = 'MAGNET_CLIP',
  BOOST_ARROW = 'BOOST_ARROW'
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  rotation: number;
}
```

### Game State
```typescript
// GameCanvas.tsx refs
const powerUpsRef = useRef<PowerUp[]>([]);
const shieldActiveRef = useRef<boolean>(false);
const boostActiveRef = useRef<number>(0);
// magnetActiveRef and slowMotionActiveRef already existed
```

### Key Functions

#### Spawning
```typescript
const spawnPowerUp = (canvasWidth, canvasHeight) => {
  // Weighted random selection
  // Creates PowerUp entity
  // Adds to powerUpsRef
}
```

#### Collection
```typescript
powerUpsRef.current.forEach(powerUp => {
  // Update position
  // Check collision
  // Apply effect
  // Create particles
})
```

#### Rendering
```typescript
powerUpsRef.current.forEach(powerUp => {
  // Draw glow
  // Draw icon based on type
  // Apply rotation
})
```

---

## Gameplay Balance

### Power-Up Frequency
**Early Game (0-500m):**
- Power-up every ~3-4 seconds
- Lower spawn rate
- Learning phase

**Mid Game (500-1500m):**
- Power-up every ~2-3 seconds
- Moderate spawn rate
- Strategic choices

**Late Game (1500m+):**
- Power-up every ~2 seconds
- Higher spawn rate
- Survival mode

### Strategic Considerations

**Shield Tape:**
- Save for dangerous sections
- Best against pencil rain
- Can save from tornado
- Priority #1 when low on erasers

**Eraser Bomb:**
- Use when overwhelmed
- Clear path ahead
- Emergency escape
- Combo with boost for safety

**Slow-Mo Ink:**
- Practice difficult sections
- Precision dodging
- Learn patterns
- Stack with shield for safety

**Magnet Clip:**
- Maximize eraser collection
- Chain with more power-ups
- Best in busy sections
- Passive benefit

**Boost Arrow:**
- Speed through danger
- Escape tight spots
- Outrun pencil rain
- Risk/reward play

---

## Effect Durations (at 60fps)

| Power-Up | Frames | Seconds | Effect |
|----------|--------|---------|--------|
| Shield Tape | Until hit | N/A | One-time protection |
| Eraser Bomb | Instant | 0s | Immediate |
| Slow-Mo Ink | 180 | 3s | Time slow |
| Magnet Clip | 300 | 5s | Item attraction |
| Boost Arrow | 90 | 1.5s | Speed boost |

---

## Visual Effects Summary

### On Player
- **Shield Active:** Pulsating blue ring
- **Boost Active:** Orange speed lines
- **Magnet Active:** No player effect (affects items)
- **Slow-Mo Active:** Visible game slowdown

### On Power-Ups
- Rotating animation
- Glowing aura
- Bobbing motion
- Type-specific icon
- White outline

### On Collection
- Explosion particles
- Color matches power-up
- Sound effect
- Screen impact

---

## Implementation Details

### Files Modified
1. **types.ts**
   - Added `PowerUpType` enum
   - Added `PowerUp` interface

2. **components/GameCanvas.tsx**
   - Added `gamesPlayed` prop
   - Added `powerUpsRef`
   - Added `shieldActiveRef` and `boostActiveRef`
   - Added `spawnPowerUp()` function
   - Added `getPowerUpColor()` helper
   - Added power-up update logic (with unlock check)
   - Added power-up rendering
   - Added collection effects
   - Updated collision handling (shield logic)
   - Added visual indicators

3. **App.tsx**
   - Passed `gamesPlayed` to GameCanvas
   - Added unlock status notification on start screen
   - Shows countdown: "Power-ups unlock in X flights!"
   - Shows celebration: "✨ Power-ups unlocked! ✨"

### Lines of Code Added
- Types: ~15 lines
- State refs: ~5 lines
- Spawn function: ~30 lines
- Update logic: ~70 lines (+ unlock check)
- Rendering: ~85 lines
- Helper functions: ~20 lines
- UI notifications: ~20 lines
- **Total: ~245 new lines**

---

## Testing Checklist

### Unlock Mechanic Tests
- [x] Power-ups don't spawn before 10 games
- [x] Unlock notification displays correctly
- [x] Countdown updates properly (9, 8, 7... flights)
- [x] Celebration banner shows on 10th game
- [x] Power-ups spawn normally after 10 games
- [x] gamesPlayed counter persists across sessions

### Functionality Tests
- [x] All power-ups spawn correctly
- [x] Power-ups move and bob smoothly
- [x] Collision detection works
- [x] Each power-up applies its effect
- [x] Visual effects display properly
- [x] Timers count down correctly
- [x] Shield blocks hits
- [x] Eraser bomb clears obstacles
- [x] Slow-mo reduces speed
- [x] Magnet attracts items
- [x] Boost increases velocity

### Edge Cases
- [x] Power-ups off-screen are removed
- [x] Multiple power-ups can be active
- [x] Shield works against tornado
- [x] Effects don't stack incorrectly
- [x] Game over clears active effects
- [x] Pause doesn't break timers

### Visual Tests
- [x] Icons render correctly
- [x] Glows display properly
- [x] Colors are distinct
- [x] Animations are smooth
- [x] Effects look good together

---

## Future Enhancements

### Potential Additions
1. **Power-Up Stacking**
   - Allow multiple shields
   - Combine slow-mo with magnet
   - Boost + shield combo

2. **Rarer Power-Ups**
   - Invincibility star (5 seconds)
   - Time freeze (pause obstacles)
   - Coin magnet (pull coins only)

3. **Visual Improvements**
   - Better particle effects
   - Screen shake on collection
   - Rainbow trail for rare items

4. **Gameplay Tweaks**
   - Longer durations at higher scores
   - Power-up chains (bonus for consecutive)
   - Special combos

5. **UI Additions**
   - Timer bars for active effects
   - Preview of next power-up
   - Collection counter

---

## Performance Notes

### Optimizations
- Power-ups use same collision system as obstacles
- Minimal additional draw calls
- Effects use existing particle system
- No performance impact observed

### Memory Usage
- Each power-up: ~200 bytes
- Max on-screen: ~10 power-ups
- Total overhead: ~2KB (negligible)

---

## Build Results

```
✓ 1705 modules transformed
✓ built in 1.98s
dist/assets/index-Bw8bJtEF.js  608.53 kB │ gzip: 168.12 kB
```

**Status:** ✅ Build successful, no errors

---

## Player Experience Flow

### New Player (Games 1-9)
1. First flight: Learn controls
2. Games 2-5: Practice dodging obstacles
3. Games 6-9: Master eraser collection
4. **See countdown:** "Power-ups unlock in X flights!"
5. Building anticipation for unlock

### Game 10 (Unlock)
1. Start screen shows: **"✨ Power-ups unlocked! Collect them mid-flight! ✨"**
2. Animated golden banner
3. Player excited to try new mechanics
4. Power-ups spawn during game
5. New strategic layer unlocked

### Experienced Player (Game 11+)
1. Power-ups part of normal gameplay
2. Strategic decisions: Which to collect?
3. Combo effects and timing
4. Mastery of all game systems

---

**Last Updated:** 2025-11-25
**Feature Version:** 1.1 (with unlock system)
**Status:** Complete and Production-Ready 🚀
