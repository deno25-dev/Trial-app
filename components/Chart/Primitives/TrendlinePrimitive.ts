import { 
    ISeriesPrimitive, 
    PrimitivePaneViewZOrder, 
    IPrimitivePaneView, 
    IPrimitivePaneRenderer, 
    Time, 
    ISeriesApi,
    IChartApi,
    AutoscaleInfo,
    Logical,
    PrimitiveHoveredItem
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
    
    // If time is within range, binary search
    if (time >= first && time <= last) {
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const midVal = data[mid].time;
            
            if (midVal === time) return mid;
            else if (midVal < time) lo = mid + 1;
            else hi = mid - 1;
        }
    }

    // 3. Extrapolation / Interpolation
    const sampleSize = Math.min(data.length, 10);
    // Ensure we have enough data for interval calculation
    if (sampleSize < 2) return 0;

    // Calculate average time interval between bars for projection
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
        // Between bars (Interpolate between hi and lo from binary search result)
        if (lo <= 0) return 0;
        if (lo >= data.length) return data.length - 1;
        
        const tLower = data[lo - 1].time;
        const tUpper = data[lo].time;
        
        const range = tUpper - tLower;
        if (range === 0) return lo;

        const ratio = (time - tLower) / range;
        return (lo - 1) + ratio;
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

class TrendlinePaneRenderer implements IPrimitivePaneRenderer {
    private _drawings: Drawing[];
    private _transientDrawings: Drawing[];
    private _tempDrawing: Drawing | null;
    private _data: OhlcData[];
    private _timeScale: any;
    private _series: ISeriesApi<any>;
    private _textBoundsCache: Map<string, { x: number, y: number, w: number, h: number }>;
    private _activeInteractionId: string | null;

    constructor(
        drawings: Drawing[], 
        transientDrawings: Drawing[],
        tempDrawing: Drawing | null, 
        data: OhlcData[],
        timeScale: any, 
        series: ISeriesApi<any>,
        textBoundsCache: Map<string, { x: number, y: number, w: number, h: number }>,
        activeInteractionId: string | null
    ) {
        this._drawings = drawings;
        this._transientDrawings = transientDrawings;
        this._tempDrawing = tempDrawing;
        this._data = data;
        this._timeScale = timeScale;
        this._series = series;
        this._textBoundsCache = textBoundsCache;
        this._activeInteractionId = activeInteractionId;
    }

    draw(target: any) {
        target.useMediaCoordinateSpace((scope: any) => {
            this._drawImpl(scope.context, scope.mediaSize.width, scope.mediaSize.height);
        });
    }

    private _drawImpl(ctx: CanvasRenderingContext2D, width: number, height: number) {
        if (!ctx || !this._timeScale || !this._series) return;
        
        ctx.save();

        // Combine persisted and transient drawings for zero-flicker rendering
        const drawingsToRender = [...this._drawings, ...this._transientDrawings];
        
        const renderDrawing = (d: Drawing, isTemp: boolean) => {
            // Guard: Atomic Object Purge - Fix Partial Deletions
            // If the object is missing points, skip it entirely.
            if (!d.points || d.points.length === 0) return;
            
            // Additional guard for shapes that require at least 2 points
            if (['trendline', 'ray', 'arrow_line', 'brush', 'rectangle', 'triangle', 'rotated_rectangle'].includes(d.type)) {
                if (d.points.length < 2) return;
            }

            switch(d.type) {
                case 'text': this._drawText(ctx, d, isTemp); break;
                case 'brush': this._drawBrush(ctx, d, isTemp); break;
                case 'rectangle': this._drawRectangle(ctx, d, isTemp); break;
                case 'triangle': this._drawTriangle(ctx, d, isTemp); break;
                case 'rotated_rectangle': this._drawRotatedRectangle(ctx, d, isTemp); break;
                case 'horizontal_line': this._drawHorizontalLine(ctx, d, isTemp, width); break;
                case 'vertical_line': this._drawVerticalLine(ctx, d, isTemp, height); break;
                case 'horizontal_ray': this._drawHorizontalRay(ctx, d, isTemp, width); break;
                case 'arrow_line': this._drawArrowLine(ctx, d, isTemp); break;
                case 'trendline': 
                case 'ray':
                default: this._drawDrawing(ctx, d, isTemp); break;
            }
        };

        drawingsToRender.forEach(d => {
            // HIDE-ON-DRAG: If this drawing is currently being interacted with (moved/resized),
            // skip rendering the "static" version. The _tempDrawing (passed as true) will take its place.
            if (d.id === this._activeInteractionId) return;
            renderDrawing(d, false);
        });

        if (this._tempDrawing) renderDrawing(this._tempDrawing, true);

        ctx.restore();
    }

    private _resolveX(time: number): number | null {
        const logicalIndex = getLogicalIndexForTime(this._data, time);
        if (logicalIndex !== null) {
            return this._timeScale.logicalToCoordinate(logicalIndex as Logical);
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

    private _drawHorizontalLine(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean, width: number) {
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
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
             const x = this._resolveX(p.time);
             if (x !== null) this._drawAnchor(ctx, x, y, d.selected);
        }
    }

    private _drawHorizontalRay(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean, width: number) {
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
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (d.selected || isTemp) {
             this._drawAnchor(ctx, x, y, d.selected);
        }
    }

    private _drawVerticalLine(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean, height: number) {
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
        ctx.lineTo(x, height);
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
        ctx.moveTo(x2, y2);
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
            ctx.fillStyle = d.properties.backgroundColor || (d.properties.color + '33'); 
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
            this._drawAnchor(ctx, c1!.x, c2!.y, d.selected);
            this._drawAnchor(ctx, c2!.x, c1!.y, d.selected);
        }
    }

    private _drawTriangle(ctx: CanvasRenderingContext2D, d: Drawing, isTemp: boolean) {
        const coords = this._getCoords(d.points);
        if (coords.length < 3 || coords.some(c => c === null)) return;
        
        ctx.beginPath();
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
        if (coords.length < 3 || coords.some(c => c === null)) return;
        
        const [p1, p2, p3] = coords as {x: number, y: number}[];

        const u = { x: p2.x - p1.x, y: p2.y - p1.y };
        const v = { x: p3.x - p1.x, y: p3.y - p1.y };
        
        const dotUU = u.x * u.x + u.y * u.y;
        if (dotUU === 0) return;

        const scale = (v.x * u.x + v.y * u.y) / dotUU;
        const proj = { x: u.x * scale, y: u.y * scale };
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
            this._drawAnchor(ctx, p3.x, p3.y, d.selected);
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
        const h = fontSize; 

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
                 const extensionFactor = 5000; 
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

class TrendlinePaneView implements IPrimitivePaneView {
    private _source: TrendlinePrimitive;

    constructor(source: TrendlinePrimitive) {
        this._source = source;
    }

    zOrder(): PrimitivePaneViewZOrder {
        return 'top';
    }

    renderer(): IPrimitivePaneRenderer {
        return new TrendlinePaneRenderer(
            this._source.drawings,
            this._source._transientDrawings,
            this._source._tempDrawing,
            this._source.data, 
            this._source.chart?.timeScale() || null,
            this._source.series,
            this._source._textBoundsCache,
            this._source._activeInteractionId
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
    _activeInteractionId: string | null = null;

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

    autoscaleInfo(startTimePoint: any, endTimePoint: any): AutoscaleInfo | null {
        return null;
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

    public setActiveInteractionId(id: string | null) {
        this._activeInteractionId = id;
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
    hitTest(x: number, y: number): (PrimitiveHoveredItem & { drawing: Drawing, anchor?: number }) | null {
        if (!this._chart || !this._series || this._data.length === 0) return null;
        
        const threshold = 8; 
        
        let bestHit: (PrimitiveHoveredItem & { drawing: Drawing, anchor?: number }) | null = null;
        let minDistance = Infinity;

        // Check both persisted and transient drawings
        const allDrawings = [...this._drawings, ...this._transientDrawings];

        for (const d of allDrawings) {
            // Guard against invalid objects
            if (!d.points || d.points.length === 0) continue;

            let currentDist = Infinity;
            let currentHit: (PrimitiveHoveredItem & { drawing: Drawing, anchor?: number }) | null = null;

            // 1. Text Hit Test
            if (d.type === 'text') {
                const bounds = this._textBoundsCache.get(d.id);
                if (bounds) {
                    if (x >= bounds.x - 5 && x <= bounds.x + bounds.w + 5 &&
                        y >= bounds.y - 5 && y <= bounds.y + bounds.h + 5) {
                        currentDist = 0; // High priority (Direct Hit)
                        currentHit = { zOrder: 'top', externalId: d.id, drawing: d, anchor: 0 };
                    }
                }
            } 
            
            // 2. Resolve Coordinates for Lines/Shapes
            else {
                const coords = d.points.map(p => ({
                    x: this._resolveCoordinateX(p.time),
                    y: this._series!.priceToCoordinate(p.price)
                }));

                // Skip if any coordinate is unresolved (off-screen logic handled by resolveX usually returns valid or null)
                if (coords.some(c => c.x === null || c.y === null)) continue;
                const validCoords = coords as {x:number, y:number}[];

                // 2a. Anchor Hit Test (Highest Priority)
                for(let i=0; i<validCoords.length; i++) {
                    const c = validCoords[i];
                    const dist = Math.hypot(x - c.x, y - c.y);
                    if (dist <= threshold) {
                         // Prefer anchors over body if distance is similar
                         if (dist < minDistance) {
                             currentDist = dist;
                             currentHit = { zOrder: 'top', externalId: d.id, drawing: d, anchor: i };
                         }
                    }
                }

                // If anchor hit found and it's very close, it usually wins, but let's check body too just in case
                if (currentHit && currentDist < 1) { 
                    // optimization: very close to anchor
                } else {
                    // 2b. Body Hit Test
                    
                    // Brush
                    if (d.type === 'brush') {
                        for (let i = 0; i < validCoords.length - 1; i++) {
                             const dist = this._distanceToSegment(x, y, validCoords[i].x, validCoords[i].y, validCoords[i+1].x, validCoords[i+1].y);
                             if (dist < currentDist) {
                                 currentDist = dist;
                                 currentHit = { zOrder: 'top', externalId: d.id, drawing: d };
                             }
                        }
                    }
                    // Infinite Lines
                    else if (d.type === 'horizontal_line') {
                        const dist = Math.abs(validCoords[0].y - y);
                        if (dist < currentDist) { currentDist = dist; currentHit = { zOrder: 'top', externalId: d.id, drawing: d, anchor: 0 }; }
                    }
                    else if (d.type === 'vertical_line') {
                        const dist = Math.abs(validCoords[0].x - x);
                        if (dist < currentDist) { currentDist = dist; currentHit = { zOrder: 'top', externalId: d.id, drawing: d, anchor: 0 }; }
                    }
                    else if (d.type === 'horizontal_ray') {
                        if (x >= validCoords[0].x - threshold) {
                             const dist = Math.abs(validCoords[0].y - y);
                             if (dist < currentDist) { currentDist = dist; currentHit = { zOrder: 'top', externalId: d.id, drawing: d, anchor: 0 }; }
                        }
                    }
                    // Shapes (Polygon Fill Check)
                    else if (['rectangle', 'triangle', 'rotated_rectangle'].includes(d.type)) {
                        let polygon: {x:number, y:number}[] = [];
                        
                        if (d.type === 'rectangle' && validCoords.length >= 2) {
                             const [c1, c2] = validCoords;
                             polygon = [{x: c1.x, y: c1.y}, {x: c2.x, y: c1.y}, {x: c2.x, y: c2.y}, {x: c1.x, y: c2.y}];
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
                            // Being inside a shape is a hit, but usually edges/anchors have priority if overlapping
                            // Give it a slightly higher distance than 0 so lines on top win?
                            // Or just 0. Let's say 0.
                            if (currentDist > 0) {
                                currentDist = 0;
                                currentHit = { zOrder: 'top', externalId: d.id, drawing: d };
                            }
                        }
                    }
                    // Trendline / Ray / Arrow
                    else if (validCoords.length >= 2) {
                        const p1 = validCoords[0];
                        const p2 = validCoords[1];
                        const dist = this._distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                        if (dist < currentDist) {
                            currentDist = dist;
                            currentHit = { zOrder: 'top', externalId: d.id, drawing: d };
                        }
                    }
                }
            }

            // Update Best Hit if this drawing is closer
            if (currentHit && currentDist < minDistance && currentDist <= threshold) {
                minDistance = currentDist;
                bestHit = currentHit;
            }
        }
        
        return bestHit;
    }

    private _resolveCoordinateX(time: number): number | null {
        if (!this._chart) return null;
        const timeScale = this._chart.timeScale();
        const idx = getLogicalIndexForTime(this._data, time);
        if (idx !== null) return timeScale.logicalToCoordinate(idx as Logical);
        return null;
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