# Firebase Security Rules - Quick Reference

## Current Security Rules Status

### Firestore Rules Summary

#### ✅ What's Allowed
- **Read** (Anyone): View the leaderboard
- **Create** (Anyone with valid data): Submit scores that pass validation

#### ❌ What's Blocked
- **Update**: No one can modify existing scores
- **Delete**: No one can delete scores
- **Invalid Data**: Scores that don't pass validation are rejected

---

## Data Validation Rules

### High Score Document Structure
```javascript
{
  name: string,      // Player name
  score: number,     // Game score
  grade: string,     // Teacher's grade
  timestamp: Timestamp  // When submitted
}
```

### Field Validation

| Field | Type | Rules | Examples |
|-------|------|-------|----------|
| **name** | `string` | • 1-15 characters<br>• Alphanumeric only<br>• Can include: spaces, `-`, `_` | ✅ `Player1`<br>✅ `John Doe`<br>✅ `pro_gamer`<br>❌ `@hacker!`<br>❌ `ThisNameIsTooLong` |
| **score** | `number` | • 0 to 999,999<br>• Must be integer<br>• No negatives | ✅ `0`<br>✅ `1500`<br>✅ `999999`<br>❌ `-100`<br>❌ `1000000` |
| **grade** | `string` | • Max 5 chars<br>• Format: `[A-F][+-]?`<br>• Valid grades only | ✅ `A+`<br>✅ `B`<br>✅ `C-`<br>✅ `F`<br>❌ `Z`<br>❌ `A++` |
| **timestamp** | `Timestamp` | • Cannot be future<br>• Within last 5 min<br>• Auto-generated | ✅ `Timestamp.now()`<br>❌ Future dates<br>❌ Old dates |

---

## Testing Checklist

### ✅ Should Pass
```javascript
// Valid submission
{
  name: "Player1",
  score: 1000,
  grade: "A+",
  timestamp: Timestamp.now()
}
```

### ❌ Should Fail

```javascript
// Name too long
{ name: "ThisNameIsWayTooLong", score: 100, grade: "A", timestamp: Timestamp.now() }

// Invalid characters
{ name: "Player@123!", score: 100, grade: "A", timestamp: Timestamp.now() }

// Score too high
{ name: "Player1", score: 9999999, grade: "A", timestamp: Timestamp.now() }

// Negative score
{ name: "Player1", score: -100, grade: "A", timestamp: Timestamp.now() }

// Invalid grade
{ name: "Player1", score: 100, grade: "Z", timestamp: Timestamp.now() }

// Future timestamp
{ name: "Player1", score: 100, grade: "A", timestamp: Timestamp.fromMillis(Date.now() + 10000) }

// Missing field
{ name: "Player1", score: 100, grade: "A" } // No timestamp

// Extra field
{ name: "Player1", score: 100, grade: "A", timestamp: Timestamp.now(), hacked: true }
```

---

## Common Issues & Solutions

### Issue: "Permission Denied"
**Cause**: Data doesn't pass validation
**Solution**: Check all fields match validation rules above

### Issue: Timestamp validation fails
**Cause**: Timestamp is not recent enough
**Solution**: Use `Timestamp.now()` right before submission

### Issue: Name rejected
**Cause**: Contains special characters
**Solution**: Use only letters, numbers, spaces, hyphens, underscores

### Issue: Score rejected
**Cause**: Score exceeds maximum or is negative
**Solution**: Ensure score is between 0 and 999,999

---

## Rate Limiting

**Current Status**: Basic placeholder (always allows)
**Recommended**: Implement Cloud Functions for proper rate limiting

### Suggested Implementation:
```javascript
// Cloud Function
exports.rateLimitScores = functions.firestore
  .document('highscores/{scoreId}')
  .onCreate(async (snap, context) => {
    // Check recent submissions from same source
    // Delete if rate limit exceeded
  });
```

---

## Security Monitoring

### Firebase Console Checks
1. Go to Firestore → Rules tab
2. Check for denied requests
3. Review patterns of failures
4. Look for suspicious activity

### Key Metrics to Monitor
- Number of denied write attempts
- Patterns in rejected data
- Unusual score submissions
- High-frequency submissions

---

## Updating Rules

### Deployment Commands
```bash
# Test locally first
firebase emulators:start

# Deploy to production
firebase deploy --only firestore:rules

# Or use npm script
npm run firebase:deploy:rules
```

### Testing New Rules
```bash
# Start emulator
npm run firebase:emulators

# Update rules in firestore.rules
# Test in emulator
# Then deploy to production
```

---

## Emergency Procedures

### If Spam/Abuse Detected
1. **Immediate**: Add IP-based rate limiting in Cloud Functions
2. **Short-term**: Temporarily disable writes:
   ```javascript
   match /highscores/{scoreId} {
     allow read: if true;
     allow create: if false; // Temporarily disable
   }
   ```
3. **Long-term**: Implement proper authentication

### If Data Breach Suspected
1. Review Firebase Console audit logs
2. Check for unauthorized rule changes
3. Rotate API keys if needed
4. Review recent submissions in Firestore

---

## Compliance Notes

### GDPR Considerations
- Leaderboard data is public by design
- Players should be aware names are publicly visible
- Consider adding privacy policy link
- Allow users to request data deletion

### Data Retention
- Consider implementing TTL on old scores
- Archive historical data after certain period
- Use Cloud Functions for automatic cleanup

---

## Advanced: Custom Validation Functions

### Add More Validators
```javascript
// In firestore.rules
function isNotProfane(text) {
  // Add profanity filter
  return !text.matches('.*(bad|word|list).*');
}

function isRealisticScore(score, timestamp) {
  // Check if score is reasonable for time played
  return score < (timestamp - gameStartTime) * 100;
}
```

---

## Quick Deploy Commands

```bash
# Deploy everything
npm run firebase:deploy

# Deploy only rules
npm run firebase:deploy:rules

# Test in emulator
npm run firebase:emulators
```

---

## Support & Resources

- **Firebase Security Rules Docs**: https://firebase.google.com/docs/rules
- **Firestore Security**: https://firebase.google.com/docs/firestore/security/get-started
- **Best Practices**: https://firebase.google.com/docs/rules/rules-behavior

---

**Last Updated**: 2025-11-25
**Rules Version**: 1.0
**Project**: paper-plane-drift
