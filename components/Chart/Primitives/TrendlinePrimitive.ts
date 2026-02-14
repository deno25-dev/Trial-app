import { 
    ISeriesPrimitive, 
    SeriesPrimitivePaneViewZOrder, 
    ISeriesPrimitivePaneView, 
    ISeriesPrimitivePaneRenderer, 
    Time, 
    ISeriesApi,
    IChartApi
} from 'lightweight-charts';
import { Drawing, Point, OhlcData } from '../../../types';

// --- Pure Helper Functions (Thread Safe) ---

/**
 * Binary search to find the index of a timestamp in the sorted data array.
 * Returns the exact index, or an interpolated index if the time falls between bars (or outside range).
 */
function getLogicalIndexForTime(data: OhlcData[], time: number): number | null {
    if (!data || data.length === 0) return null;

    const first = data[0].time;
    const last = data[data.length - 1].time;
    
    // 1. Exact range check / Optimization
    if (time === last) return data.length - 1;
    if (time === first) return 0;

    // 2. Binary Search
    let lo = 0;
    let hi = data.length - 1;
    
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midVal = data[mid].time;
        
        if (midVal === time) return mid;
        else if (midVal < time) lo = mid + 1;
        else hi = mid - 1;
    }

    // 3. Extrapolation / Interpolation
    const sampleSize = Math.min(data.length, 10);
    const avgInterval = (data[data.length - 1].time - data[data.length - sampleSize].time) / (sampleSize - 1);
    
    if (avgInterval <= 0) return lo; // Fallback

    if (time > last) {
        // Future extrapolation
        const diff = time - last;
        return (data.length - 1) + (diff / avgInterval);
    } else if (time < first) {
        // Past extrapolation
        const diff = first - time;
        return 0 - (diff / avgInterval);
    } else {
        // Between bars (Interpolate between hi and lo)
        if (hi < 0) return 0;
        if (lo >= data.length) return data.length - 1;
        
        const t1 = data[hi].time;
        const t2 = data[lo].time;
        const ratio = (time - t1) / (t2 - t1);
        return hi + ratio;
    }
}

/**
 * Ray Casting Algorithm for Point-in-Polygon
 */
function isPointInPolygon(point: {x: number, y: number}, vs: {x: number, y: number}[]) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        
        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

class TrendlinePaneRenderer implements ISeriesPrimitivePaneRenderer {
    private _drawings: Drawing[];
    private _transientDrawings: Drawing[];
    private _tempDrawing: Drawing | null;
    private _data: OhlcData[];
    private _timeScale: any;
    private _series: ISeriesApi<any>;
    private _textBoundsCache: Map<string, { x: number, y: number, w: number, h: number }>;
    private _lastLog: number = 0; // Throttle state

    constructor(
        drawings: Drawing[], 
        transientDrawings: Drawing[],
        tempDrawing: Drawing | null, 
        data: OhlcData[],
        timeScale: any, 
        series: ISeriesApi<any>,
        textBoundsCache: Map<string, { x: number, y: number, w: number, h: number }>
    ) {
        this._drawings = drawings;
        this._transientDrawings = transientDrawings;
        this._tempDrawing = tempDrawing;
        this._data = data;
        this._timeScale = timeScale;
        this._series = series;
        this._textBoundsCache = textBoundsCache;
    }

    draw(target: CanvasRenderingContext2D) {
        if (!target || !this._timeScale || !this._series) return;
        if (typeof target.save !== 'function') return;

        // MANDATE 0.21: Visibility Guard & Debug
        // Combine persisted drawings with transient (shadow) drawings
        const drawingsToRender = [...this._drawings, ...this._transientDrawings];

        if (drawingsToRender.length > 0) {
            const now = Date.now();
            if (now - this._lastLog > 1000) { // Log once per second max
                 // console.log(`[TrendlinePrimitive] Painting ${drawingsToRender.length} objects`);
                 this._lastLog = now;
            }
        }

        target.save();

        const renderDrawing = (d: Drawing, isTemp: boolean) => {
            switch(d.type) {
                case 'text': this._drawText(target, d, isTemp); break;
                case 'brush': this._drawBrush(target, d, isTemp); break;
                case 'rectangle': this._drawRectangle(target, d, isTemp); break;
                case 'triangle': this._drawTriangle(target, d, isTemp); break;
                case 'rotated_rectangle': this._drawRotatedRectangle(target, d, isTemp); break;
                case 'horizontal_line': this._drawHorizontalLine(target, d, isTemp); break;
                case 'vertical_line': this._drawVerticalLine(target, d, isTemp); break;
                case 'horizontal_ray': this._drawHorizontalRay(target, d, isTemp); break;
                case 'arrow_line': this._drawArrowLine(target, d, isTemp); break;
                case 'trendline': 
                case 'ray':
                default: this._drawDrawing(target, d, isTemp); break;
            }
        };

        drawingsToRender.forEach(d => renderDrawing(d, false));
        if (this._tempDrawing) renderDrawing(this._tempDrawing, true);

        target.restore();
    }

    private _resolveX(time: number): number | null {
        const stdCoord = this._timeScale.timeToCoordinate(time as Time);
        if (stdCoord !== null) return stdCoord;

        const logicalIndex = getLogicalIndexForTime(this._data, time);
        if (logicalIndex !== null) {
            return this._timeScale.logicalToCoordinate(logicalIndex);
        }
        return null;
    }

    private _getCoords(points: Point[]): ({x: number, y: number} | null)[] {
        return points.map(p => {
            const x = this._resolveX(p.time);
            const y = this._series.priceToCoordinate(p.price);
            if (x === null || y === null) return null;
            return { x, y };
        });
    }

    private _drawHorizontalLine(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        if (d.points.length < 1) return;
        const p = d.points[0];
        const y = this._series.priceToCoordinate(p.price);
        if (y === null) return;

        ctx.beginPath();
        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) ctx.setLineDash([5, 5]); 

        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
             const x = this._resolveX(p.time);
             // Always draw the handle on the line at the click time, if visible
             if (x !== null) this._drawAnchor(ctx, x, y, d.selected);
        }
    }

    private _drawHorizontalRay(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        if (d.points.length < 1) return;
        const p = d.points[0];
        const x = this._resolveX(p.time);
        const y = this._series.priceToCoordinate(p.price);

        if (x === null || y === null) return;

        ctx.beginPath();
        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) ctx.setLineDash([5, 5]); 

        ctx.moveTo(x, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
             this._drawAnchor(ctx, x, y, d.selected);
        }
    }

    private _drawVerticalLine(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        if (d.points.length < 1) return;
        const p = d.points[0];
        const x = this._resolveX(p.time);
        if (x === null) return;

        ctx.beginPath();
        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;

        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) ctx.setLineDash([5, 5]); 

        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
             const y = this._series.priceToCoordinate(p.price);
             if (y !== null) this._drawAnchor(ctx, x, y, d.selected);
        }
    }

    private _drawArrowLine(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        if (d.points.length < 2) return;
        
        const p1 = d.points[0];
        const p2 = d.points[1];

        const x1 = this._resolveX(p1.time);
        const y1 = this._series.priceToCoordinate(p1.price);
        const x2 = this._resolveX(p2.time);
        const y2 = this._series.priceToCoordinate(p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return;

        ctx.beginPath();
        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        ctx.lineCap = 'round';
        
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) ctx.setLineDash([5, 5]); 
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]); 

        // Arrow Head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 14; 

        ctx.beginPath();
        ctx.fillStyle = d.properties.color;
        // Tip
        ctx.moveTo(x2, y2);
        // Back corners
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if (d.selected || d.hovered || isTemp) {
            this._drawAnchor(ctx, x1, y1, d.selected);
            this._drawAnchor(ctx, x2, y2, d.selected);
        }
    }

    private _drawRectangle(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        const coords = this._getCoords(d.points);
        if (coords.length < 2 || !coords[0] || !coords[1]) return;
        const [c1, c2] = coords;

        const x = Math.min(c1!.x, c2!.x);
        const y = Math.min(c1!.y, c2!.y);
        const w = Math.abs(c2!.x - c1!.x);
        const h = Math.abs(c2!.y - c1!.y);

        ctx.beginPath();
        ctx.rect(x, y, w, h);

        if (d.properties.showBackground) {
            ctx.fillStyle = d.properties.backgroundColor || (d.properties.color + '33'); // Default 20% opacity
            ctx.fill();
        }

        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) ctx.setLineDash([5, 5]); 
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
            this._drawAnchor(ctx, c1!.x, c1!.y, d.selected);
            this._drawAnchor(ctx, c2!.x, c2!.y, d.selected);
            this._drawAnchor(ctx, c1!.x, c2!.y, d.selected); // Corner 3
            this._drawAnchor(ctx, c2!.x, c1!.y, d.selected); // Corner 4
        }
    }

    private _drawTriangle(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        const coords = this._getCoords(d.points);
        // Guard: Need at least 3 valid points
        if (coords.length < 3 || coords.some(c => c === null)) return;
        
        ctx.beginPath();
        // Safe to access coords[0] because length check >= 3 implies indices 0,1,2 exist
        ctx.moveTo(coords[0]!.x, coords[0]!.y);
        for(let i=1; i<coords.length; i++) ctx.lineTo(coords[i]!.x, coords[i]!.y);
        ctx.closePath();

        if (d.properties.showBackground) {
             ctx.fillStyle = d.properties.backgroundColor || (d.properties.color + '33');
             ctx.fill();
        }

        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
            coords.forEach(c => this._drawAnchor(ctx, c!.x, c!.y, d.selected));
        }
    }

    private _drawRotatedRectangle(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        const coords = this._getCoords(d.points);
        // Guard: Need at least 3 valid points for projection
        if (coords.length < 3 || coords.some(c => c === null)) return;
        
        const [p1, p2, p3] = coords as {x: number, y: number}[];

        // Vector u = P2 - P1
        const u = { x: p2.x - p1.x, y: p2.y - p1.y };
        // Vector v = P3 - P1
        const v = { x: p3.x - p1.x, y: p3.y - p1.y };
        
        // Project v onto u: proj = ((v . u) / (u . u)) * u
        const dotUV = v.x * u.x + v.y * u.y;
        const dotUU = u.x * u.x + u.y * u.y;
        if (dotUU === 0) return; // P1 and P2 are same

        const scale = dotUV / dotUU;
        const proj = { x: u.x * scale, y: u.y * scale };
        
        // Perpendicular vector = v - proj
        const perp = { x: v.x - proj.x, y: v.y - proj.y };

        const p4 = { x: p1.x + perp.x, y: p1.y + perp.y };
        const p5 = { x: p2.x + perp.x, y: p2.y + perp.y };

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p5.x, p5.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        if (d.properties.showBackground) {
             ctx.fillStyle = d.properties.backgroundColor || (d.properties.color + '33');
             ctx.fill();
        }

        ctx.lineWidth = d.properties.lineWidth;
        ctx.strokeStyle = d.properties.color;
        if (d.properties.lineStyle === 1) ctx.setLineDash([2, 2]); 
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
            this._drawAnchor(ctx, p1.x, p1.y, d.selected);
            this._drawAnchor(ctx, p2.x, p2.y, d.selected);
            this._drawAnchor(ctx, p3.x, p3.y, d.selected); // Anchor handle
        }
    }

    private _drawText(target: CanvasRenderingContext2D, d: Drawing, isTemp: boolean = false) {
        if (d.points.length === 0) return;
        
        const p1 = d.points[0];
        const x = this._resolveX(p1.time);
        const y = this._series.priceToCoordinate(p1.price);

        if (x === null || y === null) return;

        const text = d.properties.text || "Text";
        const fontSize = d.properties.fontSize || 14;
        const color = d.properties.color;

        target.font = `${fontSize}px 'Inter', sans-serif`;
        const metrics = target.measureText(text);
        const w = metrics.width;
        const h = fontSize; // Approximate height

        if (d.id) {
            this._textBoundsCache.set(d.id, { x, y: y - h, w, h });
        }

        if (d.selected || isTemp) {
            target.save();
            target.shadowColor = "#3b82f6";
            target.shadowBlur = 15;
            target.fillStyle = "#ffffff"; 
            target.fillText(text, x, y);
            target.restore();
            
            target.strokeStyle = "#3b82f6";
            target.lineWidth = 1;
            target.setLineDash([4, 4]);
            target.strokeRect(x - 4, y - h - 4, w + 8, h + 8);
            target.setLineDash([]);
        }

        if (d.properties.showBackground) {
            target.fillStyle = d.properties.backgroundColor || 'rgba(30, 41, 59, 0.8)';
            target.fillRect(x - 2, y - h - 2, w + 4, h + 4);
        }

        target.fillStyle = color;
        target.fillText(text, x, y);

        if (d.selected || isTemp) {
            this._drawAnchor(target, x, y, true);
        }
    }

    private _drawBrush(target: CanvasRenderingContext2D, d: Drawing, isTemp: boolean = false) {
        if (d.points.length < 2) return;

        target.beginPath();
        target.lineWidth = d.properties.lineWidth;
        target.strokeStyle = d.properties.color;
        target.lineJoin = 'round';
        target.lineCap = 'round';

        let started = false;

        for (const point of d.points) {
            const x = this._resolveX(point.time);
            const y = this._series.priceToCoordinate(point.price);

            if (x !== null && y !== null) {
                if (!started) {
                    target.moveTo(x, y);
                    started = true;
                } else {
                    target.lineTo(x, y);
                }
            }
        }

        if (started) {
            target.stroke();
        }

        if (d.selected && !isTemp) {
            target.save();
            target.globalAlpha = 0.2;
            target.lineWidth = d.properties.lineWidth + 4;
            target.strokeStyle = '#3b82f6';
            target.stroke();
            target.restore();
        }
    }

    private _drawDrawing(target: CanvasRenderingContext2D, d: Drawing, isTemp: boolean = false) {
        if (d.points.length < 2) return;
        
        const p1 = d.points[0];
        const p2 = d.points[1];

        const x1 = this._resolveX(p1.time);
        const y1 = this._series.priceToCoordinate(p1.price);
        const x2 = this._resolveX(p2.time);
        const y2 = this._series.priceToCoordinate(p2.price);

        if ((x1 === null && y1 !== null) || (x2 === null && y2 !== null)) {
            target.save();
            target.beginPath();
            target.strokeStyle = d.properties.color;
            target.lineWidth = 1;
            target.globalAlpha = 0.5;
            
            if (y1 !== null) {
                const drawY = y1;
                target.moveTo(target.canvas.width - 10, drawY);
                target.lineTo(target.canvas.width, drawY);
            }
             if (y2 !== null) {
                const drawY = y2;
                target.moveTo(target.canvas.width - 10, drawY);
                target.lineTo(target.canvas.width, drawY);
            }
            target.stroke();
            target.restore();
        }

        if (x1 === null || y1 === null || x2 === null || y2 === null) return;

        target.beginPath();
        target.lineWidth = d.properties.lineWidth;
        target.strokeStyle = d.properties.color;
        
        if (d.properties.lineStyle === 1) target.setLineDash([2, 2]); 
        if (d.properties.lineStyle === 2) target.setLineDash([5, 5]); 
        
        target.moveTo(x1, y1);

        if (d.type === 'ray') {
            const dx = x2 - x1;
            const dy = y2 - y1;

            if (dx === 0 && dy === 0) {
                target.lineTo(x2, y2);
            } else {
                 const extensionFactor = 2000; 
                 const xEnd = x1 + dx * extensionFactor;
                 const yEnd = y1 + dy * extensionFactor;
                 target.lineTo(xEnd, yEnd);
            }
        } else {
            target.lineTo(x2, y2);
        }

        target.stroke();
        target.setLineDash([]); 

        if (d.selected || d.hovered || isTemp) {
            this._drawAnchor(target, x1, y1, d.selected);
            this._drawAnchor(target, x2, y2, d.selected);
        }
    }

    private _drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number, selected: boolean = false) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = selected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#2962ff';
        ctx.stroke();
    }
}

class TrendlinePaneView implements ISeriesPrimitivePaneView {
    private _source: TrendlinePrimitive;

    constructor(source: TrendlinePrimitive) {
        this._source = source;
    }

    zOrder(): SeriesPrimitivePaneViewZOrder {
        return 'top';
    }

    renderer(): ISeriesPrimitivePaneRenderer {
        return new TrendlinePaneRenderer(
            this._source.drawings,
            this._source._transientDrawings,
            this._source._tempDrawing,
            this._source.data, 
            this._source.chart?.timeScale() || null,
            this._source.series,
            this._source._textBoundsCache
        );
    }
}

export class TrendlinePrimitive implements ISeriesPrimitive {
    _drawings: Drawing[] = [];
    _transientDrawings: Drawing[] = [];
    _tempDrawing: Drawing | null = null;
    _data: OhlcData[] = [];
    _chart: IChartApi | null = null;
    _series: ISeriesApi<any> | null = null;
    _paneViews: TrendlinePaneView[];
    _dirty: boolean = true;
    _textBoundsCache: Map<string, { x: number, y: number, w: number, h: number }> = new Map();

    constructor() {
        this._paneViews = [new TrendlinePaneView(this)];
    }

    attached({ chart, series, requestUpdate }: any) {
        this._chart = chart;
        this._series = series;
        this.requestUpdate = () => {
             this._dirty = true;
             requestUpdate();
        };
    }

    detached() {
        this._chart = null;
        this._series = null;
    }

    public setData(data: OhlcData[]) {
        this._data = data;
        this._dirty = true;
        this.requestUpdate();
    }

    public setDrawings(drawings: Drawing[]) {
        this._drawings = drawings;
        const ids = new Set(drawings.map(d => d.id));
        for (const id of this._textBoundsCache.keys()) {
            if (!ids.has(id)) this._textBoundsCache.delete(id);
        }
        this._dirty = true;
        this.requestUpdate();
    }
    
    // MANDATE 1.4: Transient Drawings Setter
    public setTransientDrawings(drawings: Drawing[]) {
        this._transientDrawings = drawings;
        this._dirty = true;
        this.requestUpdate();
    }
    
    public updateTempDrawing(drawing: Drawing | null) {
        this._tempDrawing = drawing;
        this._dirty = true;
        this.requestUpdate();
    }

    public get drawings() { return this._drawings; }
    public get data() { return this._data; }
    public get chart() { return this._chart; }
    public get series() { return this._series; }

    public requestUpdate = () => {};

    paneViews() { return this._paneViews; }
    
    // --- HIT TESTING (Main Thread) ---
    hitTest(x: number, y: number): { drawing: Drawing, anchor?: number } | null {
        if (!this._chart || !this._series || this._data.length === 0) return null;
        
        const threshold = 8; 

        // Check both persisted and transient drawings
        const allDrawings = [...this._drawings, ...this._transientDrawings];

        for (const d of allDrawings) {
            // Text Hit Test
            if (d.type === 'text') {
                const bounds = this._textBoundsCache.get(d.id);
                if (bounds) {
                    if (x >= bounds.x - 5 && x <= bounds.x + bounds.w + 5 &&
                        y >= bounds.y - 5 && y <= bounds.y + bounds.h + 5) {
                        return { drawing: d, anchor: 0 };
                    }
                }
                continue;
            }

            // Brush Hit Test
            if (d.type === 'brush') {
                if (d.points.length < 2) continue;
                let isHit = false;
                for (let i = 0; i < d.points.length - 1; i++) {
                    const p1 = d.points[i];
                    const p2 = d.points[i+1];
                    const x1 = this._resolveCoordinateX(p1.time);
                    const y1 = this._series.priceToCoordinate(p1.price);
                    const x2 = this._resolveCoordinateX(p2.time);
                    const y2 = this._series.priceToCoordinate(p2.price);
                    if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
                    if (this._distanceToSegment(x, y, x1, y1, x2, y2) <= threshold) {
                        isHit = true; break;
                    }
                }
                if (isHit) return { drawing: d };
                continue;
            }

            // Infinite Lines Hit Test
            if (d.type === 'horizontal_line') {
                if (d.points.length === 0) continue; // Safety Guard
                const p = d.points[0];
                const yLine = this._series.priceToCoordinate(p.price);
                if (yLine !== null && Math.abs(yLine - y) <= threshold) return { drawing: d, anchor: 0 };
                continue;
            }
            if (d.type === 'vertical_line') {
                if (d.points.length === 0) continue; // Safety Guard
                const p = d.points[0];
                const xLine = this._resolveCoordinateX(p.time);
                if (xLine !== null && Math.abs(xLine - x) <= threshold) return { drawing: d, anchor: 0 };
                continue;
            }
            
            // Horizontal Ray Hit Test
            if (d.type === 'horizontal_ray') {
                if (d.points.length === 0) continue; // Safety Guard
                const p = d.points[0];
                const xOrigin = this._resolveCoordinateX(p.time);
                const yLine = this._series.priceToCoordinate(p.price);
                
                if (xOrigin !== null && yLine !== null) {
                    // Check if x is to the right of origin (or close to it) and y matches
                    if (x >= xOrigin - threshold && Math.abs(yLine - y) <= threshold) {
                         return { drawing: d, anchor: 0 };
                    }
                }
                continue;
            }

            // Shapes Hit Test (Rect, Triangle, Rotated)
            if (['rectangle', 'triangle', 'rotated_rectangle'].includes(d.type)) {
                // 1. Check Anchors
                const coords = d.points.map(p => ({
                    x: this._resolveCoordinateX(p.time),
                    y: this._series!.priceToCoordinate(p.price)
                }));
                
                // Guard: Filter out invalid coords for hit testing
                if (coords.some(c => c.x === null || c.y === null)) continue;
                
                for(let i=0; i<coords.length; i++) {
                    const c = coords[i];
                    if (c && c.x !== null && c.y !== null) {
                         if (Math.hypot(x - c.x, y - c.y) <= threshold) return { drawing: d, anchor: i };
                    }
                }

                // 2. Check Polygon Fill
                const validCoords = coords.filter(c => c && c.x !== null && c.y !== null) as {x:number, y:number}[];
                
                // Construct polygon based on type
                let polygon: {x:number, y:number}[] = [];
                if (d.type === 'rectangle' && validCoords.length >= 2) {
                     const [c1, c2] = validCoords;
                     polygon = [
                         {x: c1.x, y: c1.y},
                         {x: c2.x, y: c1.y},
                         {x: c2.x, y: c2.y},
                         {x: c1.x, y: c2.y}
                     ];
                } else if (d.type === 'triangle' && validCoords.length >= 3) {
                     polygon = validCoords;
                } else if (d.type === 'rotated_rectangle' && validCoords.length >= 3) {
                     const [p1, p2, p3] = validCoords;
                     const u = { x: p2.x - p1.x, y: p2.y - p1.y };
                     const v = { x: p3.x - p1.x, y: p3.y - p1.y };
                     const dotUU = u.x * u.x + u.y * u.y;
                     if (dotUU > 0) {
                        const scale = (v.x * u.x + v.y * u.y) / dotUU;
                        const proj = { x: u.x * scale, y: u.y * scale };
                        const perp = { x: v.x - proj.x, y: v.y - proj.y };
                        const p4 = { x: p1.x + perp.x, y: p1.y + perp.y };
                        const p5 = { x: p2.x + perp.x, y: p2.y + perp.y };
                        polygon = [p1, p2, p5, p4];
                     }
                }

                if (polygon.length > 2 && isPointInPolygon({x,y}, polygon)) {
                    return { drawing: d };
                }
                continue;
            }

            // Trendline/Ray Logic
            if (d.points.length < 2) continue;
            const p1 = d.points[0];
            const p2 = d.points[1];
            const x1 = this._resolveCoordinateX(p1.time);
            const x2 = this._resolveCoordinateX(p2.time);
            const y1 = this._series.priceToCoordinate(p1.price);
            const y2 = this._series.priceToCoordinate(p2.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
            if (Math.hypot(x - x1, y - y1) <= threshold) return { drawing: d, anchor: 0 };
            if (Math.hypot(x - x2, y - y2) <= threshold) return { drawing: d, anchor: 1 };
            const dist = this._distanceToSegment(x, y, x1, y1, x2, y2);
            if (dist <= threshold) return { drawing: d };
        }
        return null;
    }

    private _resolveCoordinateX(time: number): number | null {
        if (!this._chart) return null;
        const timeScale = this._chart.timeScale();
        let x = timeScale.timeToCoordinate(time as Time);
        if (x === null) {
            const idx = getLogicalIndexForTime(this._data, time);
            if (idx !== null) x = timeScale.logicalToCoordinate(idx);
        }
        return x;
    }

    private _distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        return Math.hypot(px - projX, py - projY);
    }
}