/**
 * TradingView Interactive Drawing Tools Engine
 * Provides overlay canvas for Trend Lines, Horizontal Lines, Fibonacci Retracements,
 * Support/Resistance Boxes, and Price/Time Measurement rulers.
 */

class DrawingTools {
    constructor(containerElement, chartEngine) {
        this.container = containerElement;
        this.chartEngine = chartEngine;
        this.activeTool = 'crosshair';
        this.drawings = [];
        this.currentDrawing = null;
        this.selectedDrawing = null;
        this.isDrawing = false;
        this.startPoint = null;

        this.initCanvas();
        this.bindEvents();
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'tv-drawing-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '5';
        this.canvas.style.pointerEvents = 'none'; // By default let chart handle pointer

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.redraw();
    }

    setTool(tool) {
        this.activeTool = tool;
        if (tool === 'crosshair' || tool === 'cursor') {
            this.canvas.style.pointerEvents = 'none';
        } else {
            this.canvas.style.pointerEvents = 'all';
            this.canvas.style.cursor = 'crosshair';
        }
    }

    bindEvents() {
        const getCanvasPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.activeTool === 'crosshair' || this.activeTool === 'cursor') return;

            const pos = getCanvasPos(e);

            if (this.activeTool === 'horizontal') {
                // Instant horizontal line across canvas
                const price = this.chartEngine ? this.chartEngine.coordinateToPrice(pos.y) : null;
                this.drawings.push({
                    type: 'horizontal',
                    y: pos.y,
                    price: price,
                    color: '#2962ff'
                });
                this.redraw();
                this.setTool('crosshair');
                if (window.app) window.app.resetActiveToolbar();
                return;
            }

            this.isDrawing = true;
            this.startPoint = pos;
            this.currentDrawing = {
                type: this.activeTool,
                startX: pos.x,
                startY: pos.y,
                endX: pos.x,
                endY: pos.y,
                color: '#2962ff'
            };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawing || !this.currentDrawing) return;
            const pos = getCanvasPos(e);
            this.currentDrawing.endX = pos.x;
            this.currentDrawing.endY = pos.y;
            this.redraw();
            this.drawItem(this.currentDrawing, true);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isDrawing || !this.currentDrawing) return;
            const pos = getCanvasPos(e);
            this.currentDrawing.endX = pos.x;
            this.currentDrawing.endY = pos.y;

            // Only add if there is meaningful distance
            const dist = Math.hypot(this.currentDrawing.endX - this.currentDrawing.startX, this.currentDrawing.endY - this.currentDrawing.startY);
            if (dist > 5) {
                this.drawings.push({ ...this.currentDrawing });
            }

            this.isDrawing = false;
            this.currentDrawing = null;
            this.redraw();

            // Reset back to crosshair after drawing completes
            if (this.activeTool !== 'measure') {
                this.setTool('crosshair');
                if (window.app) window.app.resetActiveToolbar();
            }
        });

        // Delete key listener to remove last drawing
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.drawings.length > 0 && !e.target.matches('input, textarea')) {
                    this.drawings.pop();
                    this.redraw();
                }
            }
        });
    }

    clearAll() {
        this.drawings = [];
        this.redraw();
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawings.forEach(item => this.drawItem(item, false));
    }

    drawItem(item, isPreview = false) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = item.color || '#2962ff';
        ctx.fillStyle = item.color || '#2962ff';
        ctx.lineWidth = 1.5;

        if (isPreview) {
            ctx.setLineDash([4, 4]);
        } else {
            ctx.setLineDash([]);
        }

        switch (item.type) {
            case 'trendline': {
                ctx.beginPath();
                ctx.moveTo(item.startX, item.startY);
                ctx.lineTo(item.endX, item.endY);
                ctx.stroke();

                // Draw end handles
                this.drawHandle(item.startX, item.startY);
                this.drawHandle(item.endX, item.endY);
                break;
            }

            case 'horizontal': {
                ctx.beginPath();
                ctx.moveTo(0, item.y);
                ctx.lineTo(this.width, item.y);
                ctx.stroke();

                // Draw price tag pill on the right
                if (item.price) {
                    ctx.fillStyle = '#2962ff';
                    ctx.fillRect(this.width - 70, item.y - 10, 70, 20);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.price.toFixed(2), this.width - 35, item.y);
                }
                break;
            }

            case 'rectangle': {
                const x = Math.min(item.startX, item.endX);
                const y = Math.min(item.startY, item.endY);
                const w = Math.abs(item.endX - item.startX);
                const h = Math.abs(item.endY - item.startY);

                ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
                break;
            }

            case 'fibonacci': {
                // Fibonacci Retracement levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
                const levels = [
                    { level: 0, color: '#787b86', text: '0 (0.0%)' },
                    { level: 0.236, color: '#f23645', text: '0.236 (23.6%)' },
                    { level: 0.382, color: '#ff9800', text: '0.382 (38.2%)' },
                    { level: 0.5, color: '#089981', text: '0.5 (50.0%)' },
                    { level: 0.618, color: '#2962ff', text: '0.618 (61.8%)' },
                    { level: 0.786, color: '#ab47bc', text: '0.786 (78.6%)' },
                    { level: 1.0, color: '#787b86', text: '1.0 (100.0%)' }
                ];

                const minX = Math.min(item.startX, item.endX);
                const maxX = Math.max(item.startX, item.endX);
                const deltaY = item.endY - item.startY;

                levels.forEach(fib => {
                    const y = item.startY + deltaY * fib.level;
                    ctx.strokeStyle = fib.color;
                    ctx.beginPath();
                    ctx.moveTo(minX, y);
                    ctx.lineTo(maxX, y);
                    ctx.stroke();

                    // Text label
                    ctx.fillStyle = fib.color;
                    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(fib.text, minX + 5, y - 4);
                });

                // Shaded background between 0.382 and 0.618 (Golden Pocket)
                const y382 = item.startY + deltaY * 0.382;
                const y618 = item.startY + deltaY * 0.618;
                ctx.fillStyle = 'rgba(41, 98, 255, 0.12)';
                ctx.fillRect(minX, Math.min(y382, y618), maxX - minX, Math.abs(y618 - y382));
                break;
            }

            case 'measure': {
                // Measurement ruler between point A and point B
                ctx.beginPath();
                ctx.moveTo(item.startX, item.startY);
                ctx.lineTo(item.endX, item.endY);
                ctx.stroke();

                const midX = (item.startX + item.endX) / 2;
                const midY = (item.startY + item.endY) / 2;
                const deltaY = item.startY - item.endY;
                const deltaX = Math.abs(item.endX - item.startX);

                // Info pill
                const pillText = `ΔY: ${deltaY > 0 ? '+' : ''}${deltaY.toFixed(1)}px | Bars: ~${Math.round(deltaX / 12)}`;
                ctx.fillStyle = 'rgba(30, 34, 45, 0.9)';
                ctx.fillRect(midX - 70, midY - 14, 140, 24);
                ctx.strokeStyle = '#2962ff';
                ctx.strokeRect(midX - 70, midY - 14, 140, 24);

                ctx.fillStyle = '#d1d4dc';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pillText, midX, midY - 2);
                break;
            }
        }

        ctx.restore();
    }

    drawHandle(x, y) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#2962ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }
}

window.DrawingTools = DrawingTools;
