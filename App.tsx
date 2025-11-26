import React, { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Eraser, AlertTriangle, Volume2, VolumeX, Pause, Trophy, Save, Edit2, ChevronLeft, ChevronRight, Lock, ShoppingBag, Coins } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import SDKDebugPanel from './components/SDKDebugPanel';
import Shop from './components/Shop';
import { GameState, GameReport, PlaneSkin } from './types';
import { PlayerProgress, PlayerUpgrades, PlayerInventory, UpgradeType, ConsumableType, UPGRADES, CONSUMABLES, calculateUpgradeCost } from './types/shop';
import { getTeacherReport } from './services/geminiService';
import { getMusicManager, updateGlobalAudio } from './utils/sound';
import { getLeaderboard, saveHighScore, HighScore } from './services/firebaseService';
import { initCrazyGames, sdkGameLoadingStart, sdkGameLoadingStop, gameplayStart, gameplayStop, happyTime, getUser, showAuthPrompt, CrazyGamesUser } from './services/crazyGamesService';

const SKINS = [
  { id: PlaneSkin.DEFAULT, name: 'Notebook', color: 'bg-gray-100' },
  { id: PlaneSkin.NEWSPAPER, name: 'Daily News', color: 'bg-stone-200' },
  { id: PlaneSkin.FOIL, name: 'Aluminium', color: 'bg-slate-300' },
  { id: PlaneSkin.COMIC, name: 'Kapow!', color: 'bg-cyan-200' },
  { id: PlaneSkin.CRANE, name: 'Origami Crane', color: 'bg-red-100' },
  { id: PlaneSkin.GOLD, name: 'Secret Gold', color: 'bg-yellow-200 border-yellow-400' },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [eraserCount, setEraserCount] = useState(0);
  const eraserCountRef = useRef(0);
  
  // Skin State
  const [selectedSkin, setSelectedSkin] = useState<PlaneSkin>(PlaneSkin.DEFAULT);
  
  // Music & Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);

  // Report Card State
  const [report, setReport] = useState<GameReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // CrazyGames User State
  const [cgUser, setCgUser] = useState<CrazyGamesUser | null>(null);

  // Personal High Score State
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // SDK State
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [showSDKDebug, setShowSDKDebug] = useState(false);

  const [gameResetKey, setGameResetKey] = useState(0);

  // Shop & Upgrade State
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>({
    coins: 0,
    totalCoinsEarned: 0,
    upgrades: {
      [UpgradeType.SPEED]: 0,
      [UpgradeType.STABILITY]: 0,
      [UpgradeType.WIND_RESISTANCE]: 0,
      [UpgradeType.SHIELD_CAPACITY]: 0
    },
    inventory: {
      [ConsumableType.MAGNET]: 0,
      [ConsumableType.SLOW_MOTION]: 0,
      [ConsumableType.ERASER_BOMB]: 0
    },
    gamesPlayed: 0,
    bestScore: personalBest
  });
  const [showShop, setShowShop] = useState(false);
  const [coinsEarnedThisGame, setCoinsEarnedThisGame] = useState(0);

  // Initialize CrazyGames SDK
  useEffect(() => {
    const initSDK = async () => {
      console.log("🎮 Initializing CrazyGames SDK...");
      sdkGameLoadingStart();

      const success = await initCrazyGames();
      setSdkInitialized(success);

      if (success) {
        console.log("✅ SDK initialized successfully");

        // Get user info from CrazyGames SDK
        const user = await getUser();
        if (user) {
          setCgUser(user);
          console.log("👤 User retrieved:", user.username);
        } else {
          console.log("👤 No user logged in");
        }
      } else {
        console.warn("⚠️ SDK unavailable, continuing without SDK features");
      }

      // Simulate resource loading or wait for actual assets
      setTimeout(() => {
        sdkGameLoadingStop();
      }, 500);
    };
    initSDK();
  }, []);

  // Load personal best and progress from local storage
  useEffect(() => {
    const savedBest = localStorage.getItem('paperPlanePersonalBest');
    if (savedBest) {
      setPersonalBest(parseInt(savedBest, 10));
    }

    const savedProgress = localStorage.getItem('paperPlaneProgress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setPlayerProgress(progress);
      } catch (e) {
        console.error("Failed to load player progress:", e);
      }
    }
  }, []);

  // Save player progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('paperPlaneProgress', JSON.stringify(playerProgress));
  }, [playerProgress]);

  // Handle Audio State (Volume/Mute)
  useEffect(() => {
    // Updates the global master gain, affecting both SFX and Music
    updateGlobalAudio(volume, isMuted);
  }, [volume, isMuted]);

  // Handle Music Playback based on GameState
  useEffect(() => {
    const music = getMusicManager();

    if (gameState === GameState.PLAYING) {
      music.play();
    } else {
      music.pause();
    }
  }, [gameState]);

  // Handle Global Keys (Escape to Pause, Ctrl+Shift+D for Debug)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle SDK Debug Panel with Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setShowSDKDebug(prev => !prev);
        return;
      }

      // Escape to pause/resume
      if (e.code === 'Escape') {
        if (gameState === GameState.PLAYING) {
           gameplayStop();
           setGameState(GameState.PAUSED);
        } else if (gameState === GameState.PAUSED) {
           gameplayStart();
           setGameState(GameState.PLAYING);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
      gameplayStop();
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      gameplayStart();
      setGameState(GameState.PLAYING);
    }
  };

  const fetchLeaderboard = async () => {
    const scores = await getLeaderboard(5);
    setLeaderboard(scores);
  };

  const handleGameOver = async (finalScore: number, distance: number, cause: string) => {
    gameplayStop();
    happyTime(); // Celebration event for CG SDK
    setGameState(GameState.GAME_OVER);
    setLoadingReport(true);
    setScoreSubmitted(false); // Reset submit state
    fetchLeaderboard(); // Fetch current high scores

    // Calculate coins earned (1 coin per 10m distance)
    const coinsEarned = Math.floor(finalScore / 10);
    setCoinsEarnedThisGame(coinsEarned);

    // Update player progress
    setPlayerProgress(prev => ({
      ...prev,
      coins: prev.coins + coinsEarned,
      totalCoinsEarned: prev.totalCoinsEarned + coinsEarned,
      gamesPlayed: prev.gamesPlayed + 1,
      bestScore: Math.max(prev.bestScore, finalScore)
    }));

    // Check and update personal best
    const isNewBest = finalScore > personalBest;
    setIsNewRecord(isNewBest);
    if (isNewBest) {
      setPersonalBest(finalScore);
      localStorage.setItem('paperPlanePersonalBest', finalScore.toString());
    }

    try {
      // Simulate "Thinking" delay or actually fetch
      const result = await getTeacherReport(finalScore, distance, cause);
      setReport(result);

      // Auto-Save High Score if user is logged in via CrazyGames
      if (cgUser && cgUser.userId) {
        setIsSubmittingScore(true);
        await saveHighScore(cgUser.userId, cgUser.username, finalScore, result.grade);
        await fetchLeaderboard();
        setScoreSubmitted(true);
        setIsSubmittingScore(false);
      }

    } catch (e) {
      setReport({ grade: "F-", comment: "The dog ate your report card." });
    } finally {
      setLoadingReport(false);
    }
  };


  const handleLogin = async () => {
    try {
      const result = await showAuthPrompt();
      if (result) {
        // Refresh user data after login
        const user = await getUser();
        if (user) {
          setCgUser(user);
          console.log("👤 User logged in:", user.username);

          // If we have a score and haven't saved it yet, save it now
          if (score > 0 && !scoreSubmitted && report) {
            setIsSubmittingScore(true);
            await saveHighScore(user.userId, user.username, score, report.grade);
            await fetchLeaderboard();
            setScoreSubmitted(true);
            setIsSubmittingScore(false);
          }
        }
      }
    } catch (e) {
      console.error("Login error:", e);
    }
  };

 const restartGame = () => {
  setReport(null);
  setGameState(GameState.START);
  setScoreSubmitted(false);
  setIsNewRecord(false);
  setCoinsEarnedThisGame(0);

  // NEW: Reset main gameplay counters
  setScore(0);
  setEraserCount(0);
  eraserCountRef.current = 0;

  // You MUST trigger GameCanvas internal reset
  // Add a "resetKey" so GameCanvas fully re-mounts
  setGameResetKey(prev => prev + 1);
};
  const startGame = () => {
    // Ensure Audio Context is resumed on user gesture
    getMusicManager().play();
    gameplayStart();
    setGameState(GameState.PLAYING);
  };

  const handlePurchaseUpgrade = (upgradeId: UpgradeType) => {
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = playerProgress.upgrades[upgradeId];
    const cost = calculateUpgradeCost(upgrade, currentLevel);

    if (currentLevel >= upgrade.maxLevel || playerProgress.coins < cost) {
      return; // Can't upgrade
    }

    setPlayerProgress(prev => ({
      ...prev,
      coins: prev.coins - cost,
      upgrades: {
        ...prev.upgrades,
        [upgradeId]: currentLevel + 1
      }
    }));
  };

  const handlePurchaseConsumable = (consumableId: ConsumableType) => {
    const consumable = CONSUMABLES[consumableId];

    if (playerProgress.coins < consumable.cost) {
      return; // Can't afford
    }

    setPlayerProgress(prev => ({
      ...prev,
      coins: prev.coins - consumable.cost,
      inventory: {
        ...prev.inventory,
        [consumableId]: prev.inventory[consumableId] + 1
      }
    }));
  };

  const handleUseConsumable = (consumableId: ConsumableType) => {
    setPlayerProgress(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [consumableId]: Math.max(0, prev.inventory[consumableId] - 1)
      }
    }));
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#fdfbf7] font-hand text-gray-800 select-none touch-none">
      
      {/* Custom Animations Style Block */}
      <style>{`
        @keyframes stamp {
          0% { opacity: 0; transform: scale(3) rotate(-15deg); filter: blur(2px); }
          40% { opacity: 1; transform: scale(0.8) rotate(3deg); filter: blur(0px); }
          60% { transform: scale(1.1) rotate(-2deg); }
          80% { transform: scale(0.95) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .animate-stamp {
          animation: stamp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9) rotate(-1deg); }
          100% { opacity: 1; transform: scale(1) rotate(-1deg); }
        }
        .animate-pop-in {
          animation: popIn 0.4s ease-out both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out both;
        }
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        .animate-shine {
          animation: shine 2s infinite linear;
        }
        @keyframes textShimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-score-shine {
          background: linear-gradient(90deg, #374151 0%, #374151 40%, #d97706 50%, #374151 60%, #374151 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmer 2.5s linear infinite;
          /* Fallback for browsers without text clip support */
          color: #374151;
        }
        /* Custom scrollbar for modals */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        /* Landscape mode optimization for small screens */
        @media screen and (max-height: 500px) and (orientation: landscape) {
          .modal-content {
            max-height: 95dvh !important;
            padding: 0.75rem !important;
          }
          .modal-title {
            font-size: 1.25rem !important;
            margin-bottom: 0.5rem !important;
          }
          .modal-section {
            margin-bottom: 0.75rem !important;
          }
        }
        /* Smooth scrolling for horizontal skin selector */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.2) rgba(0,0,0,0.05);
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        /* Improve touch targets */
        .touch-manipulation {
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        }
        /* Fade-in animation for personal best card */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px) rotate(1deg); }
          to { opacity: 1; transform: translateY(0) rotate(1deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out both;
        }
      `}</style>

      <GameCanvas
      key={gameResetKey}
        gameState={gameState}
        setGameState={setGameState}
        setScore={setScore}
        setEraserCount={setEraserCount}
        onGameOver={handleGameOver}
        eraserCountRef={eraserCountRef}
        skin={selectedSkin}
        upgrades={playerProgress.upgrades}
        inventory={playerProgress.inventory}
        onUseConsumable={handleUseConsumable}
        gamesPlayed={playerProgress.gamesPlayed}
      />

      {/* HUD - Score (Styled like a sticker) */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 flex gap-4 pointer-events-none z-30 transform rotate-1 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-xl md:text-2xl font-bold text-gray-700 bg-white p-2 px-3 sm:p-2 sm:px-4 rounded-sm border-2 border-gray-700 shadow-md whitespace-nowrap">
          <span className="text-gray-500 text-xs sm:text-sm md:text-lg uppercase tracking-wider hidden sm:inline">Score</span>
          <span className={`font-mono ${gameState === GameState.PLAYING ? 'animate-score-shine' : ''}`}>{score}</span>
        </div>
      </div>

      {/* HUD - Erasers (Styled like a sticker) */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6 flex gap-4 pointer-events-none z-30 transform -rotate-2 transition-all">
        <div className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-xl md:text-2xl font-bold text-gray-700 bg-white p-2 px-3 sm:p-2 sm:px-4 rounded-sm border-2 border-gray-700 shadow-md whitespace-nowrap">
            <Eraser className="text-pink-500 w-5 h-5 sm:w-6 sm:h-6" />
            <span>{eraserCount}</span>
        </div>
      </div>

      {/* HUD - Personal Best (Styled like a sticker) */}
      {personalBest > 0 && (
        <div className="absolute top-16 left-2 sm:top-20 sm:left-4 md:top-24 md:left-6 flex gap-4 pointer-events-none z-30 transform rotate-1 transition-all animate-fade-in">
          <div className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg font-bold text-gray-700 bg-yellow-50 p-1.5 px-2.5 sm:p-2 sm:px-3 rounded-sm border-2 border-yellow-400 shadow-md whitespace-nowrap">
            <Trophy className="text-yellow-500 w-4 h-4 sm:w-5 sm:h-5" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] sm:text-xs text-yellow-600 uppercase tracking-wide font-bold">Best</span>
              <span className="font-mono text-yellow-800">{personalBest}m</span>
            </div>
          </div>
        </div>
      )}

      {/* HUD - Coins Display (Bottom Left) */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 md:bottom-6 md:left-6 flex gap-2 z-30">
        <div className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-gray-700 bg-gradient-to-r from-yellow-100 to-yellow-50 p-2 px-3 sm:p-2 sm:px-4 rounded-sm border-2 border-yellow-500 shadow-md whitespace-nowrap pointer-events-none transform -rotate-1">
          <Coins className="text-yellow-600 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-mono text-yellow-800">{playerProgress.coins}</span>
        </div>
      </div>

      {/* HUD - Shop Button (Bottom Left, Above Coins) */}
      {(gameState === GameState.START || gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
        <div className="absolute bottom-16 left-3 sm:bottom-20 sm:left-4 md:bottom-24 md:left-6 z-30">
          <button
            onClick={() => setShowShop(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg font-bold shadow-lg hover:from-blue-500 hover:to-blue-400 transition-all active:scale-95 border-2 border-blue-700 transform rotate-2 hover:rotate-0 min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <ShoppingBag size={20} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Shop</span>
          </button>
        </div>
      )}

      {/* HUD - Bottom Right Controls (Pointer events enabled) */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 flex items-center gap-1 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-sm border-2 border-gray-700 shadow-md transition-opacity hover:opacity-100 opacity-95 sm:opacity-70 z-30 transform rotate-1 origin-bottom-right">
          {/* Pause Toggle */}
          {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
            <>
              <button
                onClick={togglePause}
                className="p-2.5 sm:p-2 hover:bg-gray-100 rounded text-gray-700 active:bg-gray-200 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                title={gameState === GameState.PAUSED ? "Resume" : "Pause"}
              >
                {gameState === GameState.PAUSED ? <Play size={20} className="sm:w-5 sm:h-5" /> : <Pause size={20} className="sm:w-5 sm:h-5" />}
              </button>
              <div className="w-px h-6 sm:h-6 bg-gray-300"></div>
            </>
          )}

          {/* Audio Controls */}
          <button
            onClick={toggleMute}
            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded text-gray-700 active:bg-gray-200 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} className="sm:w-5 sm:h-5" /> : <Volume2 size={20} className="sm:w-5 sm:h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700 hidden sm:block"
          />
      </div>

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-3 sm:p-4">
          <div className="modal-content bg-[#fdfbf7] p-4 sm:p-6 md:p-8 rounded-sm shadow-2xl text-center border-4 border-gray-800 w-full max-w-[95%] sm:max-w-md transform -rotate-1 max-h-[90dvh] overflow-y-auto custom-scrollbar animate-pop-in relative">
            <h1 className="modal-title text-2xl sm:text-4xl md:text-6xl font-bold text-gray-800 mb-1 sm:mb-2 font-display leading-tight">Paper Plane Drift</h1>
            <p className="text-sm sm:text-lg md:text-xl text-gray-600 mb-3 sm:mb-4 md:mb-6 font-hand">Don't get crumpled.</p>

            {/* Skin Selector */}
            <div className="modal-section mb-4 sm:mb-6 w-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">Select Plane</span>
                <span className="text-gray-400 text-xs">Scroll →</span>
              </div>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 sm:pb-4 custom-scrollbar snap-x snap-mandatory -mx-1 px-1">
                {SKINS.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.id)}
                    className={`flex-shrink-0 snap-center relative min-w-[88px] h-[88px] sm:w-28 sm:h-28 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all touch-manipulation ${
                      selectedSkin === skin.id
                        ? 'border-blue-500 shadow-md scale-105 bg-white ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50 opacity-80 hover:opacity-100 active:scale-95'
                    } ${skin.id === PlaneSkin.GOLD ? 'border-yellow-400' : ''}`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${skin.color} shadow-inner flex items-center justify-center text-xl sm:text-2xl`}>
                       {/* Placeholder icon representation */}
                       {skin.id === PlaneSkin.CRANE ? '🦢' : '✈️'}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 leading-tight px-1 text-center">{skin.name}</span>
                    {selectedSkin === skin.id && (
                      <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white p-0.5 rounded-full shadow-md">
                        <div className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 md:space-y-4 text-left bg-white p-2.5 sm:p-3 md:p-4 rounded-sm border-2 border-gray-200 mb-4 sm:mb-6 md:mb-8 shadow-sm text-xs sm:text-sm md:text-base">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0">👆</span>
                <span className="text-xs sm:text-sm md:text-lg">Tap / Space to Fly Up</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0">✏️</span>
                <span className="text-xs sm:text-sm md:text-lg">Dodge falling pencils</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-yellow-300 opacity-50 rounded flex-shrink-0"></div>
                <span className="text-xs sm:text-sm md:text-lg">Avoid Sticky Tape</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Eraser className="text-pink-500 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm md:text-lg">Collect Erasers for shields!</span>
              </div>
            </div>

            {/* Power-ups unlock status */}
            {playerProgress.gamesPlayed < 10 ? (
              <div className="mb-4 sm:mb-6 p-3 bg-gray-100 border-2 border-gray-300 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-bold">
                    Power-ups unlock in {10 - playerProgress.gamesPlayed} {10 - playerProgress.gamesPlayed === 1 ? 'flight' : 'flights'}!
                  </span>
                </div>
              </div>
            ) : playerProgress.gamesPlayed === 10 ? (
              <div className="mb-4 sm:mb-6 p-3 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 rounded-lg animate-pulse">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <span className="text-lg sm:text-xl">✨</span>
                  <span className="text-xs sm:text-sm font-bold">
                    Power-ups unlocked! Collect them mid-flight!
                  </span>
                  <span className="text-lg sm:text-xl">✨</span>
                </div>
              </div>
            ) : null}

            <button
              onClick={startGame}
              className="group relative px-5 py-3 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-gray-800 text-white text-base sm:text-lg md:text-2xl font-bold rounded hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 w-full shadow-lg overflow-hidden ring-4 ring-gray-300 animate-pulse min-h-[48px] touch-manipulation"
            >
              {/* Shining effect */}
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />

              <Play className="group-hover:translate-x-1 transition-transform fill-current w-5 h-5 sm:w-6 sm:h-6" />
              Start Flight
            </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-50 p-3 sm:p-4">
          <div className="modal-content bg-[#fdfbf7] p-5 sm:p-6 md:p-8 rounded-sm shadow-2xl text-center border-2 border-gray-800 w-full max-w-[90%] sm:max-w-sm transform rotate-1 max-h-[85dvh] overflow-y-auto custom-scrollbar animate-pop-in">
            <h2 className="modal-title text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-5 sm:mb-6 font-hand">Game Paused</h2>
            <button
              onClick={togglePause}
              className="w-full py-3 sm:py-3.5 bg-blue-600 text-white text-base sm:text-lg md:text-xl font-bold rounded hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg mb-3 sm:mb-4 active:scale-98 min-h-[48px] touch-manipulation"
            >
              <Play size={20} className="sm:w-6 sm:h-6" />
              Resume
            </button>
            <button
              onClick={restartGame}
              className="w-full py-3 sm:py-3.5 bg-gray-200 text-gray-700 text-base sm:text-lg md:text-xl font-bold rounded hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 border border-gray-300 active:scale-98 min-h-[48px] touch-manipulation"
            >
              <RotateCcw size={20} className="sm:w-6 sm:h-6" />
              Quit to Title
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-3 sm:p-4 transition-colors duration-500">
            <div className="modal-content bg-[#fff9c4] p-4 sm:p-6 md:p-8 rounded-sm shadow-2xl text-center relative w-full max-w-[95%] sm:max-w-md transform -rotate-1 border-t-8 border-yellow-200 max-h-[92dvh] overflow-y-auto custom-scrollbar animate-pop-in">
              {/* Tape Graphic */}
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 w-20 sm:w-24 md:w-32 h-5 sm:h-6 md:h-8 bg-yellow-300/60 rotate-2 pointer-events-none shadow-sm"></div>

              <h2 className="modal-title text-2xl sm:text-3xl md:text-5xl font-bold text-red-600 mb-3 sm:mb-4 md:mb-6 font-hand animate-stamp tracking-wide transform origin-center drop-shadow-sm">Flight Terminated</h2>

              {/* New Record Banner */}
              {isNewRecord && (
                <div className="mb-3 sm:mb-4 animate-pop-in" style={{animationDelay: '0.2s'}}>
                  <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-2 sm:p-3 rounded-lg border-2 border-yellow-500 shadow-lg relative overflow-hidden">
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <Trophy className="text-yellow-700 w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                      <span className="text-sm sm:text-lg md:text-xl font-bold text-yellow-900 uppercase tracking-wide">New Personal Record!</span>
                      <Trophy className="text-yellow-700 w-5 h-5 sm:w-6 sm:h-6 animate-bounce" style={{animationDelay: '0.1s'}} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6 animate-slide-up" style={{animationDelay: '0.3s'}}>
                <div className={`p-2 sm:p-2.5 md:p-3 rounded border shadow-sm ${isNewRecord ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-300' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-[10px] sm:text-xs md:text-sm ${isNewRecord ? 'text-yellow-700 font-bold' : 'text-gray-500'}`}>Distance</p>
                    {isNewRecord && <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />}
                  </div>
                  <p className={`text-base sm:text-lg md:text-2xl font-bold ${isNewRecord ? 'text-yellow-800' : 'text-gray-800'}`}>{score}m</p>
                  {!isNewRecord && personalBest > 0 && (
                    <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5">Best: {personalBest}m</p>
                  )}
                </div>
                <div className="bg-white p-2 sm:p-2.5 md:p-3 rounded border border-gray-200 shadow-sm">
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">Erasers Left</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">{eraserCount}</p>
                </div>
              </div>

              {/* Coins Earned */}
              {coinsEarnedThisGame > 0 && (
                <div className="mb-3 sm:mb-4 animate-slide-up" style={{animationDelay: '0.35s'}}>
                  <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 rounded-lg p-2 sm:p-3 shadow-md">
                    <div className="flex items-center justify-center gap-2">
                      <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                      <span className="text-sm sm:text-base font-bold text-yellow-800">
                        +{coinsEarnedThisGame} coins earned!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-section mb-4 sm:mb-6 md:mb-8 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] flex items-center justify-center animate-slide-up" style={{animationDelay: '0.5s'}}>
                {loadingReport ? (
                  <div className="animate-pulse flex flex-col items-center gap-2 text-gray-500 py-3 sm:py-4">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs sm:text-sm md:text-base">Teacher is grading...</p>
                  </div>
                ) : report ? (
                  <div className="text-left w-full bg-white/50 p-2.5 sm:p-3 md:p-4 rounded border border-yellow-300/50 relative overflow-hidden">
                      {/* Faint Red Pen underline effect */}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500/10"></div>

                      <div className="flex justify-between items-start mb-1.5 sm:mb-2 border-b border-gray-400 pb-1.5 sm:pb-2">
                        <span className="text-xs sm:text-sm md:text-lg font-bold text-gray-800">Teacher's Note:</span>
                        <span className="text-2xl sm:text-3xl md:text-5xl font-bold text-red-600 font-hand animate-stamp transform origin-right" style={{animationDelay: '0.6s'}}>{report.grade}</span>
                      </div>
                      <p className="text-sm sm:text-base md:text-xl font-hand leading-relaxed text-gray-800">"{report.comment}"</p>
                  </div>
                ) : null}
              </div>

              {/* Class Rankings / High Score Entry */}
              <div className="modal-section mb-4 sm:mb-6 animate-slide-up bg-white/60 rounded border border-gray-300 p-2.5 sm:p-3 md:p-4" style={{animationDelay: '0.6s'}}>
                 <div className="flex items-center justify-between mb-2 sm:mb-3 border-b border-gray-300 pb-1.5 sm:pb-2">
                   <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-700 flex items-center gap-1.5 sm:gap-2"><Trophy size={16} className="sm:w-[18px] sm:h-[18px] text-yellow-500"/> Class Rankings</h3>
                 </div>

                 {/* User Status */}
                 {cgUser ? (
                   scoreSubmitted ? (
                     <div className="flex items-center justify-between mb-2 sm:mb-3 bg-green-50 p-2 rounded border border-green-200">
                       <div className="text-green-700 font-bold text-xs sm:text-sm">
                         Score saved as <span className="underline">{cgUser.username}</span>
                       </div>
                     </div>
                   ) : (
                     <div className="mb-2 sm:mb-3 bg-blue-50 p-2 rounded border border-blue-200">
                       <div className="text-blue-700 text-xs sm:text-sm">
                         Playing as <span className="font-bold">{cgUser.username}</span>
                       </div>
                     </div>
                   )
                 ) : (
                   <div className="mb-2 sm:mb-3 bg-yellow-50 p-2 rounded-lg border-2 border-yellow-400">
                     <div className="p-2 flex flex-col gap-2">
                       <div className="text-yellow-800 text-xs sm:text-sm font-bold">
                         Want to save your score?
                       </div>
                       <button
                         onClick={handleLogin}
                         disabled={isSubmittingScore}
                         className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[40px] touch-manipulation active:scale-95"
                       >
                         Log in to CrazyGames
                       </button>
                     </div>
                   </div>
                 )}

                 {/* Leaderboard List */}
                 <div className="space-y-1">
                   {leaderboard.length === 0 ? (
                     <p className="text-xs sm:text-sm text-gray-500 italic">No rankings yet.</p>
                   ) : (
                     leaderboard.map((entry, idx) => (
                       <div key={idx} className={`flex justify-between text-xs sm:text-sm md:text-base ${cgUser && entry.userId === cgUser.userId && scoreSubmitted ? 'font-bold text-blue-800' : 'text-gray-700'}`}>
                         <span className="truncate mr-2">{idx + 1}. {entry.username || 'Anonymous'}</span>
                         <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                           <span>{entry.score}m</span>
                           <span className="w-5 sm:w-6 text-right font-bold text-red-500">{entry.grade}</span>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>

              <button
                onClick={restartGame}
                className="w-full py-3 sm:py-3.5 md:py-4 bg-blue-600 text-white text-base sm:text-lg md:text-xl font-bold rounded hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-98 animate-slide-up min-h-[48px] touch-manipulation" style={{animationDelay: '0.7s'}}
              >
                <RotateCcw size={20} className="sm:w-6 sm:h-6" />
                Try Again
              </button>
            </div>
        </div>
      )}

      {/* SDK Debug Panel (Ctrl+Shift+D to toggle) */}
      <SDKDebugPanel isOpen={showSDKDebug} onClose={() => setShowSDKDebug(false)} />
    </div>
  );
}
