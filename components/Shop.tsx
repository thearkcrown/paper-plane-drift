import React, { useState } from 'react';
import { X, ShoppingBag, TrendingUp, Package, Coins, Lock, CheckCircle } from 'lucide-react';
import {
  PlayerProgress,
  UpgradeType,
  ConsumableType,
  UPGRADES,
  CONSUMABLES,
  calculateUpgradeCost,
  getUpgradeEffect,
  canUpgrade,
  canAfford
} from '../types/shop';

interface ShopProps {
  isOpen: boolean;
  onClose: () => void;
  playerProgress: PlayerProgress;
  onPurchaseUpgrade: (upgradeId: UpgradeType) => void;
  onPurchaseConsumable: (consumableId: ConsumableType) => void;
}

export default function Shop({
  isOpen,
  onClose,
  playerProgress,
  onPurchaseUpgrade,
  onPurchaseConsumable
}: ShopProps) {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'consumables'>('upgrades');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#fdfbf7] rounded-lg shadow-2xl w-full max-w-[95%] sm:max-w-2xl max-h-[92dvh] overflow-hidden border-4 border-gray-800 transform -rotate-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-4 sm:p-5 border-b-4 border-gray-800 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800" />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 font-hand">Paper Plane Shop</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-800 hover:bg-white/30 rounded-full p-2 transition active:scale-95"
              title="Close shop"
            >
              <X size={24} />
            </button>
          </div>

          {/* Coin Balance */}
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border-2 border-gray-700 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-gray-600 font-bold uppercase tracking-wide">Your Balance</span>
              </div>
              <span className="text-2xl font-bold text-yellow-700 font-mono">{playerProgress.coins}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-300 bg-gray-50 sticky top-[140px] sm:top-[148px] z-10">
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 py-3 sm:py-4 font-bold text-sm sm:text-base transition flex items-center justify-center gap-2 ${
              activeTab === 'upgrades'
                ? 'bg-[#fdfbf7] border-b-4 border-gray-800 text-gray-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <TrendingUp size={18} />
            Permanent Upgrades
          </button>
          <button
            onClick={() => setActiveTab('consumables')}
            className={`flex-1 py-3 sm:py-4 font-bold text-sm sm:text-base transition flex items-center justify-center gap-2 ${
              activeTab === 'consumables'
                ? 'bg-[#fdfbf7] border-b-4 border-gray-800 text-gray-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Package size={18} />
            Consumables
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92dvh-200px)] custom-scrollbar">
          {activeTab === 'upgrades' && (
            <div className="space-y-3 sm:space-y-4">
              {Object.values(UPGRADES).map((upgrade) => {
                const currentLevel = playerProgress.upgrades[upgrade.id];
                const cost = calculateUpgradeCost(upgrade, currentLevel);
                const effect = getUpgradeEffect(upgrade, currentLevel);
                const nextEffect = getUpgradeEffect(upgrade, currentLevel + 1);
                const isMaxLevel = currentLevel >= upgrade.maxLevel;
                const affordable = canUpgrade(upgrade, currentLevel, playerProgress.coins);

                return (
                  <div
                    key={upgrade.id}
                    className={`bg-white p-3 sm:p-4 rounded-lg border-2 shadow-md transition-all ${
                      isMaxLevel
                        ? 'border-green-400 bg-green-50'
                        : affordable
                        ? 'border-blue-400 hover:border-blue-500'
                        : 'border-gray-300 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl sm:text-4xl">{upgrade.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-gray-800 flex items-center gap-2">
                              {upgrade.name}
                              {isMaxLevel && (
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">MAX</span>
                              )}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">{upgrade.description}</p>
                          </div>
                        </div>

                        {/* Level Progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Level {currentLevel}/{upgrade.maxLevel}</span>
                            {!isMaxLevel && (
                              <span className="text-blue-600 font-bold">
                                +{((nextEffect - effect) * 100).toFixed(0)}% at next level
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isMaxLevel ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${(currentLevel / upgrade.maxLevel) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Purchase Button */}
                        {!isMaxLevel && (
                          <button
                            onClick={() => onPurchaseUpgrade(upgrade.id)}
                            disabled={!affordable}
                            className={`w-full py-2 px-4 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 ${
                              affordable
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {affordable ? (
                              <>
                                <Coins size={16} />
                                Upgrade for {cost} coins
                              </>
                            ) : (
                              <>
                                <Lock size={16} />
                                Need {cost - playerProgress.coins} more coins
                              </>
                            )}
                          </button>
                        )}

                        {isMaxLevel && (
                          <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                            <CheckCircle size={18} />
                            Fully Upgraded!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'consumables' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-800">
                <p className="font-bold mb-1">💡 How to use:</p>
                <p>Consumables are used during gameplay. Press the corresponding key to activate!</p>
              </div>

              {Object.values(CONSUMABLES).map((consumable) => {
                const owned = playerProgress.inventory[consumable.id];
                const affordable = canAfford(consumable.cost, playerProgress.coins);

                return (
                  <div
                    key={consumable.id}
                    className={`bg-white p-3 sm:p-4 rounded-lg border-2 shadow-md transition-all ${
                      affordable
                        ? 'border-purple-400 hover:border-purple-500'
                        : 'border-gray-300 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl sm:text-4xl">{consumable.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-gray-800">
                              {consumable.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">{consumable.description}</p>
                            {consumable.duration && (
                              <p className="text-xs text-purple-600 mt-1">⏱️ Duration: {consumable.duration}s</p>
                            )}
                          </div>
                        </div>

                        {/* Owned Count */}
                        {owned > 0 && (
                          <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold inline-block mb-2">
                            Owned: {owned}
                          </div>
                        )}

                        {/* Purchase Button */}
                        <button
                          onClick={() => onPurchaseConsumable(consumable.id)}
                          disabled={!affordable}
                          className={`w-full py-2 px-4 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 ${
                            affordable
                              ? 'bg-purple-600 text-white hover:bg-purple-500'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {affordable ? (
                            <>
                              <Coins size={16} />
                              Buy for {consumable.cost} coins
                            </>
                          ) : (
                            <>
                              <Lock size={16} />
                              Need {consumable.cost - playerProgress.coins} more coins
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Tip */}
        <div className="bg-yellow-50 border-t-2 border-gray-300 p-3 text-center text-xs sm:text-sm text-gray-600">
          💰 Earn coins by flying! 1 coin = 10 meters
        </div>
      </div>
    </div>
  );
}
