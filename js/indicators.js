/**
 * TradingView Indicators Mathematical Engine
 * Calculates SMA, EMA, RSI, Bollinger Bands, MACD, and Heikin-Ashi candles.
 */

const Indicators = {
    /**
     * Simple Moving Average (SMA)
     * @param {Array<{time: number, close: number}>} data 
     * @param {number} period 
     */
    calculateSMA(data, period = 20) {
        const results = [];
        if (!data || data.length < period) return results;

        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        results.push({ time: data[period - 1].time, value: +(sum / period).toFixed(4) });

        for (let i = period; i < data.length; i++) {
            sum += data[i].close - data[i - period].close;
            results.push({ time: data[i].time, value: +(sum / period).toFixed(4) });
        }
        return results;
    },

    /**
     * Exponential Moving Average (EMA)
     * @param {Array<{time: number, close: number}>} data 
     * @param {number} period 
     */
    calculateEMA(data, period = 50) {
        const results = [];
        if (!data || data.length < period) return results;

        const k = 2 / (period + 1);

        // Seed with SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        let prevEma = sum / period;
        results.push({ time: data[period - 1].time, value: +prevEma.toFixed(4) });

        for (let i = period; i < data.length; i++) {
            const currentEma = (data[i].close - prevEma) * k + prevEma;
            results.push({ time: data[i].time, value: +currentEma.toFixed(4) });
            prevEma = currentEma;
        }
        return results;
    },

    /**
     * Relative Strength Index (RSI - Wilder's Smoothing)
     * @param {Array<{time: number, close: number}>} data 
     * @param {number} period 
     */
    calculateRSI(data, period = 14) {
        const results = [];
        if (!data || data.length <= period) return results;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change >= 0) gains += change;
            else losses += Math.abs(change);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        results.push({ time: data[period].time, value: +rsi.toFixed(2) });

        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            const gain = change >= 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
            results.push({ time: data[i].time, value: +rsi.toFixed(2) });
        }
        return results;
    },

    /**
     * Bollinger Bands (SMA, Upper, Lower)
     * @param {Array<{time: number, close: number}>} data 
     * @param {number} period 
     * @param {number} stdDevMultiplier 
     */
    calculateBollingerBands(data, period = 20, stdDevMultiplier = 2) {
        const upper = [];
        const middle = [];
        const lower = [];

        if (!data || data.length < period) return { upper, middle, lower };

        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }
            const sma = sum / period;

            let variance = 0;
            for (let j = i - period + 1; j <= i; j++) {
                variance += Math.pow(data[j].close - sma, 2);
            }
            const stdDev = Math.sqrt(variance / period);

            const time = data[i].time;
            middle.push({ time, value: +sma.toFixed(4) });
            upper.push({ time, value: +(sma + stdDevMultiplier * stdDev).toFixed(4) });
            lower.push({ time, value: +(sma - stdDevMultiplier * stdDev).toFixed(4) });
        }

        return { upper, middle, lower };
    },

    /**
     * MACD (Moving Average Convergence Divergence)
     * @param {Array<{time: number, close: number}>} data 
     * @param {number} fastPeriod 
     * @param {number} slowPeriod 
     * @param {number} signalPeriod 
     */
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEma = this.calculateEMA(data, fastPeriod);
        const slowEma = this.calculateEMA(data, slowPeriod);

        const slowMap = new Map();
        slowEma.forEach(item => slowMap.set(item.time, item.value));

        const macdLine = [];
        fastEma.forEach(item => {
            if (slowMap.has(item.time)) {
                macdLine.push({
                    time: item.time,
                    close: +(item.value - slowMap.get(item.time)).toFixed(4)
                });
            }
        });

        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        const signalMap = new Map();
        signalLine.forEach(item => signalMap.set(item.time, item.value));

        const macdFinal = [];
        const histFinal = [];

        macdLine.forEach(item => {
            const sigVal = signalMap.get(item.time);
            if (sigVal !== undefined) {
                const macdVal = item.close;
                const hist = +(macdVal - sigVal).toFixed(4);
                macdFinal.push({ time: item.time, value: macdVal });
                histFinal.push({
                    time: item.time,
                    value: hist,
                    color: hist >= 0 ? '#089981' : '#f23645'
                });
            }
        });

        return {
            macd: macdFinal,
            signal: signalLine,
            histogram: histFinal
        };
    },

    /**
     * Heikin-Ashi Candle transformation
     * @param {Array<{time: number, open: number, high: number, low: number, close: number, volume?: number}>} data 
     */
    calculateHeikinAshi(data) {
        if (!data || data.length === 0) return [];
        const haData = [];

        let prevHaOpen = data[0].open;
        let prevHaClose = data[0].close;

        for (let i = 0; i < data.length; i++) {
            const curr = data[i];
            const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
            const haOpen = i === 0 ? (curr.open + curr.close) / 2 : (prevHaOpen + prevHaClose) / 2;
            const haHigh = Math.max(curr.high, haOpen, haClose);
            const haLow = Math.min(curr.low, haOpen, haClose);

            haData.push({
                time: curr.time,
                open: +haOpen.toFixed(4),
                high: +haHigh.toFixed(4),
                low: +haLow.toFixed(4),
                close: +haClose.toFixed(4),
                volume: curr.volume
            });

            prevHaOpen = haOpen;
            prevHaClose = haClose;
        }
        return haData;
    }
};

window.Indicators = Indicators;
