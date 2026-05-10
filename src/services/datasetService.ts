import Database from 'better-sqlite3';
import path from 'path';
import {
  getLiquidityAnalysis,
  getVolatilityAnalysis,
  getOrderFlowAnalysis,
} from './agentLogic';

const SLIPPAGE_THRESHOLD = 0.003;
const DB_PATH = path.join(process.cwd(), 'trades.db');

export interface Trade {
  tx_hash: string;
  block_time: string;
  execution_price: number;
  pool_ref_price: number;
  trade_size_usd: number;
  token_pair: string;
  dex: string;
  token_bought_amount: number;
  token_sold_amount: number;
  hour_of_day: number;
  pool_volume_1h: number;
  avg_trade_size_1h: number;
  price_range_5m: number;
  price_volatility_5m: number;
  trade_frequency: number;
  price_impact: number;
  trade_size_vs_avg: number;
  buy_volume_1h: number;
  sell_volume_1h: number;
  large_trade_count: number;
  imbalance_ratio: number;
  large_trade_ratio: number;
  slippage: number;
  true_outcome: number;
}

export interface DatasetEntry {
  features: Trade;
  mu1_raw: number;
  mu2_raw: number;
  mu3_raw: number;
  true_outcome: number;
  reasoning1: string;
  reasoning2: string;
  reasoning3: string;
}

export function loadTradesFromDb(limit = 200): Trade[] {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare('SELECT * FROM trades ORDER BY block_time ASC LIMIT ?').all(limit) as Trade[];
  db.close();
  return rows;
}

export async function buildTradeDataset(): Promise<DatasetEntry[]> {
  const trades = loadTradesFromDb();
  console.log(`Loaded ${trades.length} trades from trades.db`);

  const dataset: DatasetEntry[] = [];

  for (const trade of trades) {
    try {
      console.log(`Processing trade: ${trade.tx_hash}`);

      const [res1, res2, res3] = await Promise.all([
        getLiquidityAnalysis(
          {
            trade_size_usd: trade.trade_size_usd,
            pool_volume_1h: trade.pool_volume_1h,
            avg_trade_size_1h: trade.avg_trade_size_1h,
            trade_size_vs_avg: trade.trade_size_vs_avg,
            price_impact: trade.price_impact,
          },
          SLIPPAGE_THRESHOLD
        ),
        getVolatilityAnalysis(
          {
            price_volatility_5m: trade.price_volatility_5m,
            price_range_5m: trade.price_range_5m,
            hour_of_day: trade.hour_of_day,
          },
          SLIPPAGE_THRESHOLD
        ),
        getOrderFlowAnalysis(
          {
            buy_volume_1h: trade.buy_volume_1h,
            sell_volume_1h: trade.sell_volume_1h,
            imbalance_ratio: trade.imbalance_ratio,
            trade_frequency: trade.trade_frequency,
            large_trade_count: trade.large_trade_count,
            large_trade_ratio: trade.large_trade_ratio,
          },
          SLIPPAGE_THRESHOLD
        ),
      ]);

      dataset.push({
        features: trade,
        mu1_raw: res1.mu,
        mu2_raw: res2.mu,
        mu3_raw: res3.mu,
        true_outcome: trade.true_outcome,
        reasoning1: res1.reasoning,
        reasoning2: res2.reasoning,
        reasoning3: res3.reasoning,
      });
    } catch (error) {
      console.error(`Error processing trade ${trade.tx_hash}:`, error);
    }
  }

  return dataset;
}