import historicalDataset from '../../historical_dataset.json';
import plattParams from '../../platt_params.json';

const K = 10;

function logit(p: number): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return Math.log(clamped / (1 - clamped));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function applyPlatt(mu_raw: number, a: number, b: number): number {
  return sigmoid(a * mu_raw + b);
}

// Option A: Bernoulli σ from binary outcomes, with floor 0.15
function computeSigmaBernoulli(
  hist: { logit_mu: number; true_outcome: number }[],
  logit_new: number
): number {
  const neighbors = hist
    .map(h => ({ ...h, dist: Math.abs(h.logit_mu - logit_new) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, K);

  const p = neighbors.reduce((s, h) => s + h.true_outcome, 0) / K;
  return Math.max(0.15, Math.sqrt(p * (1 - p)));
}

function klDivergence(
  mu_i: number, sigma_i: number,
  mu_poe: number, sigma_poe: number
): number {
  if (sigma_i === 0 || sigma_poe === 0) return 0;
  return (
    Math.log(sigma_poe / sigma_i) +
    (sigma_i ** 2 + (mu_i - mu_poe) ** 2) / (2 * sigma_poe ** 2) -
    0.5
  );
}

export interface ETIResult {
  agents: {
    liquidity:  { mu_raw: number; mu_calibrated: number; mu_logit: number; sigma: number; kl: number; reasoning: string };
    volatility: { mu_raw: number; mu_calibrated: number; mu_logit: number; sigma: number; kl: number; reasoning: string };
    orderFlow:  { mu_raw: number; mu_calibrated: number; mu_logit: number; sigma: number; kl: number; reasoning: string };
  };
  poe: { mu_logit: number; sigma: number; mu_calibrated: number };
  // raw_kl: number;      // raw mean KL divergence
  eti_score_A: number; // KL normalized to 0–100 index
  // eti_score_B: number; // Variance of μ_calibrated (Option B)
}

export function computeETI(agents: {
  liquidity:  { mu_raw: number; mu_calibrated: number; reasoning: string };
  volatility: { mu_raw: number; mu_calibrated: number; reasoning: string };
  orderFlow:  { mu_raw: number; mu_calibrated: number; reasoning: string };
}): ETIResult {
  const dataset = historicalDataset as any[];
  const platt   = plattParams as any;

  // Build hist arrays with both true_outcome (for Option A) and slippage
  const hist1 = dataset.map((d: any) => ({
    logit_mu: logit(applyPlatt(d.mu1_raw, platt.agent1.a, platt.agent1.b)),
    true_outcome: d.true_outcome,
  }));
  const hist2 = dataset.map((d: any) => ({
    logit_mu: logit(applyPlatt(d.mu2_raw, platt.agent2.a, platt.agent2.b)),
    true_outcome: d.true_outcome,
  }));
  const hist3 = dataset.map((d: any) => ({
    logit_mu: logit(applyPlatt(d.mu3_raw, platt.agent3.a, platt.agent3.b)),
    true_outcome: d.true_outcome,
  }));

  // logit for new trade
  const logit1 = logit(agents.liquidity.mu_calibrated);
  const logit2 = logit(agents.volatility.mu_calibrated);
  const logit3 = logit(agents.orderFlow.mu_calibrated);

  // Option A: KNN Bernoulli σ with floor 0.15
  const sigma1 = computeSigmaBernoulli(hist1, logit1);
  const sigma2 = computeSigmaBernoulli(hist2, logit2);
  const sigma3 = computeSigmaBernoulli(hist3, logit3);

  // PoE — precision-weighted combination in logit space
  const prec1 = 1 / sigma1 ** 2;
  const prec2 = 1 / sigma2 ** 2;
  const prec3 = 1 / sigma3 ** 2;

  const prec_poe     = prec1 + prec2 + prec3;
  const sigma_poe    = Math.sqrt(1 / prec_poe);
  const mu_logit_poe = (logit1 * prec1 + logit2 * prec2 + logit3 * prec3) / prec_poe;

  // KL divergence per agent vs PoE
  const kl1 = klDivergence(logit1, sigma1, mu_logit_poe, sigma_poe);
  const kl2 = klDivergence(logit2, sigma2, mu_logit_poe, sigma_poe);
  const kl3 = klDivergence(logit3, sigma3, mu_logit_poe, sigma_poe);

  const raw_kl = (kl1 + kl2 + kl3) / 3;

  // Option B: variance of μ_calibrated, scaled to [0, 25]
  const mus = [agents.liquidity.mu_calibrated, agents.volatility.mu_calibrated, agents.orderFlow.mu_calibrated];
  const mu_mean = mus.reduce((s, x) => s + x, 0) / 3;
  const eti_score_B = mus.reduce((s, x) => s + (x - mu_mean) ** 2, 0) / 3 * 100;

  // Option A: normalize raw KL to 0–100 index
  const eti_score_A = (1 - Math.exp(-raw_kl / 50)) * 100;

  return {
    agents: {
      liquidity:  { ...agents.liquidity,  mu_logit: logit1, sigma: sigma1, kl: kl1 },
      volatility: { ...agents.volatility, mu_logit: logit2, sigma: sigma2, kl: kl2 },
      orderFlow:  { ...agents.orderFlow,  mu_logit: logit3, sigma: sigma3, kl: kl3 },
    },
    poe: { mu_logit: mu_logit_poe, sigma: sigma_poe, mu_calibrated: sigmoid(mu_logit_poe) },
    // raw_kl,
    eti_score_A,
    // eti_score_B,
  };
}
