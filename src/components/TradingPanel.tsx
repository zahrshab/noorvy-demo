import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { TokenStats } from '../services/TokenData';
import { analyzeNextTrade } from '../services/analyzeTradeService';

interface AgentResult {
  mu: number;
  sigma: number;
  kl: number;
  reasoning: string;
}

interface RiskData {
  eti_score: number;
  poe_mu: number;
  agents: {
    liquidity: AgentResult;
    volatility: AgentResult;
    orderFlow: AgentResult;
  };
  narrative: string;
}

interface TradingPanelProps {
  token: TokenStats;
}

const SLIPPAGE_THRESHOLD_PCT = 0.3;

function etiColor(score: number) {
  if (score < 25) return 'text-emerald-400';
  if (score < 55) return 'text-amber-400';
  return 'text-rose-400';
}

function etiBg(score: number) {
  if (score < 25) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score < 55) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-rose-500/10 border-rose-500/30';
}

function etiLabel(score: number) {
  if (score < 25) return 'LOW RISK';
  if (score < 55) return 'MODERATE';
  return 'HIGH RISK';
}

function renderBold(text: string) {                
    const parts = text.split(/\*\*(.+?)\*\*/g);      
    return parts.map((part, i) =>                    
    i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part);
} 

function AgentRow({ name, agent }: { name: string; agent: AgentResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{name}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-200">
            P={`${(agent.mu * 100).toFixed(1)}`}%
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            σ={agent.sigma.toFixed(2)}
          </span>
          <span className="text-neutral-600 text-[8px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-800 pt-2">
              {agent.reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TradingPanel({ token }: TradingPanelProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const prevAmount = useRef('');

  // Reset cached risk data when amount changes
  useEffect(() => {
    if (amount !== prevAmount.current) {
      setRiskData(null);
      prevAmount.current = amount;
    }
  }, [amount]);

  // Fetch ETI analysis when modal opens
  useEffect(() => {
    if (!showRiskModal || riskData || riskLoading) return;

    const trade_size_usd = parseFloat(amount || '0') * token.price;
    if (trade_size_usd <= 0) return;

    setRiskLoading(true);

    analyzeNextTrade(trade_size_usd)
      .then(result => {
        const { eti, narrative } = result;
        setRiskData({
          eti_score: parseFloat(eti.eti_score_A.toFixed(1)),
          poe_mu: eti.poe.mu_calibrated,
          agents: {
            liquidity: {
              mu: eti.agents.liquidity.mu_calibrated,
              sigma: eti.agents.liquidity.sigma,
              kl: eti.agents.liquidity.kl,
              reasoning: eti.agents.liquidity.reasoning,
            },
            volatility: {
              mu: eti.agents.volatility.mu_calibrated,
              sigma: eti.agents.volatility.sigma,
              kl: eti.agents.volatility.kl,
              reasoning: eti.agents.volatility.reasoning,
            },
            orderFlow: {
              mu: eti.agents.orderFlow.mu_calibrated,
              sigma: eti.agents.orderFlow.sigma,
              kl: eti.agents.orderFlow.kl,
              reasoning: eti.agents.orderFlow.reasoning,
            },
          },
          narrative,
        });
      })
      .catch(err => console.error('ETI analysis failed:', err))
      .finally(() => setRiskLoading(false));
  }, [showRiskModal]);

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
          {amount.length > 0 && side === 'buy' && (
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
              className="w-[360px] bg-[#171717] border border-blue-500/30 rounded-xl shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm leading-none">Risk Analysis</h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      P(slippage &gt; {SLIPPAGE_THRESHOLD_PCT}%) · {amount} {token.symbol}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRiskModal(false)}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {riskLoading && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Running agents…</p>
                  </div>
                )}

                {!riskLoading && riskData && (
                  <>
                    {/* ETI Score */}
                    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${etiBg(riskData.eti_score)}`}>
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-0.5">ETI Score</p>
                        <p className="text-[9px] text-neutral-500">Epistemic Trading Index</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black font-mono ${etiColor(riskData.eti_score)}`}>
                          {riskData.eti_score.toFixed(1)}
                        </p>
                        <p className={`text-[9px] font-bold ${etiColor(riskData.eti_score)}`}>
                          {etiLabel(riskData.eti_score)}
                        </p>
                      </div>
                    </div>

                    {/* PoE consensus */}
                    <div className="flex justify-between items-center text-[10px] font-mono px-1">
                      <span className="text-neutral-500 uppercase font-bold">Consensus Risk</span>
                      <span className="text-neutral-300">
                        {(riskData.poe_mu * 100).toFixed(1)}% chance
                      </span>
                    </div>

                    {/* Agents */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-neutral-600 uppercase font-bold tracking-widest px-1">Agent Breakdown</p>
                      <AgentRow name="Liquidity Depth" agent={riskData.agents.liquidity} />
                      <AgentRow name="Price Volatility" agent={riskData.agents.volatility} />
                      <AgentRow name="Order Flow / MEV" agent={riskData.agents.orderFlow} />
                    </div>

                    {/* Narrative */}
                    <div className="bg-neutral-900 rounded-lg px-3 py-3">
                      <p className="text-[9px] text-blue-400 uppercase font-bold tracking-widest mb-1.5">Recommendation</p>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">{renderBold(riskData.narrative)}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowRiskModal(false)}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
