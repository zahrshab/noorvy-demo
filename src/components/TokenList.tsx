import { motion} from 'motion/react';
import { TokenStats } from '../services/TokenData';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface TokenListProps {
  tokens: Record<string, TokenStats>;
  selectedMint: string;
  onSelect: (mint: string) => void;
}

export function TokenList({ tokens, selectedMint, onSelect }: TokenListProps) {
  const [search, setSearch] = useState('');
  
  const tokenList = Object.values(tokens).filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e]">
      <div className="p-4 border-b border-neutral-800 bg-[#0e0e0e]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search markets..." 
            className="w-full bg-[#050505] border border-neutral-800 rounded px-9 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[1fr_80px_80px] px-4 py-3 bg-[#0e0e0e] sticky top-0 z-10 text-[10px] text-neutral-500 uppercase font-bold tracking-widest border-b border-neutral-800">
          <span>Asset</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
        </div>
        
        {tokenList.map((token) => (
          <motion.div
            key={token.mint}
            className={`grid grid-cols-[1fr_80px_80px] p-4 cursor-pointer transition-all border-b border-neutral-900/50 ${
              selectedMint === token.mint 
                ? 'bg-emerald-500/5 border-l-2 border-emerald-500' 
                : 'hover:bg-neutral-800/30'
            }`}
            onClick={() => onSelect(token.mint)}
          >
            <div className="flex items-center gap-3">
              <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full border border-neutral-800" />
              <div className="flex flex-col overflow-hidden">
                <span className={`font-bold text-sm truncate ${selectedMint === token.mint ? 'text-emerald-500' : 'text-slate-200'}`}>
                  {token.symbol}
                </span>
                <span className="text-[10px] text-neutral-500 truncate lowercase">${(token.marketCap / 1e6).toFixed(1)}M MC</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end justify-center font-mono text-xs text-neutral-300">
              <span>{token.price < 0.01 ? token.price.toFixed(6) : token.price.toFixed(2)}</span>
            </div>
            
            <div className={`flex items-center justify-end font-mono text-xs ${
              token.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
