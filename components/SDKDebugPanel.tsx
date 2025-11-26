import React, { useState } from 'react';
import {
  gameplayStart,
  gameplayStop,
  happyTime,
  requestMidgameAd,
  requestRewardedAd,
  checkAdblock,
  isCrazyGamesSDKAvailable
} from '../services/crazyGamesService';

interface SDKDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SDKDebugPanel({ isOpen, onClose }: SDKDebugPanelProps) {
  const [adStatus, setAdStatus] = useState('');
  const [adblockStatus, setAdblockStatus] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleMidgameAd = async () => {
    setAdStatus('Requesting midgame ad...');
    const success = await requestMidgameAd({
      adStarted: () => setAdStatus('Ad started!'),
      adFinished: () => setAdStatus('Ad finished!'),
      adError: (err) => setAdStatus(`Ad error: ${err.message}`)
    });
    setTimeout(() => setAdStatus(success ? 'Ad completed ✅' : 'Ad failed ❌'), 500);
  };

  const handleRewardedAd = async () => {
    setAdStatus('Requesting rewarded ad...');
    const success = await requestRewardedAd({
      adStarted: () => setAdStatus('Rewarded ad started!'),
      adFinished: () => setAdStatus('Rewarded ad finished!'),
      adError: (err) => setAdStatus(`Ad error: ${err.message}`)
    });
    setTimeout(() => setAdStatus(success ? 'Reward given ✅' : 'No reward ❌'), 500);
  };

  const handleCheckAdblock = async () => {
    const hasAdblock = await checkAdblock();
    setAdblockStatus(hasAdblock);
  };

  const sdkAvailable = isCrazyGamesSDKAvailable();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">🎮 SDK Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded px-3 py-1 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* SDK Status */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h3 className="font-bold mb-2 text-gray-700">SDK Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${sdkAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm">
                {sdkAvailable ? 'Production SDK Active' : 'Development Mode'}
              </span>
            </div>
          </div>

          {/* Adblock Status */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h3 className="font-bold mb-2 text-gray-700">Adblock Detection</h3>
            <button
              onClick={handleCheckAdblock}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition text-sm mb-2"
            >
              Check Adblock
            </button>
            {adblockStatus !== null && (
              <div className={`text-sm p-2 rounded ${adblockStatus ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {adblockStatus ? '🛡️ Adblock Detected' : '✅ No Adblock'}
              </div>
            )}
          </div>

          {/* Game Events */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h3 className="font-bold mb-2 text-gray-700">Game Events</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => gameplayStart()}
                className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-500 transition text-xs"
              >
                ▶️ Start
              </button>
              <button
                onClick={() => gameplayStop()}
                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-500 transition text-xs"
              >
                ⏸️ Stop
              </button>
              <button
                onClick={() => happyTime()}
                className="col-span-2 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-400 transition text-xs"
              >
                🎉 Happy Time
              </button>
            </div>
          </div>

          {/* Advertisement Testing */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h3 className="font-bold mb-2 text-gray-700">Advertisements</h3>
            <div className="space-y-2">
              <button
                onClick={handleMidgameAd}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500 transition text-sm"
              >
                📺 Request Midgame Ad
              </button>
              <button
                onClick={handleRewardedAd}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 transition text-sm"
              >
                🎁 Request Rewarded Ad
              </button>
            </div>
            {adStatus && (
              <div className="mt-2 text-xs p-2 bg-blue-50 text-blue-800 rounded border border-blue-200">
                {adStatus}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200 text-xs">
            <p className="font-bold text-blue-900 mb-1">ℹ️ Info:</p>
            <ul className="text-blue-800 space-y-1">
              <li>• Press <kbd className="bg-white px-1 rounded border">Ctrl+Shift+D</kbd> to toggle this panel</li>
              <li>• In dev mode, ads are simulated (1-2 sec delay)</li>
              <li>• Check browser console for detailed logs</li>
              <li>• Events fire even if SDK is unavailable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
