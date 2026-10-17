/**
 * TradingView App Controller
 * Orchestrates ChartEngine, DataFeed, DrawingTools, UI components,
 * 1-minute countdown timer, watchlist, and live trade tape.
 */

class TradingViewApp {
    constructor() {
        this.currentSymbol = 'NIFTY50';
        this.currentTimeframe = '1m';
        this.watchlistCategory = 'Indian';
        this.searchCategory = 'All';
        this.chartEngine = null;
        this.dataFeed = null;
        this.drawingTools = null;
        this.countdownInterval = null;

        this.init();
    }

    init() {
        // Initialize Chart Engine
        this.chartEngine = new ChartEngine('chart-container', 'ohlcv-legend');

        // Initialize Drawing Tools Overlay
        const chartWrapper = document.getElementById('chart-wrapper');
        this.drawingTools = new DrawingTools(chartWrapper, this.chartEngine);

        // Initialize Data Feed
        this.dataFeed = new DataFeed();

        // Subscribe to DataFeed events
        this.dataFeed.subscribe('onHistoryLoaded', (data) => {
            this.chartEngine.setData(data.candles);
            this.updateHeaderSymbolInfo(data.symbol);
            this.updateDetailsCard(data.candles);
        });

        this.dataFeed.subscribe('onTick', (tickData) => {
            this.chartEngine.updateTick(tickData.candle, tickData.isNewBar);
            this.updateLivePriceBadges(tickData.candle);
            this.updateTechnicalSummary(tickData.candle);
        });

        this.dataFeed.subscribe('onTrade', (trade) => {
            this.appendLiveTrade(trade);
        });

        this.dataFeed.subscribe('onStatusChange', (status) => {
            const statusEl = document.getElementById('connection-status');
            const statusText = document.getElementById('status-text');
            if (statusEl && statusText) {
                statusText.innerText = status.message;
                statusEl.className = `status-dot ${status.status}`;
            }
        });

        // Setup UI handlers
        this.setupToolbarEvents();
        this.setupSidebarTabs();
        this.setupSidebarToggle();
        this.setupZoomControls();
        this.setupOptionChain();
        this.setupWatchlist('Indian');
        this.setupModals();
        this.setupCountdownTimer();
        this.setupEngineToggle();

        // Load initial symbol: NIFTY 50 in 1m candles
        this.selectSymbol(this.currentSymbol);
    }

    selectSymbol(symbol) {
        this.currentSymbol = symbol;
        this.dataFeed.setSymbol(symbol, this.currentTimeframe);
        this.updateHeaderSymbolInfo(symbol);
        this.updateRibbonActive(symbol);
        this.setupWatchlist(this.watchlistCategory);
        this.highlightActiveOptionContract(symbol);
    }

    updateRibbonActive(symbol) {
        document.querySelectorAll('.ribbon-pill').forEach(pill => {
            const pillSym = (pill.dataset.symbol || '').replace('NSE:', '').replace('BSE:', '').replace('BINANCE:', '');
            if (pillSym === symbol) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    setupToolbarEvents() {
        // Timeframe selector buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tf = btn.dataset.tf;
                this.currentTimeframe = tf;
                this.dataFeed.setSymbol(this.currentSymbol, tf);
            });
        });

        // Chart type dropdown / buttons
        document.querySelectorAll('.chart-type-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-type-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const type = btn.dataset.type;
                this.chartEngine.setChartType(type);
            });
        });

        // Volume toggle button
        const volBtn = document.getElementById('volume-toggle-btn');
        if (volBtn) {
            volBtn.addEventListener('click', () => {
                const isVisible = this.chartEngine.toggleVolume();
                volBtn.classList.toggle('active', isVisible);
                const volCheckbox = document.querySelector('.indicator-toggle[data-indicator="volume"]');
                if (volCheckbox) volCheckbox.checked = isVisible;
            });
        }

        // Left Drawing Toolbar buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.dataset.tool;

                if (tool === 'clear') {
                    this.drawingTools.clearAll();
                    return;
                }

                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.drawingTools.setTool(tool);
            });
        });

        // Indian Markets Quick Ribbon pills
        document.querySelectorAll('.ribbon-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const sym = (pill.dataset.symbol || '').replace('NSE:', '').replace('BSE:', '').replace('BINANCE:', '');
                if (sym) {
                    this.selectSymbol(sym);
                }
            });
        });

        // Market Ribbon horizontal scroll buttons
        const ribbonLeft = document.getElementById('ribbon-scroll-left');
        const ribbonRight = document.getElementById('ribbon-scroll-right');
        const ribbonItems = document.getElementById('market-ribbon-items');
        if (ribbonLeft && ribbonItems) {
            ribbonLeft.addEventListener('click', () => {
                ribbonItems.scrollBy({ left: -220, behavior: 'smooth' });
            });
        }
        if (ribbonRight && ribbonItems) {
            ribbonRight.addEventListener('click', () => {
                ribbonItems.scrollBy({ left: 220, behavior: 'smooth' });
            });
        }

        // Fullscreen toggle
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // Camera / Screenshot export
        const screenshotBtn = document.getElementById('screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                this.takeScreenshot();
            });
        }

        // Sidebar tabs (Watchlist vs Details vs Trades)
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.sidebar-panel-content').forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const target = document.getElementById(tab.dataset.target);
                if (target) target.classList.add('active');
            });
        });
    }

    setupEngineToggle() {
        const toggleBtn = document.getElementById('engine-toggle-btn');
        if (!toggleBtn) return;

        let isOfficial = false;
        toggleBtn.addEventListener('click', () => {
            isOfficial = !isOfficial;
            const tvChart = document.getElementById('tv_chart_container');
            const localChart = document.getElementById('chart-container');
            const legend = document.getElementById('ohlcv-legend');
            const countdown = document.querySelector('.price-scale-overlay');
            const watermark = document.getElementById('chart-watermark');
            const btnText = document.getElementById('engine-btn-text');

            if (isOfficial) {
                localChart.style.display = 'none';
                if (legend) legend.style.display = 'none';
                if (countdown) countdown.style.display = 'none';
                if (watermark) watermark.style.display = 'none';
                tvChart.style.display = 'block';
                if (btnText) btnText.innerText = '⭐ Cloud TV Widget (Active)';
                toggleBtn.style.background = 'rgba(8, 153, 129, 0.2)';
                toggleBtn.style.borderColor = '#089981';
                toggleBtn.style.color = '#089981';

                // Launch TradingView official widget
                if (typeof TradingView !== 'undefined') {
                    tvChart.innerHTML = '';
                    const info = this.dataFeed.getSymbolInfo(this.currentSymbol);
                    const prefix = info.isCrypto ? 'BINANCE:' : 'NSE:';
                    const tvSym = this.currentSymbol.includes(':') ? this.currentSymbol : `${prefix}${this.currentSymbol}`;
                    const rawInterval = this.currentTimeframe.replace('m', '').replace('h', '60').replace('D', 'D');

                    new TradingView.widget({
                        "autosize": true,
                        "symbol": tvSym,
                        "interval": rawInterval,
                        "timezone": "Asia/Kolkata",
                        "theme": "dark",
                        "style": "1",
                        "locale": "in",
                        "toolbar_bg": "#131722",
                        "enable_publishing": false,
                        "allow_symbol_change": true,
                        "hide_side_toolbar": false,
                        "withdateranges": true,
                        "save_image": true,
                        "details": true,
                        "hotlist": true,
                        "calendar": false,
                        "container_id": "tv_chart_container"
                    });
                }
            } else {
                tvChart.style.display = 'none';
                localChart.style.display = 'block';
                if (legend) legend.style.display = 'flex';
                if (countdown) countdown.style.display = 'flex';
                if (watermark) watermark.style.display = 'block';
                if (btnText) btnText.innerText = '⚡ 1m Live Engine (Active)';
                toggleBtn.style.background = 'rgba(41, 98, 255, 0.15)';
                toggleBtn.style.borderColor = 'rgba(41, 98, 255, 0.4)';
                toggleBtn.style.color = 'var(--tv-accent-blue)';
            }
        });
    }

    setupSidebarTabs() {
        const tabs = document.querySelectorAll('.sidebar-tab');
        const panels = document.querySelectorAll('.sidebar-panel-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const targetId = tab.dataset.target;
                const panel = document.getElementById(targetId);
                if (panel) panel.classList.add('active');

                if (targetId === 'optionchain-panel') {
                    this.renderOptionChain();
                }
            });
        });
    }

    setupSidebarToggle() {
        const sidebar = document.getElementById('tv-right-sidebar');
        const closeBtn = document.getElementById('sidebar-close-btn');
        const headerToggleBtn = document.getElementById('sidebar-toggle-btn');
        const floatingToggleBtn = document.getElementById('floating-sidebar-toggle');
        const floatingIcon = document.getElementById('floating-toggle-icon');

        const toggleSidebar = (forceState) => {
            if (!sidebar) return;
            const willCollapse = forceState !== undefined ? !forceState : !sidebar.classList.contains('collapsed');

            if (willCollapse) {
                sidebar.classList.add('collapsed');
                if (headerToggleBtn) headerToggleBtn.classList.remove('active');
                if (floatingIcon) floatingIcon.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
                if (floatingToggleBtn) floatingToggleBtn.title = "Open Sidebar (Watchlist & Option Chain)";
            } else {
                sidebar.classList.remove('collapsed');
                if (headerToggleBtn) headerToggleBtn.classList.add('active');
                if (floatingIcon) floatingIcon.innerHTML = '<path d="M9 18l6-6-6-6"/>';
                if (floatingToggleBtn) floatingToggleBtn.title = "Close Sidebar";
            }

            // Immediately resize chart canvas to expand across full viewport
            setTimeout(() => {
                if (this.chartEngine) {
                    this.chartEngine.resize();
                }
                window.dispatchEvent(new Event('resize'));
            }, 60);
        };

        if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
        if (headerToggleBtn) headerToggleBtn.addEventListener('click', () => toggleSidebar());
        if (floatingToggleBtn) floatingToggleBtn.addEventListener('click', () => toggleSidebar());
    }

    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.chartEngine.zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.chartEngine.zoomOut();
            });
        }

        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                this.chartEngine.resetZoom();
            });
        }
    }

    setupOptionChain() {
        const filterSelect = document.getElementById('oc-strike-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.renderOptionChain();
            });
        }

        const scrollUp = () => {
            const tableContainer = document.querySelector('.oc-table-container');
            if (tableContainer) {
                tableContainer.scrollBy({ top: -160, behavior: 'smooth' });
            }
        };

        const scrollDown = () => {
            const tableContainer = document.querySelector('.oc-table-container');
            if (tableContainer) {
                tableContainer.scrollBy({ top: 160, behavior: 'smooth' });
            }
        };

        const scrollToATM = () => {
            const atmRow = document.querySelector('.oc-row-atm');
            if (atmRow) {
                atmRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };

        // Header buttons
        const upBtn = document.getElementById('oc-scroll-up');
        const downBtn = document.getElementById('oc-scroll-down');
        const atmBtn = document.getElementById('oc-scroll-atm');

        if (upBtn) upBtn.addEventListener('click', scrollUp);
        if (downBtn) downBtn.addEventListener('click', scrollDown);
        if (atmBtn) atmBtn.addEventListener('click', scrollToATM);

        // Floating table buttons
        const floatUp = document.getElementById('oc-float-up');
        const floatDown = document.getElementById('oc-float-down');
        const floatAtm = document.getElementById('oc-float-atm');

        if (floatUp) floatUp.addEventListener('click', scrollUp);
        if (floatDown) floatDown.addEventListener('click', scrollDown);
        if (floatAtm) floatAtm.addEventListener('click', scrollToATM);
    }

    renderOptionChain() {
        const tbody = document.getElementById('option-chain-tbody');
        const spotValEl = document.getElementById('oc-spot-val');
        const atmTagEl = document.getElementById('oc-atm-tag');
        const filterSelect = document.getElementById('oc-strike-filter');
        if (!tbody) return;

        const filterMode = filterSelect ? filterSelect.value : 'all';
        const chainData = this.dataFeed.getOptionChainData('NIFTY50');
        if (!chainData || chainData.length === 0) return;

        const spotPrice = chainData[0].spotPrice;
        const atmStrike = Math.round(spotPrice / 50) * 50;

        if (spotValEl) spotValEl.innerText = `₹${spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (atmTagEl) atmTagEl.innerText = `ATM: ${atmStrike}`;

        tbody.innerHTML = '';
        let atmRowElement = null;

        chainData.forEach(row => {
            const dist = Math.abs(row.strike - atmStrike);
            if (filterMode === 'atm300' && dist > 300) return;
            if (filterMode === 'atm500' && dist > 500) return;

            const tr = document.createElement('tr');
            if (row.isATM) tr.className = 'oc-row-atm';

            const isCurrentCE = this.currentSymbol === row.ce.symbol;
            const isCurrentPE = this.currentSymbol === row.pe.symbol;

            tr.innerHTML = `
                <td class="oc-cell-oi ${row.ce.isITM ? 'oc-itm-call' : ''}">${row.ce.oi}</td>
                <td class="oc-cell-price oc-clickable ${row.ce.isITM ? 'oc-itm-call' : ''} ${isCurrentCE ? 'active-contract' : ''}" data-symbol="${row.ce.symbol}" title="Load ${row.ce.name} 1m Chart">
                    <span class="tv-text-green">${row.ce.ltp.toFixed(2)}</span>
                </td>
                <td class="oc-strike-cell ${row.isATM ? 'atm' : ''}" title="${row.isATM ? 'At The Money (ATM)' : ''}">
                    ${row.strike} ${row.isATM ? '<span style="font-size:9px;color:#ff9800;">★</span>' : ''}
                </td>
                <td class="oc-cell-price oc-clickable ${row.pe.isITM ? 'oc-itm-put' : ''} ${isCurrentPE ? 'active-contract' : ''}" data-symbol="${row.pe.symbol}" title="Load ${row.pe.name} 1m Chart">
                    <span class="tv-text-red">${row.pe.ltp.toFixed(2)}</span>
                </td>
                <td class="oc-cell-oi ${row.pe.isITM ? 'oc-itm-put' : ''}">${row.pe.oi}</td>
            `;

            tr.querySelectorAll('.oc-clickable').forEach(cell => {
                cell.addEventListener('click', () => {
                    const sym = cell.dataset.symbol;
                    if (sym) {
                        this.selectSymbol(sym);
                    }
                });
            });

            if (row.isATM) {
                atmRowElement = tr;
            }

            tbody.appendChild(tr);
        });

        // Auto-scroll to ATM strike row so it's centered
        if (atmRowElement) {
            setTimeout(() => {
                atmRowElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 60);
        }
    }

    highlightActiveOptionContract(symbol) {
        document.querySelectorAll('.oc-clickable').forEach(cell => {
            if (cell.dataset.symbol === symbol) {
                cell.classList.add('active-contract');
            } else {
                cell.classList.remove('active-contract');
            }
        });
    }

    resetActiveToolbar() {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const crosshairBtn = document.querySelector('.tool-btn[data-tool="crosshair"]');
        if (crosshairBtn) crosshairBtn.classList.add('active');
    }

    setupCountdownTimer() {
        const timerBadge = document.getElementById('candle-countdown');
        const clockEl = document.getElementById('local-clock');

        this.countdownInterval = setInterval(() => {
            const now = new Date();
            const currentSeconds = now.getSeconds();
            const currentTotalSeconds = now.getMinutes() * 60 + currentSeconds;

            let remaining = 60;
            const tf = this.currentTimeframe;

            if (tf === '15s') {
                remaining = 15 - (currentSeconds % 15);
            } else if (tf === '30s') {
                remaining = 30 - (currentSeconds % 30);
            } else if (tf === '1m' || tf === '1') {
                remaining = 60 - currentSeconds;
            } else if (tf === '3m' || tf === '3') {
                remaining = 180 - (currentTotalSeconds % 180);
            } else if (tf === '5m' || tf === '5') {
                remaining = 300 - (currentTotalSeconds % 300);
            } else if (tf === '15m') {
                remaining = 900 - (currentTotalSeconds % 900);
            } else {
                remaining = 60 - currentSeconds;
            }

            if (remaining === 0) remaining = (tf === '15s' ? 15 : (tf === '30s' ? 30 : 60));

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const formatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

            if (timerBadge) {
                timerBadge.innerText = formatted;
            }

            // Flash effect when under 4 seconds
            if (remaining <= 4 && timerBadge) {
                timerBadge.style.color = '#f23645';
            } else if (timerBadge) {
                timerBadge.style.color = '#787b86';
            }

            if (clockEl) {
                const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
                clockEl.innerText = `${timeStr} IST (Asia/Kolkata)`;
            }
        }, 1000);
    }

    updateLivePriceBadges(candle) {
        const scalePrice = document.getElementById('scale-live-price');
        const headerPrice = document.getElementById('header-last-price');
        const headerChange = document.getElementById('header-change');

        const info = this.dataFeed.getSymbolInfo(this.currentSymbol);
        const currency = info.currency || '';
        const formattedPrice = `${currency}${candle.close.toLocaleString('en-IN', { minimumFractionDigits: info.precision, maximumFractionDigits: info.precision })}`;

        if (scalePrice) {
            scalePrice.innerText = formattedPrice;
            scalePrice.className = `scale-badge ${candle.close >= candle.open ? 'up' : 'down'}`;
        }

        if (headerPrice) {
            headerPrice.innerText = formattedPrice;
            headerPrice.className = candle.close >= candle.open ? 'tv-text-green' : 'tv-text-red';
        }

        if (headerChange && this.dataFeed.candleData.length > 0) {
            const firstCandle = this.dataFeed.candleData[0];
            const change = candle.close - firstCandle.open;
            const changePct = ((change / firstCandle.open) * 100).toFixed(2);
            const isUp = change >= 0;
            headerChange.innerText = `${isUp ? '+' : '-'}${currency}${Math.abs(change).toFixed(info.precision)} (${isUp ? '+' : ''}${changePct}%)`;
            headerChange.className = isUp ? 'tv-text-green' : 'tv-text-red';
        }

        // Update active watchlist item price
        const activeWatchItem = document.querySelector(`.watchlist-item[data-symbol="${this.currentSymbol}"]`);
        if (activeWatchItem) {
            const priceEl = activeWatchItem.querySelector('.item-price');
            if (priceEl) priceEl.innerText = formattedPrice;
        }
    }

    updateHeaderSymbolInfo(symbol) {
        const info = this.dataFeed.getSymbolInfo(symbol);
        const nameEl = document.getElementById('header-symbol-name');
        const descEl = document.getElementById('header-symbol-desc');
        const exchangeEl = document.getElementById('header-exchange-tag');
        const watermarkEl = document.getElementById('chart-watermark');
        if (nameEl) nameEl.innerText = symbol;
        if (descEl) descEl.innerText = info.name;
        if (exchangeEl) exchangeEl.innerText = info.exchange || (info.isCrypto ? 'BINANCE' : 'NSE');
        if (watermarkEl) watermarkEl.innerText = symbol;
    }

    updateDetailsCard(candles) {
        if (!candles || candles.length === 0) return;
        const info = this.dataFeed.getSymbolInfo(this.currentSymbol);

        let high24 = -Infinity;
        let low24 = Infinity;
        let totalVol = 0;

        candles.forEach(c => {
            if (c.high > high24) high24 = c.high;
            if (c.low < low24) low24 = c.low;
            totalVol += (c.volume || 0);
        });

        const highEl = document.getElementById('detail-high');
        const lowEl = document.getElementById('detail-low');
        const volEl = document.getElementById('detail-volume');

        if (highEl) highEl.innerText = high24.toFixed(info.precision);
        if (lowEl) lowEl.innerText = low24.toFixed(info.precision);
        if (volEl) volEl.innerText = totalVol > 1000 ? `${(totalVol / 1000).toFixed(1)}K` : totalVol.toFixed(1);
    }

    updateTechnicalSummary(candle) {
        const gaugeEl = document.getElementById('tech-summary-gauge');
        const textEl = document.getElementById('tech-summary-text');
        if (!gaugeEl || !textEl) return;

        // Fast sentiment computation
        const history = this.dataFeed.candleData;
        if (history.length < 20) return;

        const sma20 = Indicators.calculateSMA(history, 20);
        const lastSma = sma20.length > 0 ? sma20[sma20.length - 1].value : candle.close;
        const rsiData = Indicators.calculateRSI(history, 14);
        const lastRsi = rsiData.length > 0 ? rsiData[rsiData.length - 1].value : 50;

        let score = 0;
        if (candle.close > lastSma) score += 1; else score -= 1;
        if (lastRsi > 60) score += 2;
        else if (lastRsi > 50) score += 1;
        else if (lastRsi < 40) score -= 2;
        else if (lastRsi < 50) score -= 1;

        let verdict = 'NEUTRAL';
        let color = '#ff9800';
        if (score >= 2) { verdict = 'STRONG BUY'; color = '#089981'; }
        else if (score === 1) { verdict = 'BUY'; color = '#26a69a'; }
        else if (score <= -2) { verdict = 'STRONG SELL'; color = '#f23645'; }
        else if (score === -1) { verdict = 'SELL'; color = '#ef5350'; }

        textEl.innerText = verdict;
        textEl.style.color = color;
    }

    appendLiveTrade(trade) {
        const tapeEl = document.getElementById('trades-tape-list');
        if (!tapeEl) return;

        const info = this.dataFeed.getSymbolInfo(this.currentSymbol);
        const timeStr = trade.time.toTimeString().split(' ')[0];
        const colorClass = trade.side === 'buy' ? 'tv-text-green' : 'tv-text-red';

        const row = document.createElement('div');
        row.className = 'trade-row';
        row.innerHTML = `
            <span class="${colorClass}">${trade.price.toFixed(info.precision)}</span>
            <span>${trade.quantity}</span>
            <span class="tv-text-gray">${timeStr}</span>
        `;

        tapeEl.insertBefore(row, tapeEl.firstChild);

        // Keep maximum 40 trades visible
        if (tapeEl.children.length > 40) {
            tapeEl.removeChild(tapeEl.lastChild);
        }
    }

    setupWatchlist(categoryFilter = null) {
        if (categoryFilter !== null) {
            this.watchlistCategory = categoryFilter;
        }

        const listContainer = document.getElementById('watchlist-items');
        if (!listContainer) return;

        // Render category tabs at top of watchlist
        let tabsContainer = document.getElementById('watchlist-category-tabs');
        if (!tabsContainer) {
            tabsContainer = document.createElement('div');
            tabsContainer.id = 'watchlist-category-tabs';
            tabsContainer.className = 'watchlist-subtabs';
            listContainer.parentNode.insertBefore(tabsContainer, listContainer);
        }

        tabsContainer.innerHTML = `
            <button class="w-subtab ${this.watchlistCategory === 'Indian' ? 'active' : ''}" data-cat="Indian">🇮🇳 Indian</button>
            <button class="w-subtab ${this.watchlistCategory === 'Options' ? 'active' : ''}" data-cat="Options">⚡ Options</button>
            <button class="w-subtab ${this.watchlistCategory === 'All' ? 'active' : ''}" data-cat="All">All</button>
            <button class="w-subtab ${this.watchlistCategory === 'Crypto' ? 'active' : ''}" data-cat="Crypto">Crypto</button>
            <button class="w-subtab ${this.watchlistCategory === 'Global' ? 'active' : ''}" data-cat="Global">Global</button>
        `;

        tabsContainer.querySelectorAll('.w-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setupWatchlist(btn.dataset.cat);
            });
        });

        listContainer.innerHTML = '';

        // Wire Watchlist Scroll Buttons
        const watchlistScrollTop = document.getElementById('w-scroll-top');
        const watchlistScrollBottom = document.getElementById('w-scroll-bottom');
        const watchlistScrollActive = document.getElementById('w-scroll-active');
        const watchlistPanel = document.getElementById('watchlist-panel');

        if (watchlistScrollTop && !watchlistScrollTop.dataset.bound) {
            watchlistScrollTop.dataset.bound = 'true';
            watchlistScrollTop.addEventListener('click', () => {
                if (watchlistPanel) watchlistPanel.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        if (watchlistScrollBottom && !watchlistScrollBottom.dataset.bound) {
            watchlistScrollBottom.dataset.bound = 'true';
            watchlistScrollBottom.addEventListener('click', () => {
                if (watchlistPanel) watchlistPanel.scrollTo({ top: watchlistPanel.scrollHeight, behavior: 'smooth' });
            });
        }
        if (watchlistScrollActive && !watchlistScrollActive.dataset.bound) {
            watchlistScrollActive.dataset.bound = 'true';
            watchlistScrollActive.addEventListener('click', () => {
                const activeItem = document.querySelector('.watchlist-item.active');
                if (activeItem) activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            });
        }

        const allSymbols = this.dataFeed.symbols;

        Object.keys(allSymbols).forEach(symbol => {
            const item = allSymbols[symbol];

            // Apply category filter
            if (this.watchlistCategory === 'Indian') {
                if (!item.category.includes('Indian') || item.isOption) return;
            } else if (this.watchlistCategory === 'Options') {
                if (!item.isOption && item.category !== 'NIFTY Options') return;
            } else if (this.watchlistCategory === 'Crypto') {
                if (item.category !== 'Crypto') return;
            } else if (this.watchlistCategory === 'Global') {
                if (item.category.includes('Indian') || item.category === 'Crypto' || item.isOption) return;
            }

            const div = document.createElement('div');
            div.className = `watchlist-item ${symbol === this.currentSymbol ? 'active' : ''}`;
            div.dataset.symbol = symbol;

            const currency = item.currency || '';
            const priceFormatted = `${currency}${item.basePrice.toLocaleString('en-IN', { minimumFractionDigits: item.precision, maximumFractionDigits: item.precision })}`;

            div.innerHTML = `
                <div class="item-left">
                    <div class="item-symbol-row">
                        <span class="item-symbol">${symbol}</span>
                        <span class="item-exchange-badge ${item.category.includes('Indian') ? 'nse-badge' : ''}">${item.exchange || 'NSE'}</span>
                    </div>
                    <span class="item-name">${item.name}</span>
                </div>
                <div class="item-right">
                    <span class="item-price">${priceFormatted}</span>
                    <span class="item-badge">${item.category.replace('Indian ', '')}</span>
                </div>
            `;

            div.addEventListener('click', () => {
                this.selectSymbol(symbol);
            });

            listContainer.appendChild(div);
        });
    }

    setupModals() {
        // Symbol Search Modal
        const searchBtn = document.getElementById('symbol-search-trigger');
        const searchModal = document.getElementById('symbol-search-modal');
        const searchInput = document.getElementById('symbol-search-input');
        const closeModalBtn = document.getElementById('close-search-modal');

        if (searchBtn && searchModal) {
            searchBtn.addEventListener('click', () => {
                searchModal.classList.add('open');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    this.renderSearchResults('');
                }
            });

            closeModalBtn.addEventListener('click', () => searchModal.classList.remove('open'));
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) searchModal.classList.remove('open');
            });

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.renderSearchResults(e.target.value.trim().toUpperCase());
                });
            }

            // Category filter buttons inside Search Modal
            document.querySelectorAll('.search-cat-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.search-cat-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.searchCategory = tab.dataset.cat;
                    const query = searchInput ? searchInput.value.trim().toUpperCase() : '';
                    this.renderSearchResults(query);
                });
            });
        }

        // Indicators Modal
        const indicatorsBtn = document.getElementById('indicators-trigger');
        const indicatorsModal = document.getElementById('indicators-modal');
        const closeIndicatorsBtn = document.getElementById('close-indicators-modal');

        if (indicatorsBtn && indicatorsModal) {
            indicatorsBtn.addEventListener('click', () => {
                indicatorsModal.classList.add('open');
            });

            closeIndicatorsBtn.addEventListener('click', () => indicatorsModal.classList.remove('open'));
            indicatorsModal.addEventListener('click', (e) => {
                if (e.target === indicatorsModal) indicatorsModal.classList.remove('open');
            });

            // Toggle indicators checkboxes
            document.querySelectorAll('.indicator-toggle').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const key = e.target.dataset.indicator;
                    this.chartEngine.toggleIndicator(key, e.target.checked);
                    if (key === 'volume') {
                        const volBtn = document.getElementById('volume-toggle-btn');
                        if (volBtn) volBtn.classList.toggle('active', e.target.checked);
                    }
                });
            });
        }
    }

    renderSearchResults(query) {
        const resultsEl = document.getElementById('symbol-search-results');
        if (!resultsEl) return;

        resultsEl.innerHTML = '';
        const allSymbols = this.dataFeed.symbols;

        const filtered = Object.keys(allSymbols).filter(sym => {
            const item = allSymbols[sym];

            // Category filter match
            if (this.searchCategory === 'Indian' && (!item.category.includes('Indian') || item.isOption)) return false;
            if (this.searchCategory === 'Options' && !item.isOption) return false;
            if (this.searchCategory === 'Crypto' && item.category !== 'Crypto') return false;
            if (this.searchCategory === 'Global' && (item.category.includes('Indian') || item.category === 'Crypto' || item.isOption)) return false;

            // Query text match
            if (!query) return true;
            return sym.includes(query) || item.name.toUpperCase().includes(query) || (item.exchange && item.exchange.includes(query));
        });

        if (filtered.length === 0) {
            resultsEl.innerHTML = '<div class="no-results">No symbols found matching your criteria.</div>';
            return;
        }

        filtered.forEach(symbol => {
            const item = allSymbols[symbol];
            const currency = item.currency || '';
            const row = document.createElement('div');
            row.className = 'search-result-row';
            row.innerHTML = `
                <div class="result-left">
                    <span class="result-ticker">${symbol}</span>
                    <span class="item-exchange-badge ${item.category.includes('Indian') ? 'nse-badge' : ''}">${item.exchange || 'NSE'}</span>
                    <span class="result-name">${item.name}</span>
                </div>
                <div class="result-right">
                    <span class="result-price">${currency}${item.basePrice.toLocaleString('en-IN', { minimumFractionDigits: item.precision, maximumFractionDigits: item.precision })}</span>
                    <span class="result-category">${item.category}</span>
                </div>
            `;

            row.addEventListener('click', () => {
                this.selectSymbol(symbol);
                document.getElementById('symbol-search-modal').classList.remove('open');
            });

            resultsEl.appendChild(row);
        });
    }

    takeScreenshot() {
        const canvas = document.querySelector('#chart-container canvas');
        if (!canvas) return;

        const image = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `TradingView_${this.currentSymbol}_${Date.now()}.png`;
        a.href = image;
        a.click();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new TradingViewApp();
});
