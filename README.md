# ETI Demo — Epistemic Tension Index for Solana

A pre-trade risk analysis system for Solana DEX trades. Before you execute a swap, three specialized AI agents independently estimate slippage risk from different angles; their disagreement is measured and surfaced as the **ETI (Epistemic Tension Index)** — a 0–100 score that tells you how confident to be in the consensus forecast.

---

## How It Works

### The Three Agents

Each agent sees only its own domain of market data and returns `mu` (probability that slippage exceeds 0.3%) and `sigma` (its own uncertainty):

| Agent | Signal | Key reasoning |
|---|---|---|
| **Liquidity** | Trade size vs. pool volume | Large trades relative to pool depth → higher price impact |
| **Volatility** | Price std dev & range (5 min) | Fast-moving prices make execution price unpredictable |
| **Order Flow** | Buy/sell imbalance, whale ratio | Trading against dominant flow increases adverse selection |

### ETI Score

After the agents run, their estimates are fused using **Product of Experts (PoE)** — a precision-weighted combination in logit space. The ETI score measures how far each agent's belief is from the consensus using **KL divergence**, then normalises to 0–100:

- **0–24**: Low uncertainty — agents broadly agree, trust the consensus
- **25–54**: Moderate — some divergence, proceed with awareness
- **55–100**: High uncertainty — agents strongly disagree, treat the consensus probability with caution

### Calibration

Raw agent outputs are calibrated with **Platt scaling** (`platt_params.json`) fit against a historical dataset of SOL/USDC trades (`historical_dataset.json`). Per-agent uncertainty (`sigma`) is estimated with a KNN Bernoulli approach using the 10 nearest historical neighbours in logit space.

---

## Architecture

```
new_trades.json          ← live market snapshot (liquidity, volatility, order flow features)
historical_dataset.json  ← labelled training trades (used for KNN sigma + Platt fitting)
platt_params.json        ← Platt scaling parameters (a, b per agent)

analyzeTradeService.ts   ← orchestrates the full pipeline for a given trade_size_usd
agentLogic.ts            ← Claude API calls for each of the 3 agents + narrator
computeETI.ts            ← PoE fusion, KL divergence, ETI score computation
TradingPanel.tsx          ← React UI: trade form + risk modal
api.py                   ← FastAPI server for Dune Analytics queries
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+ (for the Dune API server)
- Anthropic API key

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
DUNE_API_KEY=...           # optional, for the Dune API server
```

## Run Locally

1. Install dependencies:
`npm install`
2. Run the app:
`npm run dev`


---

## UI Integration

`TradingPanel.tsx` is a React component that embeds into a Solana trading interface. When a user enters a trade amount and clicks **ANALYZE RISK**, it:

1. Calls `analyzeNextTrade(trade_size_usd)` with the current market snapshot
2. Runs all three agents in parallel via the Anthropic API
3. Computes ETI score and PoE consensus
4. Generates a plain-English recommendation via a narrator agent
5. Displays results in a modal with expandable per-agent breakdowns

The component is branded as **Noorvy**.

---

## Key Files

| File | Purpose |
|---|---|
| `agentLogic.ts` | Anthropic SDK calls for all 3 agents + narrator |
| `computeETI.ts` | Core ETI math: PoE, KL divergence, Platt scaling, KNN sigma |
| `analyzeTradeService.ts` | Pipeline: fetch snapshot → run agents → calibrate → ETI → narrative |
| `TradingPanel.tsx` | React trading panel UI with risk modal |
| `buildDataset.ts` | Script to build the historical labelled dataset |
| `fit_platt.py` | Script to fit Platt scaling parameters from the dataset |