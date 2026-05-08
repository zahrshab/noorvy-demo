import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { TokenStats } from '../services/TokenData';

interface TradingPanelProps {
  token: TokenStats;
}

export function TradingPanel({ token }: TradingPanelProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [showRiskModal, setShowRiskModal] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col h-full bg-[#0e0e0e] text-slate-500 p-6 items-center justify-center italic text-xs">
        Select a market to trade
      </div>
    );
  }

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`${side.toUpperCase()} order placed for ${amount} ${token.symbol}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] text-slate-200">
      <div className="flex p-1 bg-neutral-900 m-4 rounded-lg">
        <button
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            side === 'buy' ? 'bg-emerald-500 text-black shadow-lg' : 'text-neutral-500 hover:text-white'
          }`}
          onClick={() => setSide('buy')}
        >
          BUY
        </button>
        <button
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            side === 'sell' ? 'bg-rose-500 text-black shadow-lg' : 'text-neutral-500 hover:text-white'
          }`}
          onClick={() => setSide('sell')}
        >
          SELL
        </button>
      </div>

      <form onSubmit={handleTrade} className="flex flex-col gap-6 px-4 pb-4 flex-1">
        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <label className="text-[10px] text-neutral-500 uppercase font-bold">Amount ({token.symbol})</label>
            <span className="text-[10px] font-mono text-neutral-600">Balance: 0.00</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              placeholder="0.00"
              className="w-full bg-[#050505] border border-neutral-800 rounded p-3 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <span className="absolute right-3 top-3 text-[10px] text-neutral-600 font-bold">MAX</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neutral-500 uppercase font-bold">Execution Price</span>
            <span className="text-neutral-300">${token.price.toFixed(6)}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neutral-500 uppercase font-bold">Total Cost (USDC)</span>
            <span className="text-neutral-300">${(parseFloat(amount || '0') * token.price).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-auto">
          {amount.length > 0 && token.symbol === 'SOL' && (
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-tighter italic">Powered by Noorvy</span>
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full border border-blue-500/50 text-blue-400 py-3 rounded text-xs font-bold hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2"
                onClick={() => setShowRiskModal(true)}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                ANALYZE RISK
              </motion.button>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 rounded font-bold text-sm shadow-lg transition-transform active:scale-[0.98] ${
              side === 'buy' ? 'bg-emerald-500 text-black shadow-emerald-500/10' : 'bg-rose-500 text-black shadow-rose-500/10'
            }`}
          >
            {side.toUpperCase()} {token.symbol}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showRiskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-80 bg-[#171717] border border-blue-500/30 rounded-xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowRiskModal(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                   <AlertCircle className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-blue-400">Risk Analysis</h3>
              </div>
              
              <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                Here we will show the metrics.
              </p>

              <button
                onClick={() => setShowRiskModal(false)}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-bold transition-colors"
              >
                Close Overlay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
