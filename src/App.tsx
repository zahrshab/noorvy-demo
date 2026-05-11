/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion} from 'motion/react';
import { Wallet } from 'lucide-react';
import { TokenList } from './components/TokenList';
import { Chart } from './components/Chart';
import { TradingPanel } from './components/TradingPanel';
import { fetchTokenStats, TokenStats, generateHistoricalData, CandleData } from './services/TokenData';
import { SOLANA_TOKENS } from './constants';

export default function App() {
  const [tokens, setTokens] = useState<Record<string, TokenStats>>({});
  const [selectedMint, setSelectedMint] = useState(SOLANA_TOKENS[0].mint);
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<Record<string, CandleData[]>>({});

  useEffect(() => {
    const initData = async () => {
      const stats = await fetchTokenStats();
      setTokens(stats);
      
      const history: Record<string, CandleData[]> = {};
      Object.keys(stats).forEach(mint => {
        history[mint] = generateHistoricalData(stats[mint].price);
      });
      setHistoricalData(history);
      setLoading(false);
    };

    initData();

    const interval = setInterval(async () => {
      const stats = await fetchTokenStats();
      setTokens(prev => ({ ...prev, ...stats }));
    }, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  const currentToken = useMemo(() => tokens[selectedMint], [tokens, selectedMint]);

  const [currentView, setCurrentView] = useState<'trade' | 'portfolio'>('trade');
  const [activeTab, setActiveTab] = useState<'trades' | 'my-trades' | 'holders'>('trades');

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-sm uppercase italic text-neutral-500">
        Initializing Noorvy...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-slate-200 overflow-hidden">
      {/* Top Navigation / Status Bar */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0e0e0e] shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Noorvy" className="w-8 h-8 rounded-md"/>                    
            <span className="font-bold tracking-tight text-lg uppercase" style={{ color: '#b2d6ff' }}>Noorvy Demo</span>  
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
            <button 
              onClick={() => setCurrentView('trade')}
              className={`${currentView === 'trade' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'} transition-colors pb-4 mt-4 cursor-pointer`}
            >
              Trade
            </button>
            <button 
              onClick={() => setCurrentView('portfolio')}
              className={`${currentView === 'portfolio' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'} transition-colors pb-4 mt-4 cursor-pointer`}
            >
              Portfolio
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-neutral-500">TPS <span className="text-emerald-500">2,451</span></span>
            {currentToken && (
              <span className="text-neutral-500">{currentToken.symbol} <span className="text-white">${currentToken.price.toFixed(2)}</span></span>
            )}
          </div>
          <button className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-sm font-medium transition-colors flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {currentView === 'trade' ? (
          <>
            {/* Sidebar - Market List */}
            <aside className="w-80 shrink-0 border-r border-neutral-800 font-sans">
              <TokenList 
                tokens={tokens} 
                selectedMint={selectedMint} 
                onSelect={setSelectedMint} 
              />
            </aside>

            {/* Content Area */}
            <section className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
              <div className="h-12 border-b border-neutral-800 flex items-center px-4 gap-6 justify-between bg-[#0e0e0e]">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm">{currentToken?.symbol} / USDC</span>
                  <div className="flex gap-1 text-[10px] uppercase font-bold text-neutral-500">
                    <button className="px-2 py-1 bg-neutral-800 rounded text-white">1H</button>
                    <button className="px-2 py-1 hover:bg-neutral-800 rounded transition-colors">4H</button>
                    <button className="px-2 py-1 hover:bg-neutral-800 rounded transition-colors">1D</button>
                    <button className="px-2 py-1 hover:bg-neutral-800 rounded transition-colors">1W</button>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-tighter">24h Volume</span>
                    <span className="text-xs font-mono">${currentToken?.volume24h.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-tighter">Market Cap</span>
                    <span className="text-xs font-mono">${currentToken?.marketCap.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 bg-[#141414]">
                {historicalData[selectedMint] && (
                  <Chart 
                    data={historicalData[selectedMint]} 
                    symbol={currentToken?.symbol || ''} 
                  />
                )}
              </div>

              <div className="h-64 border-t border-neutral-800 flex flex-col bg-[#0e0e0e]">
                {/* Tabs Header */}
                <div className="flex border-b border-neutral-800 px-4">
                  <button 
                    onClick={() => setActiveTab('trades')}
                    className={`px-6 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors relative ${
                      activeTab === 'trades' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Trades
                    {activeTab === 'trades' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('my-trades')}
                    className={`px-6 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors relative ${
                      activeTab === 'my-trades' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    My Trades
                    {activeTab === 'my-trades' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('holders')}
                    className={`px-6 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors relative ${
                      activeTab === 'holders' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Holders
                    {activeTab === 'holders' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                </div>

                {/* Tabs Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === 'trades' && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-4 text-[9px] uppercase font-bold text-neutral-600 mb-2 px-2">
                        <span>Side</span>
                        <span className="text-right">Size</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">Time</span>
                      </div>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="grid grid-cols-4 text-[10px] font-mono uppercase py-1 px-2 hover:bg-white/5 rounded">
                          <span className={i % 2 === 0 ? 'text-emerald-500' : 'text-rose-500'}>{i % 2 === 0 ? 'Buy' : 'Sell'}</span>
                          <span className="text-right text-neutral-300">{(Math.random() * 100).toFixed(2)} {currentToken?.symbol}</span>
                          <span className="text-right text-neutral-300">${currentToken?.price.toFixed(currentToken.price < 1 ? 6 : 2)}</span>
                          <span className="text-right text-neutral-500">{i * 2}s ago</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'my-trades' && (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-600 italic text-xs">
                      Connect wallet to view your trades
                    </div>
                  )}

                  {activeTab === 'holders' && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1fr_100px] text-[9px] uppercase font-bold text-neutral-600 mb-2 px-2">
                        <span>Address</span>
                        <span className="text-right">Balance</span>
                      </div>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="grid grid-cols-[1fr_100px] text-[10px] font-mono uppercase py-1 px-2 hover:bg-white/5 rounded">
                          <span className="text-neutral-500 truncate">
                            {Array.from({ length: 44 }, () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join('')}
                          </span>
                          <span className="text-right text-neutral-300">{(30 / i).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Right Panel - Trading */}
            <aside className="w-80 shrink-0 border-l border-neutral-800">
              <TradingPanel token={currentToken} />
            </aside>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-[#050505] p-12">
            <div className="max-w-4xl mx-auto space-y-12">
              <header className="flex justify-between items-end border-b border-neutral-800 pb-8">
                <div>
                  <h2 className="text-4xl font-bold tracking-tighter text-white mb-2">Portfolio</h2>
                  <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold">Estimated Net Worth</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-mono text-white tracking-tighter">
                    ${(1245.50 + (currentToken?.price || 0) * 12.5).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-emerald-500 font-mono mt-2">+2.45% (+$42.15) 24H</div>
                </div>
              </header>

              <section className="grid grid-cols-2 gap-6">
                <div className="p-8 bg-[#0e0e0e] border border-neutral-800 rounded-lg">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold mb-2 tracking-widest">Available Margin</div>
                  <div className="text-2xl font-mono text-white">$450.25</div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-2">USDC BALANCE</div>
                </div>
                <div className="p-8 bg-[#0e0e0e] border border-neutral-800 rounded-lg">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold mb-2 tracking-widest">Open Positions</div>
                  <div className="text-2xl font-mono text-white">3</div>
                  <div className="text-[10px] text-emerald-500 font-mono mt-2">ACCOUNT HEALTH: 98%</div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-6 px-2">Holdings</h3>
                <div className="bg-[#0e0e0e] border border-neutral-800 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-600">
                    <span>Asset</span>
                    <span className="text-right">Balance</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Value</span>
                  </div>
                  <div className="divide-y divide-neutral-800">
                    <div className="grid grid-cols-4 gap-4 px-6 py-5 items-center hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold text-white">S</div>
                        <div>
                          <p className="text-xs font-bold text-white">SOL</p>
                          <p className="text-[9px] text-neutral-500 uppercase">Solana</p>
                        </div>
                      </div>
                      <span className="text-right text-xs font-mono text-neutral-300">8.42</span>
                      <span className="text-right text-xs font-mono text-neutral-300">$145.20</span>
                      <span className="text-right text-xs font-mono text-white">$1,222.58</span>
                    </div>
                    {currentToken && (
                      <div className="grid grid-cols-4 gap-4 px-6 py-5 items-center hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={currentToken.icon} alt="" className="w-8 h-8 rounded-full bg-neutral-800" />
                          <div>
                            <p className="text-xs font-bold text-white">{currentToken.symbol}</p>
                            <p className="text-[9px] text-neutral-500 uppercase">{currentToken.name}</p>
                          </div>
                        </div>
                        <span className="text-right text-xs font-mono text-neutral-300">12.50</span>
                        <span className="text-right text-xs font-mono text-neutral-300">${currentToken.price.toFixed(currentToken.price < 1 ? 6 : 2)}</span>
                        <span className="text-right text-xs font-mono text-emerald-400">${(currentToken.price * 12.5).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer / Ticker */}
      <footer className="h-8 border-t border-neutral-800 bg-[#0e0e0e] flex items-center px-4 shrink-0 text-[10px] text-neutral-500 font-medium uppercase overflow-hidden relative">
        <div className="flex items-center gap-4 shrink-0 pr-4 bg-[#0e0e0e] z-10">
           <span>Market Status: <span className="text-emerald-500">Stable</span></span>
           <span>Network: <span className="text-white">Mainnet-Beta</span></span>
        </div>
        
        <div className="flex-1 overflow-hidden relative mx-4 mask-fade-edges">
          <div className="flex whitespace-nowrap animate-marquee">
            {Object.values(tokens).map((token: TokenStats) => (
              <div key={token.mint} className="inline-flex items-center gap-2 px-6">
                <span className="font-bold text-white">{token.symbol}</span>
                <span className="text-neutral-400 font-mono">${token.price.toFixed(token.price < 1 ? 6 : 2)}</span>
                <span className={`${token.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                </span>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {Object.values(tokens).map((token: TokenStats) => (
              <div key={`${token.mint}-clone`} className="inline-flex items-center gap-2 px-6">
                <span className="font-bold text-white">{token.symbol}</span>
                <span className="text-neutral-400 font-mono">${token.price.toFixed(token.price < 1 ? 6 : 2)}</span>
                <span className={`${token.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 pl-4 bg-[#0e0e0e] z-10">
          &copy; 2026 NOORVY DEMO
        </div>
      </footer>
    </div>
  );
}
