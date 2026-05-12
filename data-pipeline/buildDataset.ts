import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { buildTradeDataset } from './datasetService';

async function main() {
  console.log('Building dataset for 200 trades...');
  const dataset = await buildTradeDataset();

  const outPath = path.join(process.cwd(), 'historical_dataset.json');
  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));

  console.log(`\nDone. Saved ${dataset.length} entries to historical_dataset.json`);

  const avg_mu1 = dataset.reduce((s, d) => s + d.mu1_raw, 0) / dataset.length;
  const avg_mu2 = dataset.reduce((s, d) => s + d.mu2_raw, 0) / dataset.length;
  const avg_mu3 = dataset.reduce((s, d) => s + d.mu3_raw, 0) / dataset.length;
  const positives = dataset.filter(d => d.true_outcome === 1).length;

  console.log(`\nSummary:`);
  console.log(`  Trades: ${dataset.length} (${positives} positive, ${dataset.length - positives} negative)`);
  console.log(`  Avg μ1 (Liquidity):   ${avg_mu1.toFixed(3)}`);
  console.log(`  Avg μ2 (Volatility):  ${avg_mu2.toFixed(3)}`);
  console.log(`  Avg μ3 (Order Flow):  ${avg_mu3.toFixed(3)}`);
}

main().catch(console.error);
