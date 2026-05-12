import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DUNE_API_KEY = os.getenv("DUNE_API_KEY")
NEW_TRADES_QUERY_ID = 7444299

HEADERS = {"X-Dune-API-Key": DUNE_API_KEY}
BASE = "https://api.dune.com/api/v1"


def fetch_query(query_id):
    print(f"Fetching query {query_id}...")
    resp = requests.get(
        f"{BASE}/query/{query_id}/results",
        headers=HEADERS,
    )
    resp.raise_for_status()
    rows = resp.json()["result"]["rows"]
    print(f"Got {len(rows)} rows")
    return rows


def fetch_and_save():
    rows = fetch_query(NEW_TRADES_QUERY_ID)
    df = pd.DataFrame(rows)

    # Derived features (same as fetch_trades.py)
    df['price_impact'] = (
        abs(df['execution_price'] - df['pool_ref_price']) / df['pool_ref_price']
    )
    df['trade_size_vs_avg'] = df['trade_size_usd'] / df['avg_trade_size_1h']
    df['imbalance_ratio'] = (
        (df['buy_volume_1h'] - df['sell_volume_1h']) / df['pool_volume_1h']
    )
    df['large_trade_count'] = df['large_trade_count'].fillna(0)

    df = df.sort_values('block_time').reset_index(drop=True)
    df['block_time_dt'] = pd.to_datetime(df['block_time'])
    df['trade_frequency'] = df['block_time_dt'].apply(
        lambda t: ((df['block_time_dt'] >= t - pd.Timedelta(hours=1)) & (df['block_time_dt'] <= t)).sum()
    )
    df['large_trade_ratio'] = df['large_trade_count'] / df['trade_frequency']
    df['slippage'] = df['price_impact']
    df['true_outcome'] = (df['slippage'] > 0.003).astype(int)

    df = df.drop(columns=['block_time_dt'])

    df.to_json("new_trades.json", orient="records", indent=2)
    print(f"Saved {len(df)} new trades to new_trades.json")

    positives = df['true_outcome'].sum()
    print(f"Positives: {positives}/{len(df)} ({100*positives/len(df):.1f}%)")


if __name__ == "__main__":
    fetch_and_save()
