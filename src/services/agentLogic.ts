import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });
const MODEL_NAME = "claude-haiku-4-5-20251001";

const analysisSchema = {
  name: "report_analysis",
  description: "Report the slippage risk analysis result",
  input_schema: {
    type: "object" as const,
    properties: {
      mu: { type: "number" as const, description: "Probability that slippage exceeds threshold (0-1)" },
      // sigma: { type: "number" as const, description: "Uncertainty in the estimate (0-1)" },
      reasoning: { type: "string" as const, description: "Brief reasoning for the estimate" },
    },
    required: ["mu", "sigma", "reasoning"],
  },
};

export interface AgentResponse {
  mu: number;
  // sigma: number;
  reasoning: string;
}

export interface LiquidityFeatures {
  trade_size_usd: number;
  pool_volume_1h: number;
  avg_trade_size_1h: number;
  trade_size_vs_avg: number;
  price_impact: number;
}

export interface VolatilityFeatures {
  execution_price?: number;
  pool_ref_price?: number;
  price_volatility_5m: number;
  price_range_5m: number;
  hour_of_day: number;
}

export interface OrderFlowFeatures {
  buy_volume_1h: number;
  sell_volume_1h: number;
  imbalance_ratio: number;
  trade_frequency: number;
  large_trade_count: number;
  large_trade_ratio: number;
}

function extractAnalysis(response: Anthropic.Message): AgentResponse {
  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) throw new Error("No tool use block in response");
  return toolUse.input as AgentResponse;
}

/* Agent 1: Liquidity | Thesis: slippage is caused by trade size overwhelming available liquidity. */
export async function getLiquidityAnalysis(
  features: LiquidityFeatures,
  slippageThreshold: number
): Promise<AgentResponse> {
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    temperature: 0,
    system: `You are the Liquidity Agent for the ETI (Epistemic Trading Index) system on Solana.
Your job is to estimate the probability that a SOL/USDC trade will exceed a slippage threshold, based solely on liquidity conditions.
Key reasoning: a large trade relative to pool volume (high trade_size_vs_avg) means more price impact and higher slippage risk.
Return mu (probability 0-1), sigma (your uncertainty 0-1 — high sigma when pool data is sparse or trade size is extreme), and brief reasoning.`,
    messages: [{
      role: "user",
      content: `Analyze this trade's liquidity risk for SOL/USDC:
- trade_size_usd: ${features.trade_size_usd.toFixed(2)} USD
- pool_volume_1h: ${features.pool_volume_1h.toFixed(2)} USD (proxy for available liquidity)
- avg_trade_size_1h: ${features.avg_trade_size_1h.toFixed(2)} USD
- trade_size_vs_avg: ${features.trade_size_vs_avg.toFixed(3)} (1.0 = average sized trade)
- price_impact: ${(features.price_impact * 100).toFixed(4)}%
- slippage threshold: ${(slippageThreshold * 100).toFixed(2)}%

Estimate P(slippage > ${(slippageThreshold * 100).toFixed(2)}%) based purely on liquidity pressure.`,
    }],
    tools: [analysisSchema],
    tool_choice: { type: "any" },
  });

  return extractAnalysis(response);
}

/* Agent 2: Volatility | Thesis: slippage is worse when prices are moving fast. */
export async function getVolatilityAnalysis(
  features: VolatilityFeatures,
  slippageThreshold: number
): Promise<AgentResponse> {
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    temperature: 0, 
    system: `You are the Volatility Agent for the ETI (Epistemic Trading Index) system on Solana.
Your job is to estimate the probability that a SOL/USDC trade will exceed a slippage threshold, based solely on price volatility.
Key reasoning: high price_volatility_5m and wide price_range_5m mean the market is moving fast — execution price is unpredictable and slippage risk is elevated. Hour of day matters: low-liquidity hours (e.g. 2-6 UTC) amplify volatility effects.
Return mu (probability 0-1), sigma (your uncertainty 0-1 — high sigma when volatility is rapidly changing), and brief reasoning.`,
    messages: [{
      role: "user",
      content: `Analyze this trade's volatility risk for SOL/USDC:
- execution_price: ${(features.execution_price ?? 0).toFixed(4)} USD
- pool_ref_price: ${(features.pool_ref_price ?? 0).toFixed(4)} USD (5-min moving average)
- price_volatility_5m: ${features.price_volatility_5m.toFixed(4)} (std dev of price over last 5 min)
- price_range_5m: ${features.price_range_5m.toFixed(4)} USD (max - min over last 5 min)
- hour_of_day: ${features.hour_of_day} (UTC)
- slippage threshold: ${(slippageThreshold * 100).toFixed(2)}%

Estimate P(slippage > ${(slippageThreshold * 100).toFixed(2)}%) based purely on price volatility.`,
    }],
    tools: [analysisSchema],
    tool_choice: { type: "any" },
  });

  return extractAnalysis(response);
}

/* Agent 3: Order Flow Imbalance | Thesis: trading against dominant market direction increases slippage. */
export async function getOrderFlowAnalysis(
  features: OrderFlowFeatures,
  slippageThreshold: number
): Promise<AgentResponse> {
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    temperature: 0, 
    system: `You are the Order Flow Agent for the ETI (Epistemic Trading Index) system on Solana.
Your job is to estimate the probability that a SOL/USDC trade will exceed a slippage threshold, based solely on order flow imbalance.
Key reasoning: when imbalance_ratio is strongly positive (most flow is buying SOL), a new buy order faces adverse price movement and higher slippage. A high large_trade_ratio means whales are active, making fills unpredictable.
Return mu (probability 0-1), sigma (your uncertainty 0-1 — high sigma when trade_frequency is very low), and brief reasoning.`,
    messages: [{
      role: "user",
      content: `Analyze this trade's order flow risk for SOL/USDC:
- buy_volume_1h: ${features.buy_volume_1h.toFixed(2)} USD (SOL buys in last hour)
- sell_volume_1h: ${features.sell_volume_1h.toFixed(2)} USD (SOL sells in last hour)
- imbalance_ratio: ${features.imbalance_ratio.toFixed(3)} (+1 = all buys, -1 = all sells)
- trade_frequency: ${features.trade_frequency} trades in last hour
- large_trade_count: ${features.large_trade_count} trades above $10k in last hour
- large_trade_ratio: ${(features.large_trade_ratio * 100).toFixed(1)}% of trades were large
- slippage threshold: ${(slippageThreshold * 100).toFixed(2)}%

Estimate P(slippage > ${(slippageThreshold * 100).toFixed(2)}%) based purely on order flow pressure.`,
    }],
    tools: [analysisSchema],
    tool_choice: { type: "any" },
  });

  return extractAnalysis(response);
}

export async function getDisagreementNarrative(params: {
  trade_size_usd: number;
  liquidity:  { mu_calibrated: number; reasoning: string };
  volatility: { mu_calibrated: number; reasoning: string };
  orderFlow:  { mu_calibrated: number; reasoning: string };
  poe_mu: number;
  eti_score: number;
}): Promise<{ narrative: string }> {
  const { trade_size_usd, liquidity, volatility, orderFlow, poe_mu, eti_score } = params;

  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 256,
    temperature: 0, 
    system: `You are the ETI Narrator for a Solana pre-trade risk system. Given agent risk estimates and an ETI score, write a concise 1-2 sentence trading recommendation. Be direct: tell the trader whether to proceed, reduce size, or wait. Mention the dominant risk factor. Do not use '—' in your written recommendation. Do not start your text with "Recommendation:"`,
    messages: [{
      role: "user",
      content: `Trade size: $${trade_size_usd.toFixed(0)} USD
ETI Score: ${eti_score.toFixed(1)}/100
PoE consensus P(slippage > 0.3%): ${(poe_mu * 100).toFixed(1)}%

Agents:
- Liquidity (P=${(liquidity.mu_calibrated * 100).toFixed(1)}%): ${liquidity.reasoning}
- Volatility (P=${(volatility.mu_calibrated * 100).toFixed(1)}%): ${volatility.reasoning}
- Order Flow (P=${(orderFlow.mu_calibrated * 100).toFixed(1)}%): ${orderFlow.reasoning}

Write a brief recommendation.`,
    }],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return { narrative: textBlock?.text ?? "Unable to generate narrative." };
}
