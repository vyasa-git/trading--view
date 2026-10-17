# TradingView Clone — Live 1-Minute Candlestick Market Engine

An authentic, high-fidelity TradingView clone designed to deliver real-time 1-minute candlestick market movements, dynamic price pulses, live trade streams, technical indicators, and drawing tools.

---

## 🚀 How to Run

### Method 1: Direct Browser Launch (Easiest)
Simply double-click or open [index.html](file:///C:/Users/Admin/.gemini/antigravity/scratch/tradingview-clone/index.html) directly in any modern browser (**Google Chrome**, **Microsoft Edge**, **Firefox**, or **Brave**).

### Method 2: Local Static Server (Recommended)
If you have Python or Node installed, you can launch a local server:

**Using Python:**
```bash
cd "C:\Users\Admin\.gemini\antigravity\scratch\tradingview-clone"
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

**Using Node / npx:**
```bash
npx serve "C:\Users\Admin\.gemini\antigravity\scratch\tradingview-clone"
```

---

## ⚡ Core Features

### 1. Real-Time 1-Minute Candlestick Movement
- **Live Price Pulse**: Watch the active 1-minute candlestick expand its `High` and `Low` and update its `Close` dynamically with each incoming trade tick.
- **Bar Close Countdown Timer**: Displays a real-time countdown badge (e.g., `00:42`) on the right price scale, showing the exact seconds remaining before the current 1-minute bar closes and the next bar opens.
- **Dynamic Volume Histogram**: Sub-pane volume bars color-coded according to buyer/seller dominance.

### 2. Dual Data Engine (Live Binance Feed + Simulated Fallback)
- **Live Binance WebSocket (`wss://stream.binance.com:9443`)**: Zero-latency live market data for `BTC/USDT`, `ETH/USDT`, `SOL/USDT`, `BNB/USDT`, `DOGE/USDT`.
- **Binance REST Backfill (`https://api.binance.com/api/v3/klines`)**: Automatically loads the last 500 historical 1-minute bars upon switching symbols.
- **Geometric Brownian Motion Simulator**: Realistic price walk with microsecond volatility and spread for non-crypto tickers (`AAPL`, `TSLA`, `NVDA`, `EUR/USD`, `GOLD`) or when operating offline without internet.

### 3. Left Toolbar — Interactive Drawing Tools
- **Crosshair (`C`)**: Default tracking cursor displaying synchronized OHLCV values in the top-left legend.
- **Trend Line**: Click start and end points to anchor trendlines with handle dots.
- **Horizontal Line**: Click any price level to cast an infinite support/resistance level with a price tag.
- **Fibonacci Retracement**: Draw swings to render the golden pocket (`0.382` to `0.618`) and key retracement levels (`0.236`, `0.5`, `0.786`, `1.0`).
- **Rectangle Zone**: Draw order blocks, demand, and consolidation zones.
- **Measurement Ruler**: Calculate price delta and bar distances between two points.
- **Clear All**: Instantly wipe drawings with one click.
- **Delete / Backspace**: Remove the last drawn element.

### 4. Technical Indicators
- **SMA 20 (Simple Moving Average)**: Default blue short-term trend line.
- **EMA 50 (Exponential Moving Average)**: Orange medium-term momentum line.
- **EMA 200 (Exponential Moving Average)**: Long-term institutional trend line.
- **Bollinger Bands (20, 2)**: Dynamic upper and lower volatility envelope channels.
- **Heikin-Ashi Chart Mode**: Toggle between classic candlesticks and smoothed Heikin-Ashi bars in the top bar.

### 5. Multi-Tab Right Sidebar
- **Watchlist**: Real-time quotes across Crypto, Stocks, Forex, and Commodities. Click any item to switch the chart immediately.
- **Live Tape**: Real-time scrolling tick feed showing execution price, quantity, and side (`Buy` in green, `Sell` in red).
- **Technicals & 24h Stats**: Real-time calculated technical summary (`STRONG BUY`, `BUY`, `NEUTRAL`, `SELL`, `STRONG SELL`) and 24h High/Low/Volume metrics.

---

## 🎨 Color Palette Reference (TradingView Dark Theme)
- Canvas Background: `#131722`
- Toolbar & Panels: `#1e222d`
- Borders & Gridlines: `#2a2e39`
- Bullish Green: `#089981`
- Bearish Red: `#f23645`
- Primary Blue Accent: `#2962ff`
- Text Primary: `#d1d4dc`
- Text Secondary: `#787b86`
