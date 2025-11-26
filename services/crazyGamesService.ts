// CrazyGames SDK Integration
// Documentation: https://docs.crazygames.com/sdk/

export interface CrazyGamesUser {
  userId: string;
  username: string;
  profilePictureUrl: string;
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        game: {
          sdkGameLoadingStart: () => void;
          sdkGameLoadingStop: () => void;
          gameplayStart: () => void;
          gameplayStop: () => void;
          happyTime: () => void;
          inviteLink: (params: { roomId: string }) => void;
        };
        ad: {
          requestAd: (type: 'midgame' | 'rewarded', callbacks?: {
            adStarted?: () => void;
            adFinished?: () => void;
            adError?: (error: any) => void;
          }) => void;
          hasAdblock: () => Promise<boolean>;
        };
        banner: {
          requestBanner: (options: any) => void;
          clearBanner: () => void;
          clearAllBanners: () => void;
        };
        user: {
          getUser: () => Promise<CrazyGamesUser | null>;
          getUserToken: () => Promise<string | null>;
          showAuthPrompt: () => Promise<any>;
          showAccountLinkPrompt: () => Promise<any>;
        };
      };
    };
  }
}

interface CrazyGamesSDK {
  game: any;
  ad: any;
  banner: any;
  user: any;
}

let crazyGamesSdk: CrazyGamesSDK | null = null;
let isInitialized = false;
let isInDevelopment = false;

// Check if running in development mode
const checkDevelopmentMode = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
};

export const initCrazyGames = async (): Promise<boolean> => {
  if (isInitialized) {
    console.log("CrazyGames SDK already initialized");
    return true;
  }

  isInDevelopment = checkDevelopmentMode();

  if (isInDevelopment) {
    console.log("🎮 Development Mode: CrazyGames SDK calls will be simulated");
    isInitialized = true;
    return true;
  }

  // Retry mechanism to wait for the script to load
  let retries = 0;
  const maxRetries = 30; // 3 seconds total

  while (!window.CrazyGames?.SDK && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (window.CrazyGames?.SDK) {
    crazyGamesSdk = window.CrazyGames.SDK;
    isInitialized = true;
    console.log("✅ CrazyGames SDK Initialized Successfully");
    return true;
  } else {
    console.warn("⚠️ CrazyGames SDK not found - continuing without SDK features");
    isInitialized = true; // Still mark as initialized to prevent retries
    return false;
  }
};

// Helper function to check if SDK is available
export const isCrazyGamesSDKAvailable = (): boolean => {
  return !isInDevelopment && crazyGamesSdk !== null;
};

// Game Loading Events
export const sdkGameLoadingStart = () => {
  try {
    if (isInDevelopment) {
      console.log("🎮 [DEV] SDK: Game loading started");
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.sdkGameLoadingStart();
      console.log("📊 CG SDK: Loading started");
    }
  } catch (e) {
    console.warn("CG SDK Error (LoadingStart):", e);
  }
};

export const sdkGameLoadingStop = () => {
  try {
    if (isInDevelopment) {
      console.log("🎮 [DEV] SDK: Game loading stopped");
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.sdkGameLoadingStop();
      console.log("📊 CG SDK: Loading stopped");
    }
  } catch (e) {
    console.warn("CG SDK Error (LoadingStop):", e);
  }
};

// Gameplay Events
export const gameplayStart = () => {
  try {
    if (isInDevelopment) {
      console.log("🎮 [DEV] SDK: Gameplay started");
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.gameplayStart();
      console.log("🎮 CG SDK: Gameplay started");
    }
  } catch (e) {
    console.warn("CG SDK Error (GameplayStart):", e);
  }
};

export const gameplayStop = () => {
  try {
    if (isInDevelopment) {
      console.log("🎮 [DEV] SDK: Gameplay stopped");
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.gameplayStop();
      console.log("🎮 CG SDK: Gameplay stopped");
    }
  } catch (e) {
    console.warn("CG SDK Error (GameplayStop):", e);
  }
};

// Happy Time Event (for celebrations, achievements, etc.)
export const happyTime = () => {
  try {
    if (isInDevelopment) {
      console.log("🎉 [DEV] SDK: Happy time!");
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.happyTime(); // Note: capital T in Time
      console.log("🎉 CG SDK: Happy time triggered");
    }
  } catch (e) {
    console.warn("CG SDK Error (HappyTime):", e);
  }
};

// Invite Link (for multiplayer games)
export const inviteLink = (roomId: string) => {
  try {
    if (isInDevelopment) {
      console.log("🔗 [DEV] SDK: Invite link for room:", roomId);
      return;
    }
    if (crazyGamesSdk?.game) {
      crazyGamesSdk.game.inviteLink({ roomId });
      console.log("🔗 CG SDK: Invite link created");
    }
  } catch (e) {
    console.warn("CG SDK Error (InviteLink):", e);
  }
};

// Advertisement Functions
export interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: any) => void;
}

export const requestMidgameAd = (callbacks?: AdCallbacks): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (isInDevelopment) {
        console.log("📺 [DEV] SDK: Midgame ad requested");
        callbacks?.adStarted?.();
        setTimeout(() => {
          callbacks?.adFinished?.();
          resolve(true);
        }, 1000);
        return;
      }

      if (!crazyGamesSdk?.ad) {
        console.warn("CG SDK: Ad module not available");
        callbacks?.adError?.({ message: "SDK not available" });
        resolve(false);
        return;
      }

      crazyGamesSdk.ad.requestAd('midgame', {
        adStarted: () => {
          console.log("📺 CG SDK: Midgame ad started");
          callbacks?.adStarted?.();
        },
        adFinished: () => {
          console.log("📺 CG SDK: Midgame ad finished");
          callbacks?.adFinished?.();
          resolve(true);
        },
        adError: (error: any) => {
          console.warn("📺 CG SDK: Midgame ad error:", error);
          callbacks?.adError?.(error);
          resolve(false);
        }
      });
    } catch (e) {
      console.warn("CG SDK Error (MidgameAd):", e);
      callbacks?.adError?.(e);
      resolve(false);
    }
  });
};

export const requestRewardedAd = (callbacks?: AdCallbacks): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (isInDevelopment) {
        console.log("🎁 [DEV] SDK: Rewarded ad requested");
        callbacks?.adStarted?.();
        setTimeout(() => {
          callbacks?.adFinished?.();
          resolve(true);
        }, 2000);
        return;
      }

      if (!crazyGamesSdk?.ad) {
        console.warn("CG SDK: Ad module not available");
        callbacks?.adError?.({ message: "SDK not available" });
        resolve(false);
        return;
      }

      crazyGamesSdk.ad.requestAd('rewarded', {
        adStarted: () => {
          console.log("🎁 CG SDK: Rewarded ad started");
          callbacks?.adStarted?.();
        },
        adFinished: () => {
          console.log("🎁 CG SDK: Rewarded ad finished");
          callbacks?.adFinished?.();
          resolve(true);
        },
        adError: (error: any) => {
          console.warn("🎁 CG SDK: Rewarded ad error:", error);
          callbacks?.adError?.(error);
          resolve(false);
        }
      });
    } catch (e) {
      console.warn("CG SDK Error (RewardedAd):", e);
      callbacks?.adError?.(e);
      resolve(false);
    }
  });
};

// Check if user has adblock
export const checkAdblock = async (): Promise<boolean> => {
  try {
    if (isInDevelopment) {
      console.log("🛡️ [DEV] SDK: Adblock check - false");
      return false;
    }
    if (crazyGamesSdk?.ad?.hasAdblock) {
      const hasAdblock = await crazyGamesSdk.ad.hasAdblock();
      console.log("🛡️ CG SDK: Adblock detected:", hasAdblock);
      return hasAdblock;
    }
    return false;
  } catch (e) {
    console.warn("CG SDK Error (Adblock check):", e);
    return false;
  }
};

// Banner Ads
export const requestBanner = (options: any = {}) => {
  try {
    if (isInDevelopment) {
      console.log("📱 [DEV] SDK: Banner requested", options);
      return;
    }
    if (crazyGamesSdk?.banner) {
      crazyGamesSdk.banner.requestBanner(options);
      console.log("📱 CG SDK: Banner requested");
    }
  } catch (e) {
    console.warn("CG SDK Error (Banner):", e);
  }
};

export const clearBanner = () => {
  try {
    if (isInDevelopment) {
      console.log("📱 [DEV] SDK: Banner cleared");
      return;
    }
    if (crazyGamesSdk?.banner) {
      crazyGamesSdk.banner.clearBanner();
      console.log("📱 CG SDK: Banner cleared");
    }
  } catch (e) {
    console.warn("CG SDK Error (Clear Banner):", e);
  }
};

export const clearAllBanners = () => {
  try {
    if (isInDevelopment) {
      console.log("📱 [DEV] SDK: All banners cleared");
      return;
    }
    if (crazyGamesSdk?.banner) {
      crazyGamesSdk.banner.clearAllBanners();
      console.log("📱 CG SDK: All banners cleared");
    }
  } catch (e) {
    console.warn("CG SDK Error (Clear All Banners):", e);
  }
};

// User Authentication
export const getUserToken = async (): Promise<string | null> => {
  try {
    if (isInDevelopment) {
      console.log("👤 [DEV] SDK: Get user token - null");
      return null;
    }
    if (crazyGamesSdk?.user?.getUserToken) {
      const token = await crazyGamesSdk.user.getUserToken();
      console.log("👤 CG SDK: User token retrieved");
      return token;
    }
    return null;
  } catch (e) {
    console.warn("CG SDK Error (Get User Token):", e);
    return null;
  }
};

export const showAuthPrompt = async (): Promise<any> => {
  try {
    if (isInDevelopment) {
      console.log("👤 [DEV] SDK: Auth prompt - simulating successful login");
      // Simulate successful authentication in development
      return { success: true };
    }
    if (crazyGamesSdk?.user?.showAuthPrompt) {
      const result = await crazyGamesSdk.user.showAuthPrompt();
      console.log("👤 CG SDK: Auth prompt shown");
      return result;
    }
    return null;
  } catch (e) {
    console.warn("CG SDK Error (Auth Prompt):", e);
    return null;
  }
};

export const getUser = async (): Promise<CrazyGamesUser | null> => {
  try {
    if (isInDevelopment) {
      // Return mock user in development
      const mockUser: CrazyGamesUser = {
        userId: "dev_user_123",
        username: "DevPlayer",
        profilePictureUrl: ""
      };
      console.log("👤 [DEV] SDK: Get user - mock user returned", mockUser);
      return mockUser;
    }
    if (crazyGamesSdk?.user?.getUser) {
      const user = await crazyGamesSdk.user.getUser();
      console.log("👤 CG SDK: User retrieved", user);
      return user;
    }
    return null;
  } catch (e) {
    console.warn("CG SDK Error (Get User):", e);
    return null;
  }
};
