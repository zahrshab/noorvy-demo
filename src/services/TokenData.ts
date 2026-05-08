import { DEXSCREENER_API, JUPITER_PRICE_API, SOLANA_TOKENS } from '../constants';
import { UTCTimestamp } from 'lightweight-charts';

export interface TokenStats {
  mint: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  symbol: string;
  name: string;
  icon: string;
}

export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchTokenStats(): Promise<Record<string, TokenStats>> {
  try {
    const mints = SOLANA_TOKENS.map(t => t.mint).join(',');
    const [dexResponse, jupResponse] = await Promise.allSettled([
      fetch(`${DEXSCREENER_API}${mints}`),
      fetch(`${JUPITER_PRICE_API}${mints}`)
    ]).then(results => 
      Promise.all(results.map(r => r.status === 'fulfilled' ? r.value.json() : null))
    );

    const dexData = dexResponse || { pairs: [] };
    const jupData = jupResponse || { data: {} };
    
    const stats: Record<string, TokenStats> = {};
    
    SOLANA_TOKENS.forEach(token => {
      const pairs = (dexData.pairs || []).filter(
        (p: any) => p.chainId === 'solana' && (p.baseToken.address === token.mint || p.quoteToken.address === token.mint)
      );

      const bestPair = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      
      const jupPrice = jupData.data?.[token.mint]?.price;

      if (bestPair || jupPrice) {
        stats[token.mint] = {
          mint: token.mint,
          price: jupPrice ? parseFloat(jupPrice) : parseFloat(bestPair.priceUsd),
          priceChange24h: parseFloat(bestPair?.priceChange?.h24 || '0'),
          volume24h: parseFloat(bestPair?.volume?.h24 || '0'),
          marketCap: parseFloat(bestPair?.fdv || bestPair?.marketCap || '0'),
          symbol: token.symbol,
          name: token.name,
          icon: token.icon
        };
      } else {
        // Mock fallback if both APIs fail for a specific token
        stats[token.mint] = {
          mint: token.mint,
          price: token.symbol === 'SOL' ? 145 : (token.symbol === 'USDC' ? 1 : Math.random() * 2),
          priceChange24h: (Math.random() - 0.5) * 10,
          volume24h: 1000000 + Math.random() * 5000000,
          marketCap: 500000000 + Math.random() * 1000000000,
          symbol: token.symbol,
          name: token.name,
          icon: token.icon
        };
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching token stats:', error);
    
    // Global fallback for all tokens
    const stats: Record<string, TokenStats> = {};
    SOLANA_TOKENS.forEach(token => {
      stats[token.mint] = {
        mint: token.mint,
        price: token.symbol === 'SOL' ? 145 : (token.symbol === 'USDC' ? 1 : Math.random() * 2),
        priceChange24h: (Math.random() - 0.5) * 5,
        volume24h: 1200000,
        marketCap: 450000000,
        symbol: token.symbol,
        name: token.name,
        icon: token.icon
      };
    });
    return stats;
  }
}

export function generateHistoricalData(currentPrice: number, count: number = 200): CandleData[] {
  const data: CandleData[] = [];
  let lastClose = currentPrice;
  const now = Math.floor(Date.now() / 1000);
  const interval = 300; // 5 minute candles

  for (let i = count; i >= 0; i--) {
    const volatility = 0.02; // 2% max movement per candle
    const change = lastClose * volatility * (Math.random() - 0.5);
    const open = lastClose - change;
    const close = lastClose;
    const high = Math.max(open, close) + Math.random() * (lastClose * volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (lastClose * volatility * 0.5);
    
    data.push({
      time: (now - (i * interval)) as UTCTimestamp,
      open,
      high,
      low,
      close,
    });
    
    lastClose = open;
  }
  return data.sort((a, b) => a.time - b.time);
}
