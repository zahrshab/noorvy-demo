import newTradesData from '../../new_trades.json';
import plattParamsData from '../../platt_params.json';
import { getLiquidityAnalysis, getVolatilityAnalysis, getOrderFlowAnalysis, getDisagreementNarrative } from './agentLogic';
import { computeETI, ETIResult } from './computeETI';

const SLIPPAGE_THRESHOLD = 0.003;

let _snapshotIndex = 0; 

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function applyPlatt(mu_raw: number, a: number, b: number): number {
  return sigmoid(a * mu_raw + b);
}

// Method 2: skip Platt if degenerate (|a| < 0.1), use mu_raw directly
function applyCalibration(mu_raw: number, a: number, b: number): number {
  if (Math.abs(a) < 0.1) return mu_raw;
  return applyPlatt(mu_raw, a, b);
}

export interface TradeAnalysisResult {
  trade_size_usd: number;
  snapshot: any;
  eti: ETIResult;
  narrative: string;
}

export async function analyzeNextTrade(trade_size_usd: number): Promise<TradeAnalysisResult> {
  // Use first trade in new_trades.json as market snapshot (do NOT pop)
  const newTrades = newTradesData as any[];
  if (newTrades.length === 0) throw new Error('No market snapshot available');

  const snapshot = newTrades[_snapshotIndex % newTrades.length];      
  _snapshotIndex++;   

  // Override trade-size-dependent features with user input
  const trade_size_vs_avg = trade_size_usd / snapshot.avg_trade_size_1h;
  // Scale price_impact proportionally to trade size relative to snapshot
  const price_impact = snapshot.price_impact * (trade_size_usd / snapshot.trade_size_usd);

  // Load Platt params
  const platt = plattParamsData as any;

  //  const fs = await import('fs');                   
  //   fs.writeFileSync('../../debug_input.json', JSON.stringify({                                         
  //   timestamp: new Date().toISOString(),           
  //   trade_size_usd,                                
  //   trade_size_vs_avg,                             
  //   price_impact,                                  
  //   snapshot,}, null, 2)); 
    localStorage.setItem('debug_input', JSON.stringify({ timestamp: new Date().toISOString(), trade_size_usd, trade_size_vs_avg, price_impact, snapshot }, null, 2));  

  // Run all 3 agents in parallel (agents do NOT see slippage or true_outcome)
  const res1 = await getLiquidityAnalysis({
    trade_size_usd,
    pool_volume_1h:    snapshot.pool_volume_1h,
    avg_trade_size_1h: snapshot.avg_trade_size_1h,
    trade_size_vs_avg,
    price_impact,
  }, SLIPPAGE_THRESHOLD);
  const res2 = await getVolatilityAnalysis({
    price_volatility_5m: snapshot.price_volatility_5m,
    price_range_5m:      snapshot.price_range_5m,
    hour_of_day:         snapshot.hour_of_day,
  }, SLIPPAGE_THRESHOLD);
  const res3 = await getOrderFlowAnalysis({
    buy_volume_1h:    snapshot.buy_volume_1h,
    sell_volume_1h:   snapshot.sell_volume_1h,
    imbalance_ratio:  snapshot.imbalance_ratio,
    trade_frequency:  snapshot.trade_frequency,
    large_trade_count: snapshot.large_trade_count,
    large_trade_ratio: snapshot.large_trade_ratio,
  }, SLIPPAGE_THRESHOLD);

  // Apply calibration (Method 2: skip Platt if degenerate)
  const mu1_cal = applyCalibration(res1.mu, platt.agent1.a, platt.agent1.b);
  const mu2_cal = applyCalibration(res2.mu, platt.agent2.a, platt.agent2.b);
  const mu3_cal = applyCalibration(res3.mu, platt.agent3.a, platt.agent3.b);

  const agentResults = {
    liquidity:  { mu_raw: res1.mu, mu_calibrated: mu1_cal, reasoning: res1.reasoning },
    volatility: { mu_raw: res2.mu, mu_calibrated: mu2_cal, reasoning: res2.reasoning },
    orderFlow:  { mu_raw: res3.mu, mu_calibrated: mu3_cal, reasoning: res3.reasoning },
  };

  const eti = computeETI(agentResults);

  const { narrative } = await getDisagreementNarrative({
    trade_size_usd,
    liquidity:  { mu_calibrated: mu1_cal, reasoning: res1.reasoning },
    volatility: { mu_calibrated: mu2_cal, reasoning: res2.reasoning },
    orderFlow:  { mu_calibrated: mu3_cal, reasoning: res3.reasoning },
    poe_mu:     eti.poe.mu_calibrated,
    eti_score:  eti.eti_score_A,
  });

  return { trade_size_usd, snapshot, eti, narrative };
}
