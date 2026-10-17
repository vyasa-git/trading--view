/**
 * TradingView Chart Engine
 * Manages Lightweight Charts instance, series (Candlestick, Volume, Indicators),
 * crosshair tracking, real-time tick updates, and resilient canvas fallback.
 */

class ChartEngine {
    constructor(containerId, legendElementId) {
        this.container = document.getElementById(containerId);
        this.legendElement = document.getElementById(legendElementId);
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.indicatorSeries = {};
        this.rsiChart = null;
        this.rsiSeries = null;
        this.macdChart = null;
        this.macdSeries = {};

        this.chartType = 'candles'; // 'candles', 'hollow', 'heikin_ashi', 'line', 'area'
        this.rawCandleData = [];
        this.currentCandle = null;
        this.showVolume = true;
        this.currentBarSpacing = 6;
        this.activeIndicators = {
            volume: true,
            sma20: true,
            ema50: false,
            ema200: false,
            bollinger: false,
            rsi: false,
            macd: false
        };

        this.init();
    }

    init() {
        if (typeof LightweightCharts === 'undefined') {
            console.warn('LightweightCharts CDN not available yet, initializing fallback canvas.');
            this.initFallbackEngine();
            return;
        }

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // TradingView Dark Theme Configuration
        this.chart = LightweightCharts.createChart(this.container, {
            width: width,
            height: height,
            layout: {
                background: { type: 'solid', color: '#131722' },
                textColor: '#787b86',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
                fontSize: 11
            },
            grid: {
                vertLines: { color: '#1e222d', style: 1 },
                horzLines: { color: '#1e222d', style: 1 }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#787b86',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#2a2e39'
                },
                horzLine: {
                    color: '#787b86',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#2962ff'
                }
            },
            rightPriceScale: {
                borderColor: '#2a2e39',
                visible: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2
                }
            },
            timeScale: {
                borderColor: '#2a2e39',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: this.currentBarSpacing || 6,
                minBarSpacing: 1.5,
                tickMarkFormatter: (time) => {
                    if (typeof time === 'number') {
                        const date = new Date(time * 1000);
                        return date.toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                    }
                    return null;
                }
            },
            localization: {
                locale: 'en-IN',
                dateFormat: 'yyyy-MM-dd',
                timeFormatter: (time) => {
                    if (typeof time === 'number') {
                        const date = new Date(time * 1000);
                        return date.toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });
                    }
                    return time;
                }
            }
        });

        // Candlestick Series (TradingView colors)
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#089981',
            downColor: '#f23645',
            borderVisible: false,
            wickUpColor: '#089981',
            wickDownColor: '#f23645'
        });

        // Volume Histogram (in bottom 20% of main chart)
        this.volumeSeries = this.chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: '', // overlay inside main area
            scaleMargins: {
                top: 0.82,
                bottom: 0
            },
            visible: this.showVolume
        });

        // Initialize indicator series placeholders
        this.initIndicatorSeries();

        // Subscribe to crosshair movement for legend update
        this.chart.subscribeCrosshairMove(param => {
            this.updateLegend(param);
        });

        // Handle window resizing
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    resize() {
        if (this.chart && this.container) {
            this.chart.applyOptions({
                width: this.container.clientWidth,
                height: this.container.clientHeight
            });
        }
        if (this.fallbackEngine) {
            this.fallbackEngine.render();
        }
    }

    zoomIn() {
        if (this.chart) {
            const currentSpacing = this.currentBarSpacing || 6;
            const newSpacing = Math.min(50, +(currentSpacing * 1.3).toFixed(2));
            this.currentBarSpacing = newSpacing;
            this.chart.timeScale().applyOptions({ barSpacing: newSpacing });
        }
        if (this.fallbackEngine) {
            this.fallbackEngine.candleSpacing = Math.min(40, (this.fallbackEngine.candleSpacing || 10) * 1.3);
            this.fallbackEngine.render();
        }
    }

    zoomOut() {
        if (this.chart) {
            const currentSpacing = this.currentBarSpacing || 6;
            const newSpacing = Math.max(1.5, +(currentSpacing / 1.3).toFixed(2));
            this.currentBarSpacing = newSpacing;
            this.chart.timeScale().applyOptions({ barSpacing: newSpacing });
        }
        if (this.fallbackEngine) {
            this.fallbackEngine.candleSpacing = Math.max(2, (this.fallbackEngine.candleSpacing || 10) / 1.3);
            this.fallbackEngine.render();
        }
    }

    resetZoom() {
        if (this.chart) {
            this.currentBarSpacing = 6;
            this.chart.timeScale().applyOptions({ barSpacing: 6 });
            this.chart.timeScale().fitContent();
        }
        if (this.fallbackEngine) {
            this.fallbackEngine.candleSpacing = 10;
            this.fallbackEngine.render();
        }
    }

    initIndicatorSeries() {
        if (!this.chart) return;

        // SMA 20 (Blue)
        this.indicatorSeries.sma20 = this.chart.addLineSeries({
            color: '#2962ff',
            lineWidth: 2,
            title: 'SMA 20',
            visible: this.activeIndicators.sma20
        });

        // EMA 50 (Orange)
        this.indicatorSeries.ema50 = this.chart.addLineSeries({
            color: '#ff9800',
            lineWidth: 2,
            title: 'EMA 50',
            visible: this.activeIndicators.ema50
        });

        // EMA 200 (Pink)
        this.indicatorSeries.ema200 = this.chart.addLineSeries({
            color: '#e91e63',
            lineWidth: 2,
            title: 'EMA 200',
            visible: this.activeIndicators.ema200
        });

        // Bollinger Bands
        this.indicatorSeries.bbUpper = this.chart.addLineSeries({
            color: '#26a69a',
            lineWidth: 1,
            lineStyle: 2,
            title: 'BB Upper',
            visible: this.activeIndicators.bollinger
        });
        this.indicatorSeries.bbMiddle = this.chart.addLineSeries({
            color: '#ab47bc',
            lineWidth: 1,
            title: 'BB Basis',
            visible: this.activeIndicators.bollinger
        });
        this.indicatorSeries.bbLower = this.chart.addLineSeries({
            color: '#ef5350',
            lineWidth: 1,
            lineStyle: 2,
            title: 'BB Lower',
            visible: this.activeIndicators.bollinger
        });
    }

    /**
     * Load full historical candlestick dataset
     */
    setData(candles) {
        if (!candles || candles.length === 0) return;
        this.rawCandleData = [...candles];
        this.currentCandle = { ...candles[candles.length - 1] };

        if (!this.chart) {
            if (this.fallbackEngine) this.fallbackEngine.setData(candles);
            return;
        }

        const displayCandles = this.getProcessedCandles();
        this.candlestickSeries.setData(displayCandles);

        // Populate volume
        const volumeData = candles.map(c => ({
            time: c.time,
            value: c.volume || 10,
            color: c.close >= c.open ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)'
        }));
        this.volumeSeries.setData(volumeData);

        // Calculate and apply indicators
        this.recalculateIndicators();

        this.chart.timeScale().fitContent();
        this.updateLegendWithCandle(this.currentCandle);
    }

    /**
     * Real-time 1-minute tick update: dynamic price pulse!
     */
    updateTick(candle, isNewBar) {
        this.currentCandle = { ...candle };

        if (!this.chart) {
            if (this.fallbackEngine) this.fallbackEngine.updateTick(candle);
            return;
        }

        if (isNewBar) {
            // New 1m bar initialized!
            this.rawCandleData.push(candle);
            // Limit in-memory array to 1000 candles to keep performance blistering fast
            if (this.rawCandleData.length > 1000) {
                this.rawCandleData.shift();
            }
            this.recalculateIndicators();
        } else {
            // Update last candle
            if (this.rawCandleData.length > 0) {
                this.rawCandleData[this.rawCandleData.length - 1] = { ...candle };
            }
        }

        const candleToRender = this.chartType === 'heikin_ashi'
            ? Indicators.calculateHeikinAshi(this.rawCandleData.slice(-2))[1] || candle
            : candle;

        // Dynamic 1m candle pulse update
        this.candlestickSeries.update(candleToRender);

        // Volume update
        this.volumeSeries.update({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)'
        });

        this.updateLegendWithCandle(candle);
    }

    setChartType(type) {
        this.chartType = type;
        if (!this.chart) return;

        const processed = this.getProcessedCandles();
        this.candlestickSeries.setData(processed);
    }

    getProcessedCandles() {
        if (this.chartType === 'heikin_ashi') {
            return Indicators.calculateHeikinAshi(this.rawCandleData);
        }
        return this.rawCandleData;
    }

    recalculateIndicators() {
        if (!this.rawCandleData || this.rawCandleData.length === 0) return;

        // SMA 20
        if (this.activeIndicators.sma20 && this.indicatorSeries.sma20) {
            const smaData = Indicators.calculateSMA(this.rawCandleData, 20);
            this.indicatorSeries.sma20.setData(smaData);
        }

        // EMA 50
        if (this.activeIndicators.ema50 && this.indicatorSeries.ema50) {
            const emaData = Indicators.calculateEMA(this.rawCandleData, 50);
            this.indicatorSeries.ema50.setData(emaData);
        }

        // EMA 200
        if (this.activeIndicators.ema200 && this.indicatorSeries.ema200) {
            const ema200Data = Indicators.calculateEMA(this.rawCandleData, 200);
            this.indicatorSeries.ema200.setData(ema200Data);
        }

        // Bollinger Bands
        if (this.activeIndicators.bollinger && this.indicatorSeries.bbUpper) {
            const bb = Indicators.calculateBollingerBands(this.rawCandleData, 20, 2);
            this.indicatorSeries.bbUpper.setData(bb.upper);
            this.indicatorSeries.bbMiddle.setData(bb.middle);
            this.indicatorSeries.bbLower.setData(bb.lower);
        }
    }

    toggleVolume(isVisible) {
        this.showVolume = (isVisible !== undefined) ? isVisible : !this.showVolume;
        this.activeIndicators.volume = this.showVolume;
        if (this.volumeSeries) {
            this.volumeSeries.applyOptions({ visible: this.showVolume });
        }
        if (this.currentCandle) {
            this.updateLegendWithCandle(this.currentCandle);
        }
        return this.showVolume;
    }

    toggleIndicator(indicatorKey, isEnabled) {
        if (indicatorKey === 'volume') {
            return this.toggleVolume(isEnabled);
        }

        this.activeIndicators[indicatorKey] = isEnabled;

        if (indicatorKey === 'bollinger') {
            if (this.indicatorSeries.bbUpper) {
                this.indicatorSeries.bbUpper.applyOptions({ visible: isEnabled });
                this.indicatorSeries.bbMiddle.applyOptions({ visible: isEnabled });
                this.indicatorSeries.bbLower.applyOptions({ visible: isEnabled });
            }
        } else if (this.indicatorSeries[indicatorKey]) {
            this.indicatorSeries[indicatorKey].applyOptions({ visible: isEnabled });
        }

        this.recalculateIndicators();
    }

    updateLegend(param) {
        if (!param || !param.time || !this.candlestickSeries) {
            if (this.currentCandle) {
                this.updateLegendWithCandle(this.currentCandle);
            }
            return;
        }

        const data = param.seriesData.get(this.candlestickSeries);
        if (data) {
            this.updateLegendWithCandle(data);
        }
    }

    updateLegendWithCandle(c) {
        if (!this.legendElement || !c) return;

        const change = c.close - c.open;
        const changePct = c.open !== 0 ? ((change / c.open) * 100).toFixed(2) : '0.00';
        const isUp = change >= 0;
        const colorClass = isUp ? 'tv-text-green' : 'tv-text-red';
        const sign = isUp ? '+' : '';

        this.legendElement.innerHTML = `
            <span class="legend-item"><span class="legend-label">O</span><span class="${colorClass}">${c.open.toFixed(2)}</span></span>
            <span class="legend-item"><span class="legend-label">H</span><span class="${colorClass}">${c.high.toFixed(2)}</span></span>
            <span class="legend-item"><span class="legend-label">L</span><span class="${colorClass}">${c.low.toFixed(2)}</span></span>
            <span class="legend-item"><span class="legend-label">C</span><span class="${colorClass}">${c.close.toFixed(2)}</span></span>
            <span class="legend-item"><span class="legend-label">Chg</span><span class="${colorClass}">${sign}${change.toFixed(2)} (${sign}${changePct}%)</span></span>
            ${(this.showVolume && c.volume) ? `<span class="legend-item"><span class="legend-label">Vol</span><span class="tv-text-gray">${c.volume.toFixed(2)}</span></span>` : ''}
        `;
    }

    coordinateToPrice(y) {
        if (this.candlestickSeries && this.candlestickSeries.coordinateToPrice) {
            return this.candlestickSeries.coordinateToPrice(y);
        }
        return null;
    }

    /**
     * Resilient HTML5 Canvas Fallback Renderer
     * Activates if CDN fails or runs completely offline without network
     */
    initFallbackEngine() {
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        this.container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        this.fallbackEngine = {
            canvas,
            ctx,
            candles: [],
            setData: (data) => {
                this.fallbackEngine.candles = data;
                this.fallbackEngine.render();
            },
            updateTick: (candle) => {
                const len = this.fallbackEngine.candles.length;
                if (len > 0) {
                    this.fallbackEngine.candles[len - 1] = candle;
                } else {
                    this.fallbackEngine.candles.push(candle);
                }
                this.fallbackEngine.render();
                this.updateLegendWithCandle(candle);
            },
            render: () => {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;
                const candles = this.fallbackEngine.candles;
                if (!candles || candles.length === 0) return;

                // Background
                ctx.fillStyle = '#131722';
                ctx.fillRect(0, 0, width, height);

                // Visible candles
                const visibleCount = Math.min(candles.length, Math.floor(width / 10));
                const slice = candles.slice(-visibleCount);

                let minPrice = Infinity;
                let maxPrice = -Infinity;
                slice.forEach(c => {
                    if (c.low < minPrice) minPrice = c.low;
                    if (c.high > maxPrice) maxPrice = c.high;
                });
                const pricePadding = (maxPrice - minPrice) * 0.08;
                minPrice -= pricePadding;
                maxPrice += pricePadding;
                const range = maxPrice - minPrice || 1;

                const candleWidth = (width - 70) / visibleCount;

                // Grid lines
                ctx.strokeStyle = '#1e222d';
                ctx.lineWidth = 1;
                for (let i = 1; i <= 4; i++) {
                    const y = height * (i / 5);
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width - 70, y);
                    ctx.stroke();

                    // Price label
                    const priceVal = maxPrice - (range * (i / 5));
                    ctx.fillStyle = '#787b86';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(priceVal.toFixed(2), width - 60, y + 3);
                }

                // Render Candles
                slice.forEach((c, i) => {
                    const x = i * candleWidth + candleWidth * 0.5;
                    const yOpen = height - ((c.open - minPrice) / range) * height;
                    const yClose = height - ((c.close - minPrice) / range) * height;
                    const yHigh = height - ((c.high - minPrice) / range) * height;
                    const yLow = height - ((c.low - minPrice) / range) * height;

                    const isUp = c.close >= c.open;
                    ctx.strokeStyle = isUp ? '#089981' : '#f23645';
                    ctx.fillStyle = isUp ? '#089981' : '#f23645';

                    // Wick
                    ctx.beginPath();
                    ctx.moveTo(x, yHigh);
                    ctx.lineTo(x, yLow);
                    ctx.stroke();

                    // Body
                    const bodyTop = Math.min(yOpen, yClose);
                    const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
                    const barW = Math.max(candleWidth * 0.7, 2);
                    ctx.fillRect(x - barW / 2, bodyTop, barW, bodyHeight);
                });
            }
        };

        window.addEventListener('resize', () => {
            if (this.fallbackEngine) this.fallbackEngine.render();
        });
    }
}

window.ChartEngine = ChartEngine;
