import os
import sqlite3
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DUNE_API_KEY = os.getenv("DUNE_API_KEY")
TRADES_QUERY_ID = 7443058

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


def init_db(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            tx_hash TEXT PRIMARY KEY,
            block_time TEXT,
            execution_price REAL,
            pool_ref_price REAL,
            trade_size_usd REAL,
            token_pair TEXT,
            dex TEXT,
            token_bought_amount REAL,
            token_sold_amount REAL,
            hour_of_day INTEGER,
            pool_volume_1h REAL,
            avg_trade_size_1h REAL,
            price_range_5m REAL,
            price_volatility_5m REAL,
            trade_frequency INTEGER,
            price_impact REAL,
            trade_size_vs_avg REAL,
            buy_volume_1h REAL,
            sell_volume_1h REAL,
            large_trade_count INTEGER,
            imbalance_ratio REAL,
            large_trade_ratio REAL,
            slippage REAL,
            true_outcome INTEGER
        )
    """)


def fetch_and_store():
    trades = fetch_query(TRADES_QUERY_ID)
    df = pd.DataFrame(trades)

    # Derived: Agent 1
    df['price_impact'] = (
        abs(df['execution_price'] - df['pool_ref_price']) / df['pool_ref_price']
    )
    df['trade_size_vs_avg'] = df['trade_size_usd'] / df['avg_trade_size_1h']

    # Derived: Agent 3
    df['imbalance_ratio'] = (
        (df['buy_volume_1h'] - df['sell_volume_1h']) / df['pool_volume_1h']
    )
    df['large_trade_count'] = df['large_trade_count'].fillna(0)

    # Recompute trade_frequency from block_time (window func missing ORDER BY in Dune)
    df = df.sort_values('block_time').reset_index(drop=True)
    df['block_time_dt'] = pd.to_datetime(df['block_time'])
    df['trade_frequency'] = df['block_time_dt'].apply(
        lambda t: ((df['block_time_dt'] >= t - pd.Timedelta(hours=1)) & (df['block_time_dt'] <= t)).sum()
    )
    df['large_trade_ratio'] = df['large_trade_count'] / df['trade_frequency']

    df['slippage'] = df['price_impact']
    df['true_outcome'] = (df['slippage'] > 0.005).astype(int)

    conn = sqlite3.connect("trades.db")
    conn.execute("DROP TABLE IF EXISTS trades")
    init_db(conn)

    for _, row in df.iterrows():
        conn.execute("""
            INSERT OR REPLACE INTO trades VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            row.get('tx_hash'),
            row.get('block_time'),
            row.get('execution_price'),
            row.get('pool_ref_price'),
            row.get('trade_size_usd'),
            row.get('token_pair'),
            row.get('dex'),
            row.get('token_bought_amount'),
            row.get('token_sold_amount'),
            int(row.get('hour_of_day', 0)),
            row.get('pool_volume_1h'),
            row.get('avg_trade_size_1h'),
            row.get('price_range_5m'),
            row.get('price_volatility_5m'),
            int(row.get('trade_frequency', 0)),
            row.get('price_impact'),
            row.get('trade_size_vs_avg'),
            row.get('buy_volume_1h'),
            row.get('sell_volume_1h'),
            int(row.get('large_trade_count', 0)),
            row.get('imbalance_ratio'),
            row.get('large_trade_ratio'),
            row.get('slippage'),
            int(row.get('true_outcome', 0)),
        ))

    conn.commit()
    conn.close()
    print(f"Done. Stored {len(df)} trades in trades.db")


if __name__ == "__main__":
    fetch_and_store()
