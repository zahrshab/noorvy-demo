
export const SOLANA_TOKENS = [
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    id: 'usd-coin',
    symbol: 'USDC',
    name: 'USDC',
    mint: 'EPjFWdd5AufqztS2n278P167UddxS1S2vVoUcwdtl8',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  {
    id: 'jupiter-exchange-solana',
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrPBW9iGZSEvRteAXqS9HNC3asonC3fvVswY7a',
    icon: 'https://static.jup.ag/jup/icon.png',
  },
  {
    id: 'jito-governance-token',
    symbol: 'JTO',
    name: 'Jito',
    mint: 'jtojtomepa8beP8AuMpuFpxvBG3AbVeZ79Yreztv7U',
    icon: 'https://coin-images.coingecko.com/coins/images/33228/large/jto.png?1701137022',
  },
  {
    id: 'raydium',
    symbol: 'RAY',
    name: 'Raydium',
    mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
  },
  {
    id: 'bonk',
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixeb6V1H47GEVkH2QL1',
    icon: 'https://files.swissborg.com/product/wealth-app/assets/ic_crypto_bonk.png',
  },
  {
    id: 'dogwifhat',
    symbol: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanAtss7YdeMaT6c89AohtARogq',
    icon: 'https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/28ae4de5c2e88c6ce633e764eb731a868d3340caba420fba6b6106a5e24a377e.png',
  },
  {
    id: 'popcat',
    symbol: 'POPCAT',
    name: 'Popcat',
    mint: '7GCihpmeo3th97786mCTm89ZVW2Z5dE4Zp3h9nyGpc',
    icon: 'https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/061e0e08cd5c57ebc2fde1ee2165827438662d83be4735ff57916b77a0ed076f.png',
  },
];

export const MINT_LIST = SOLANA_TOKENS.map((t) => t.mint).join(',');
export const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2?ids=';
export const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/';
