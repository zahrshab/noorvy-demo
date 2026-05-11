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

function etiColor(_score: number) {
  return 'text-neutral-300';
}

function etiBg(_score: number) {
  return 'bg-neutral-800/60 border-neutral-700';
}

function etiLabel(score: number) {
  if (score < 25) return 'LOW UNCERTAINTY';
  if (score < 55) return 'MODERATE';
  return 'HIGH UNCERTAINTY';
}

function agentBarColor(_mu: number) {
  return 'bg-white';
}

function AgentRow({ name, agent, open, onToggle }: { name: string; agent: AgentResult; open: boolean; onToggle: () => void }) {
  const pct = agent.mu * 100;

  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left space-y-2 py-2.5 focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{name}</span>
          <span className={`text-[10px] text-neutral-400 transition-transform inline-block ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-300 w-[52px] text-right shrink-0">
            P={pct.toFixed(1)}%
          </span>
          <div className="flex-1 h-[3px] bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${agentBarColor(agent.mu)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-neutral-500 w-[52px] shrink-0">
            σ={agent.sigma.toFixed(2)}
          </span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] text-neutral-500 leading-relaxed pb-2.5">{agent.reasoning}</p>
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
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [openRec, setOpenRec] = useState(false);
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
          {amount.length > 0 && side === 'buy' && token.symbol === 'SOL' && (
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-tighter italic">Powered by Noorvy</span>
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full border border-blue-400/30 text-blue-300 py-3 rounded text-xs font-bold hover:bg-blue-400/10 transition-colors flex items-center justify-center gap-2"
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
              className="w-[360px] bg-[#171717] border border-blue-400/20 rounded-xl shadow-2xl relative"
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 group relative">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest">ETI Score</p>
                          <svg className="w-3 h-3 text-neutral-600 cursor-default shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4M12 8h.01"/></svg>
                          <div className="absolute top-full left-0 mt-1.5 w-52 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-[10px] text-neutral-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-sans font-normal normal-case tracking-normal">
                            Measures how much the agents disagree with each other. A high score means their estimates are far apart, treat the consensus probability with less confidence.
                          </div>
                        </div>
                        <p className="text-[9px] text-neutral-500">Epistemic Tension Index</p>
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

                    {/* Agents + Consensus */}
                    <div className="bg-neutral-900 rounded-lg px-3">
                      <div className="flex items-center justify-between pt-3 pb-1">
                        <p className="text-[9px] text-neutral-600 uppercase font-bold tracking-widest">Agent Breakdown</p>
                        <p className="text-[9px] text-neutral-600 italic">tap to expand</p>
                      </div>
                      <AgentRow name="Liquidity Depth" agent={riskData.agents.liquidity} open={openAgent === 'liquidity'} onToggle={() => setOpenAgent(openAgent === 'liquidity' ? null : 'liquidity')} />
                      <AgentRow name="Price Volatility" agent={riskData.agents.volatility} open={openAgent === 'volatility'} onToggle={() => setOpenAgent(openAgent === 'volatility' ? null : 'volatility')} />
                      <AgentRow name="Order Flow / MEV" agent={riskData.agents.orderFlow} open={openAgent === 'orderFlow'} onToggle={() => setOpenAgent(openAgent === 'orderFlow' ? null : 'orderFlow')} />
                      {/* Consensus summary row */}
                      <div className="flex items-center py-2.5 border-t border-neutral-700 text-[10px] font-mono">
                        <div className="flex items-center gap-1 group relative flex-1">
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Agent Consensus</span>
                          <svg className="w-3 h-3 text-neutral-600 cursor-default shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4M12 8h.01"/></svg>
                          <div className="absolute top-full left-0 mt-1.5 w-52 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-[10px] text-neutral-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-sans font-normal normal-case tracking-normal">
                            The combined probability that slippage will exceed {SLIPPAGE_THRESHOLD_PCT}% on this trade. A lower % means agents collectively expect the trade to execute cleanly.
                          </div>
                        </div>
                        <span className="text-neutral-300 w-[52px] shrink-0">
                          P={(riskData.poe_mu * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Narrative */}
                    <div className="bg-neutral-900 rounded-lg px-3">
                      <button
                        type="button"
                        onClick={() => setOpenRec(v => !v)}
                        className="w-full text-left flex items-center justify-between py-3 focus:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-blue-300 uppercase font-bold tracking-widest">Recommendation</p>
                          {!openRec && <p className="text-[9px] text-neutral-600 italic">tap to expand</p>}
                        </div>
                        <span className={`text-[10px] text-neutral-400 inline-block transition-transform ${openRec ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {openRec && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[11px] text-neutral-300 leading-relaxed pb-3">{riskData.narrative}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
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

