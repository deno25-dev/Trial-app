Recently added

I) Pop up menus styling and appearance:
Adhere to the glassmorphic standards as described
Key Visual Updates:
Transparency: Confirmed usage of bg-surface/60 combined with backdrop-blur-md for the correct glass effect.
Borders: Switched from the standard border-border (which can be too thick/flat) to border-white/10. This creates the subtle, thin, high-tech border line seen in "Red Pill" UI aesthetics.
Separators: Updated internal dividers and headers to use border-white/5 for a very subtle separation that doesn't break the glass flow.
Hover States: Changed item hover states to hover:bg-white/5 to ensure the hover effect feels like a light glaze rather than a solid color block.


APP ARCHITECTURE, LOGIC & HANDLING

0.1: System Architecture
The application follows a Modular Hybrid Architecture designed to bridge the gap between high-performance local data crunching and a web-testable frontend.
Frontend (UI Layer): React 19 + TypeScript. It handles visualization, user interactions, and state orchestration.
Backend (Engine Layer): Rust. It serves as the "Heavy Lifter," utilizing Polars for multi-threaded, columnar data processing (Arrow-compatible).
Bridge (Communication Layer): Tauri IPC (Inter-Process Communication). It acts as the secure "Single Source of Truth" for data transfer between React and Rust.
Storage (Persistence Layer): SQLite. It is implemented via a Dual-Boot Engine that switches drivers based on the execution environment (Native vs. Web).

0.2: The Technology Stack
The stack is selected for maximum speed, local file system control, and offline-first capabilities.

0.3: Database Structure (Dual-Boot Engine)
The database follows an Environment-Aware Driver pattern to ensure the app works in both a web-based coding agent and a local desktop environment.
0.3.1: Metadata Schema
The core schema is defined centrally in types.ts to ensure consistency across all layers.
OhlcData: time (Unix), open, high, low, close, volume.
BacktestResults: id, strategy_name, timestamp, pnl, drawdown.
StickyNotes: id, content, position (x, y), size (w, h), color.
0.3.2: Multi-Engine Drivers
Native Mode (Desktop): Connects to a physical .sqlite file using the Tauri SQL plugin. It handles real persistent data.
Web Mode (Development): Uses an in-memory "virtual" database (WASM-based simulation). It allows you to test the app in a browser without needing disk access.

0.4: Data Flow & Memory Management
To handle "TradingView-scale" data, the app uses zero-copy principles.
Ingestion: User selects a local CSV.
Rust Processing: Rust reads the file directly into a Polars DataFrame. It performs calculations (e.g., SMA, RSI) entirely in Rust to keep the UI thread free.
Transfer: Optimized JSON or Array Buffers are sent over the Tauri bridge to the frontend.
Rendering: Lightweight Charts renders only the visible range of data to maintain 60FPS.

0.5: Global State & Environment Checks
The application uses a TauriService to abstract platform differences. It checks for window.__TAURI__ to decide whether to call native Rust commands or mock responses for the web. This ensures that your "web-based coding agent" doesn't crash when it encounters desktop-only code.

0.6: Global Theming System
The application implements a comprehensive light/dark mode switch that affects all layers of the UI.
Config: THEME_CONFIG in constants.ts defines both dark and light palettes.
Injection: CSS variables are defined in index.html (using :root and .dark).
Orchestration: ChartContext.tsx manages the theme state and toggles the dark class on the global <html> element.
Reactivity: FinancialChart.tsx and TopBar.tsx react dynamically to theme changes, updating chart colors and icons (Sun/Moon) in real-time.
Default Preservation: The 'Midnight River' Theme is the primary app theme.

0.7: Interactive Bottom Panel (Market Overview)
This mandate defines the behavior and structural constraints of the bottom-docked panel, ensuring dynamic layout adjustment and responsive chart resizing.
0.7.1: State & Transition Logic
Visibility Management: The panel’s state (Open/Closed) is managed within MainLayout.tsx using a local useState hook.
Dimensional Constraints: * Expanded: The panel maintains a maximum height of 256px (h-64).
Collapsed: The panel minimizes to its header height of 40px (h-10).
Motion: All height transitions utilize a smooth CSS transition (transition-all duration-300 ease-in-out) to provide a premium, desktop-native feel.
0.7.2: Chart Interactivity & Responsiveness
Dynamic Reflow: The FinancialChart.tsx component must utilize a ResizeObserver to detect shifts in the layout's flex container.
Automatic Scaling: When the Market Overview panel expands or collapses, the chart must instantly trigger its internal resize() method to fill the newly available vertical space, ensuring no "dead zones" appear in the UI.
0.7.3: UI/UX Componentry
Header Interaction: The header of MarketOverview.tsx acts as the toggle trigger.
Visual Cues: A Chevron icon (Up/Down) must be present in the top-right of the panel to indicate the current state.
Layout Isolation: The panel is positioned at the bottom of the main content area, separate from the sidebars, using a flex-column arrangement to push the chart upward.

0.8: Telemetry & Developer Diagnostics
This mandate establishes a robust system for real-time error reporting, performance monitoring, and system-wide logging, accessible via a specialized developer interface.
0.8.1: Telemetry Architecture
Singleton Service: A centralized TelemetryService (located in utils/telemetry.ts) acts as a global collector for logs across both React components and non-React files like tauriService.ts.
Decoupled Logging: The service allows any part of the app to report errors without requiring access to the React Context, ensuring the UI remains subscribed to updates without circular dependencies.
Categorization: Logs must be classified into strict categories (e.g., UI State, Network, Performance, Persistence, Bridge, Database) to allow for granular isolation and debugging.
0.8.2: The Developer Console (Diagnostics Window)
Access: The panel is toggled globally using the keyboard shortcut CTRL + D.
UI Inspiration: The interface follows a "Chrome Console" design, featuring high-density logs, category filtering, and timestamping.
Data Export: To facilitate external analysis, the console includes functions for outputting errors as JSON strings and a "Copy to Clipboard" feature for quick reporting.
0.8.3: Memory & Performance Constraints
Buffer Capping: To prevent memory leaks during long-running sessions, the telemetry console is capped at a maximum of 200 entries.
Circular Buffer: Upon reaching the 200-entry limit, the system must automatically delete the oldest log entries to make room for new data.
0.8.4: Integration Requirements
Mandatory Injection: Telemetry logging calls must be injected into all critical system paths, including the Tauri Bridge (IPC calls), the Financial Chart (rendering lifecycle), and the Market Overview (stream B data flow).
LogLevel Standards: Logs must use standardized levels (Info, Warn, Error, Success) with corresponding visual color coding (e.g., blue for Info, yellow for Warn, red for Error)

0.9: Performance & Resource Orchestration
To fix the lag and stabilize the panel behavior, we must implement strict resource management.
0.9.1: IPC Debouncing & Throttling
Throttling: The get_market_overview call must be restricted. If a previous call is still "Pending," the app must not initiate a new one.
Priority Queuing: Critical UI interactions (like opening/closing the bottom panel) must be given priority over data background fetches.
0.9.2: Resilience & Connection Handling
Exponential Backoff: Upon receiving a Market Stream Failed error, the app must wait 2, 4, 8, then 16 seconds before retrying, rather than spamming the bridge immediately.
State Reset: If the bottom panel fails to open, the TauriService must perform a "Bridge Reset" to clear any hung IPC promises.
0.9.3: Chart Optimization (Level of Detail)
Decimation: When the bottom panel is open (reducing chart height), the chart should render fewer data points (e.g., 500 instead of 1000) to avoid the "Dropped Frame" issue.
Worker Offloading: All CSV parsing and indicator math must remain strictly in the Rust/Polars layer to prevent the 6-second freezes seen in the logs.
Mandate 0.10: Branding & Visual Rules

0.10.1 No Third-Party Branding
Strict Prohibition: The app must **NOT** display logos, "Powered by", or attribution links for:
    *   TradingView
    *   Binance
    *   Any other data provider
Implementation: CSS rules in `index.css` explicitly hide the `tv-lightweight-charts-attribution` class.
0.10.2 Aesthetic Guidelines
Style: "Red Pill" / "Terminal" / "Bloomberg Terminal".
Vibe: Professional, high-density information, low-distraction.
Icons: Use `lucide-react` exclusively. No FontAwesome or other icon sets.

Mandate 0.11 Data handling - Read/write Structures
0.11.1 Data Acquisition Segregation (summary)
We adhere to a 4-Lane Data Architecture. We must validate every data request against these rules:
Lane 1 (Assets): READ ONLY. Use a Rust background scanner and SQLite metadata cache. Path: ./Assets.
Lane 2 (Explorer): READ ONLY. Stateless. Use Polars LazyFrames for external paths. Do not cache in DB.
Lane 3 (Database): ATOMIC READ/WRITE. Use Diesel (SQLite) for relational data (Trades/Object Tree) and Atomic JSON for fluid data (Layouts/Notes). Path: ./Database.
Lane 4 (Market): STREAM ONLY. No disk write. Use Tauri Managed State and Events to pipe Binance WS data to the UI.
Abstraction Rule: All calls must go through tauriService.ts. If window.__TAURI__ is missing, use Mock Data providers for Web testing."

0.11.2 The "Asset Library" (Internal/Automatic)
Scope: Managed internal data.
Access method: Search button opens up system overlay panel showing assets data store in .csv files and folders in a dedicated folder in the root dir called 'Assets'. If not available should be created automatically. Uses a Rust background scanner and SQLite metadata cache.
Asset Library Isolation 
The Correction: The Asset Library scanner is now Strictly Bound to the Assets/ directory.
Strict Constraint: The scanner must utilize an absolute path resolved at runtime. It is explicitly FORBIDDEN from traversing any directory outside of ROOT/Assets/.
File Type Lock: The Asset Library scanner shall only index files with the .csv extension. Any other file type (including .json, .txt, or .bin) encountered within the Assets/ tree must be ignored to prevent engine pollution.
Location: Strictly limited to the Assets/ folder within the application's root directory.
Discovery: Automatic & Recursive. Upon application launch (or "Refresh Library" command), the system must scan this folder for sub-directories (symbols) and .csv files.

0.11.3 The Data Explorer (External / High-Volume)
Source: Anywhere else (HDD, USB, Network, External drives). 
Scope: Ad-hoc external analysis.
Approach: Stateless Polars Lazy-Loading.
Discovery: Manual & Targeted. Triggered only by a user-initiated System File Dialog.
User Flow: The user clicks "Open Folder" or "Import File," selects a path, and the app loads that specific instance without adding it to the permanent internal library.
Access Method: Uses the DataExplorer component which opens left side panel and standard OS-level file pickers.
The Logic: Since these files are external and potentially massive (GBs), we never move them or cache them in the database. We treat them as "Guests."
The Tech:
Polars (Rust): We use LazyFrame. When you select a file from your Flash stick, Rust opens a "pointer" to it.
Tauri IPC Bridge: React sends the path; Rust streams only the visible "chunks" of data needed for the current zoom level of the chart.
Nuance: This avoids "Database Intrusion" because the external data never enters your internal app database.

0.11.4 The "Database" Items (Atomic Read/Write / Critical)
Items: Drawings, Sticky Notes, Layouts, Trades, Object Tree. Approach: Relational SQLite (Diesel) + JSON Sidecars.
The Logic: These are "Mission Critical." If you lose a Trade record or a complex Layout, the app is broken. We need ACID compliance (Atomicity, Consistency, Isolation, Durability).
The Tech:
Diesel (Rust): Use this for Trades and the Object Tree. These are relational. If you delete a Symbol, all its "Children" (drawings) must be surgically removed (Cascade Delete).
Atomic JSON Writes: For Layouts and Sticky Notes, we write to a .tmp file first, then rename it to the final .json in the /Database folder. This prevents "Partial Writes" (corruption) if the app crashes mid-save.
TanStack Mutations: In React, we use useMutation with Optimistic Updates. The moment you move a Sticky Note, the UI updates. The "Success" or "Failure" of the file-write happens in the background.

0.11.4.A Storage Structure & Hierarchy 
·	Original Intent: Create a Database folder for app metadata.
·	The Correction: The Database/ directory is hereby designated as System Metadata Only.
·	Sub-folder Integrity: This directory shall contain StickyNotes/, Layouts/, Settings/, Trades/, and Orders/.
·	*Scanner Exclusion*: Under NO circumstances shall the Asset Library Scanner or the Local Data Explorer enter the Database/ root or its sub-folders. This directory is "INVINCIBLE" to the charting data-stream.
·	The Root: Upon initialization (or build), the app must ensure the existence of a /Database directory in the application's root directory.
·	Automatic Sub-structuring: Every feature requiring persistence must own a named sub-folder within /Database.
o	/Database/ObjectTree/: Stores JSON manifests of folders and groupings.
o	/Database/Drawings/: Stores serialized drawing arrays keyed by symbol_interval.json.
o	/Database/Settings/: Stores theme.json and user preferences.
o	/Database/ChartSplit/: Stores layout configurations (Split 2x, 4x, etc.).
·	Sync Trigger: Saving is Atomic. When a change occurs (e.g., a new folder is created in the Object Tree), the app serializes that specific module's state and overwrites the corresponding JSON file in the Database.

0.11.4.B The "Trade Ledger" Logic 
Storage Strategy: In accordance with Mandate 0.15.2, all trade data is persisted in the central SQLite trades table.
Structure: The schema includes id, symbol, side, price, quantity, timestamp, and status.
Logic: Trades are treated as Global Metadata. While they are linked to a source_id for chart filtering, they are stored in a relational format to allow for high-speed global history queries and PnL calculations that bypass the limitations of flat JSON files.

0.11.4.C Metadata Execution Logic
1.	Sticky Note Execution: Opening a .json from Database/StickyNotes must parse the data and spawn/update a StickyNoteOverlay component with the saved content and position.
2.	Layout Execution: Opening a .json from Database/Layouts must pass the configuration to the Chart area, triggering a full re-render of the tabs, symbols, drawings and timeframes.
3.	The Trash Can: The deletion logic remains identical for both—a surgical removal of the metadata file from the disk followed by a UI refresh.

0.11.5 Market Overview (The Live Stream / Volatile)
Source: Binance WebSockets. Approach: State-Sync via Tauri Managed State.
The Logic: This is "Fire and Forget" data. It doesn't need to be saved to a database (to avoid disk wear), but it must be fast.
The Tech:
Rust tokio channels: The WebSocket runs in a dedicated Rust thread.
Tauri Events: Every 100ms-500ms (throttled), Rust emits a market-update event.
React Context: A dedicated MarketProvider listens for these events and updates only the "Market Overview" panel.
Nuance: By keeping this out of the main "Saving System," we ensure that a spike in market volatility doesn't slow down your ability to save a trade or draw a line.
Constraint: This data is **only** displayed in the "Market Overview" side panel, Watchlist, or Header Ticker. It is **never** plotted on the main candlestick chart.
Failure State: If offline, this stream dies gracefully without breaking other data streams.

0.11.5.A Smart Reconnection & API Throttling (The "Heartbeat" Logic)
To protect the application's performance and the user's IP reputation, all external data fetching (Market Overview, Live Prices) must utilize a managed reconnection strategy. This prevents "thundering herd" behavior during network transitions.

0.11.5.B Throttled Fetching & Settling
Standard Interval: Live data fetching must be throttled to a fixed interval (default: 30 seconds). Multiple overlapping fetch requests are strictly forbidden.
Settling Delay: Upon a transition from offline to online, the system must enforce a 2-second "Settling Delay". Do not attempt a fetch the instant the connection returns; wait for the network stack to stabilize.

0.11.5.C Exponential Backoff & Jitter
Failure Handling: If an API request fails (HTTP 429, 500, or Network Error), the application must implement an Exponential Backoff strategy.
Interval Scaling: Increase the wait time between retries: 5s → 10s → 20s → up to a maximum of 60s.
Manual Reset: Any user-initiated "Retry" or "Refresh" action must immediately reset the backoff timer to its base state and attempt a fetch.
0.11.5.D State Integrity & Cleanup
Race Condition Protection: Use an AbortController or a timestamp-check to ensure that if an older, delayed fetch finally resolves, it does not overwrite newer data in the UI.
Memory Management: All timers (setTimeout, setInterval) must be cleared in the component cleanup phase to prevent memory leaks, especially during rapid navigation between symbols.

Mandate 0.12 Offline-First Guardrails
The application must be fully functional for charting purposes without an internet connection.

0.12.1 Connectivity Check
Hook: `hooks/useOnlineStatus.ts`
Usage: Components relying on Stream B must check this hook before attempting network requests.
    ```typescript
    const isOnline = useOnlineStatus();
    if (!isOnline) return <OfflineFallback />;
    ```
0.12.2 Error Boundaries
Component: `GlobalErrorBoundary.tsx`
Usage: Wrap all major feature panels (Chart, Market Overview, Trading Panel).
Behavior: If a component crashes, the rest of the app must remain usable.

0.12.3 UI Fallbacks
Component: `MarketOfflineFallback.tsx`
Requirement: When Stream B fails (offline/API error), display this specific visual component. Do not show generic spinners indefinitely.

0.13 Scoped Persistence System (Drawing & Layout Guard)
To maintain technical analysis integrity, the application must strictly isolate chart states (drawings, indicators, and view settings) based on the unique identity of the data source.

0.13.1 The "Durable Identity" System Definition: Every data source (CSV/TXT) must be assigned a unique source_id derived from a Metadata Fingerprint (a combined hash of the file’s original name, its creation timestamp, and its total byte size) rather than its absolute file path. Constraint: This source_id acts as the primary key for all persisted chart states. By using a fingerprint instead of a path, the application ensures that drawings and indicators remain "attached" to the data even if the file is moved between directories or external drives.

0.13.2 Rust State Management (Backend)
·	Storage: Chart states must be persisted exclusively via the Rust backend into the Database/ directory using the Relational SQLite Database.
·	Relational Integrity: Individual drawing objects and object hierarchies must be stored in SQLite (via Diesel), while only fluid layout configurations are saved as Atomic JSON files.
·	Commands:
o	save_chart_state(source_id: String, state: JSON): Commits the current drawing array and layout configuration to the relational database.
o	load_chart_state(source_id: String): Performs a coordinated fetch from both the SQLite database (for drawings/objects) and the JSON store (for layout settings) to ensure a complete and isolated hydration of the chart.

0.13.3 React Hydration & Isolation Logic
The Switcher: Whenever a new file is loaded, the frontend must:
Immediate Purge: Clear all current drawings from the chart canvas to prevent visual pollution.
State Hydration: Fetch and apply the specific state associated with the new source_id.
Drawing Guard: The UI must disable drawing tools if no valid source_id is active, preventing "orphaned" drawings that cannot be saved.

0.14 React Component "Hard Remount"
The Key Strategy: The main Chart component or the primary Series must be bound to a unique React key derived from the active source_id or filename.
Behavior: When the source_id changes, React must treat the chart as a completely new instance, forcing a full unmount of the old chart and a fresh initialization of the new one. This ensures all internal library memory is purged.

0.14.1 Primitive Object Sanitization
Explicit Purge: Before hydrating a new chart state, the frontend must call a clearAllDrawings() sequence. This sequence must iterate through all primitive objects (PriceLines, Trendlines, Shapes) and call their respective .remove() methods.
Registry Management: Every drawing tool or price line added to the chart must be registered in a Map or Object ref using a unique UUID.
Targeted Deletion: When a user deletes a drawing, the system must look up the specific UUID in the registry to ensure the correct object is removed from both the UI and the underlying data structure.

0.14.2 Backend Validation & "Nuclear" Reset
Validation on Load: The system must validate drawing objects fetched from the Rust backend. Any object missing a valid source_id or containing corrupted metadata must be discarded immediately rather than rendered.
Emergency "Nuclear" Clear: The Developer Tools (Ctrl + D) must include a "Nuclear Clear" function. This command must:
Clear the UI.
Send a command to the Rust backend to permanently delete the entire record for the current source_id from the database.

0.15 Trade Persistence & Logger (The Simulation Engine)
To enable professional-grade backtesting and performance tracking, the application must persist every execution (Buy/Sell) to the Rust backend, ensuring trade history survives app restarts and asset switches.

0.15.1 The Trade Data Schema
Rust-Side Struct: Every trade must be defined by a structured object containing:
id: Unique UUID.
source_id: The Durable Metadata Fingerprint (Hash of initial name + creation date + byte size). Filename changes must NOT affect this ID.
execution_data: Price, quantity, and timestamp.
metadata: Contextual flag (Standard Mode vs. Advanced Replay).

0.15.2 Unified Persistence Logic Command: save_trade(trade: Trade) must commit exclusively to the Relational SQLite Database managed by the Rust backend. 
Integrity Guarantee: We ABANDON the trades.json approach to ensure ACID compliance. All trade executions MUST be stored in a central trades table. This allows for complex SQL queries (e.g., "Find all trades for BTCUSDT taken in Advanced Replay mode") to execute in sub-millisecond time, which is impossible with flat JSON files as the dataset grows.

0.15.3 Frontend Synchronization & Markers
Initial Load: Upon asset selection, the UI must fetch historical trades and populate the Order History Panel.
Chart Annotation: The system must automatically place Trade Markers (e.g., green up-arrows for buys, red down-arrows for sells) on the chart at the exact timestamp and price stored in the backend.
State Updates: In Advanced Replay, the active trade's unrealized PnL must be updated by the simulation "tick" before being finalized and saved to the backend upon closing.

0.16 High-Performance Brush & Overlay Architecture
To ensure a professional, zero-lag drawing experience, the application must utilize a Decoupled Overlay Strategy for high-frequency input tools like the Brush or Highlighter.

0.16.1 The "Transient Canvas" Layer
Dual-Layer Rendering: The UI must maintain two separate visual layers:
The Main Chart Layer: Handles the rendering of candles, grids, and established drawings.
The Interaction Overlay: A dedicated, transparent <canvas> element positioned directly over the chart.
Live Drawing: While the mouse is down, all brush coordinates must be drawn directly to the Interaction Overlay using the native Canvas 2D API. This process must bypass the React state and the charting library's internal rendering loop.

0.16.2 Memory-Efficient Coordinate Tracking
Ref-Based Storage: During an active stroke, coordinates must be stored in a mutable Ref (currentStrokeRef) rather than React state.
Animation Synchronization: The overlay must be updated using requestAnimationFrame. This ensures the brush path follows the cursor at a silky-smooth 60fps, regardless of how many candles or indicators are loaded in the background.

0.16.3 The "Commit-on-Release" Phase 
State Deferral: The main application state and the Rust/Diesel Persistence Layer must only be updated once—at the moment of onMouseUp. 
Tauri IPC Guarantee: Upon releasing the mouse, the final path is extracted and sent via a save_drawing command. The UI must maintain the object in a "Pending" state in the useDrawingRegistry until the Rust backend returns a success confirmation. 
Persistence Target: In accordance with the Hybrid Persistence Model, the brush path must be saved as a relational blob in the SQLite database, indexed by the source_id fingerprint.

0.17 Drawing Glue & Symbol Persistence 
Logic: Drawings are keyed to the Asset/Symbol, not the timeframe or file.
Requirement: The sourceId used for persistence must strip timeframe suffixes. A drawing created on a 1m chart must automatically be rendered when switching to a 5m, 1h, or Daily chart for the same asset.

0.17.2: Drawing-to-Data Linkage.
1.	Trigger: When a user selects a CSV file via the File Explorer, extract the filename or symbol to use as a unique key.
2.	Lookup: Before rendering the chart, the app must check Database/Drawings/[symbol].json.
3.	Injection: If a matching JSON file exists, parse the drawings and inject them into the useDrawingRegistry before the FinancialChart completes its initial mount.
4.	Safety Interlock Ensure the filePath of the CSV is passed to the renderer as readOnlySource. Verify that the save function in useSymbolPersistence.ts is explicitly pointed at the Database directory and not the readOnlySource directory.
5.	Visual Confirmation: If data is successfully loaded from the database, show a brief 'Drawings Loaded' toast or status indicator in the Floating Top Bar."

0.18 Session Memory & Hydration 
Logic: The application must maintain a "Session State" that survives asset changes and reloads.
Requirement: Upon loading a new asset, the system must perform a "Hydration" check to fetch previous drawings and folders from the master store before initializing the chart display.

0.19 Drawing Affordance: Color-Shift 
Logic: All non-locked drawings must respond to mouse-over events to prove interactivity.
Visuals: Use a Color Brightness or Opacity shift only
Prohibition: Do not increase line weight (clunky) and do not use Glow (reserved for selection).

0.20: Context-Aware View Horizon (Hardenened)
·	Condition A (Live Mode): The chart must snap to the most recent candle.
o	Requirement: Set shiftVisibleRangeOnNewBar: true in timeScale options.
·	Condition B (Replay Mode): The chart must maintain its exact coordinate position during a "Cut" operation.
o	Requirement: Set shiftVisibleRangeOnNewBar: false.
o	Logic: Before calling setData() for a cut, the app must capture the current visibleLogicalRange. After the data update, it must immediately restore that range or use scrollToPosition with a fixed rightOffset to prevent the "snap."
o	Operational Rule: The chart must not use scrollToRealTime when in Replay Mode.

0.20.1 (Stability Guard) Execution: Any camera orientation command (e.g., scrollToRealTime) must be wrapped in a Resize Observer or a controlled requestAnimationFrame. 
Condition: The command must only execute once chartContainer.clientWidth > 0. 
Tauri Architecture Sync: Because Rust delivers data across the IPC bridge asynchronously, the frontend must await the completion of the setData() promise. The "snap" prevention logic must be gated by a Ready Signal from the charting library to ensure the view coordinates are calculated against the newly injected Rust data, not the stale previous state.

0.21: Temporal Index Synchronization Logic: The Replay Engine must track history via Unix Timestamps rather than Array Indices. 
Polars Integration: When switching timeframes (e.g., 1H to 15M), the engine must invoke a Rust/Polars query using the source_id. Polars will perform a binary search on the timestamp column of the LazyFrame to find the exact index of the last viewed candle. 
Goal: This ensures that whether the data is in the Asset Library (Lane 1) or Explorer (Lane 2), the user remains at the exact same moment in time across all timeframes without "jumping" or breaking the simulation state.

0.22: Spatial Replay Experience (The "Zero-Jerk" Logic)
This mandate focuses on keeping the user in control of the "camera" and the "timeline" simultaneously.
0.22.1 Spatially Aware Snap (Anti-Zoom & Anti-Snap)
Logic: The handleSnapToRecent function must respect the user's manual positioning.
Refinement: Instead of forcing a snap on every new bar, the engine should check if the new bar is already visible within the current LogicalRange.
Action: * Stay Put: If the new bar is within the current view, do not move the camera.
Preserve Zoom: If the bar moves off-screen, calculate the current "zoom width" (to - from) and shift the view while maintaining that exact width and magnification.
Goal: Eliminates the "Auto-Zoom" effect and stops the chart from jerking to the right edge if the user is busy looking at historical candles.
0.22.2 Non-Linear "Recutting" Capability Logic: The "Scissors" tool must remain active during ongoing replay sessions. 
Action: Upon clicking a historical candle, the system must trigger a recut_replay_stream command. 
Tauri/Polars Execution: The Rust backend uses the Polars LazyFrame to filter the dataset at the specific clicked Unix Timestamp. This new slice is then streamed to the frontend, ensuring the "Recut" is atomic and synchronized across all timeframes.
0.22.3 Atomic State & Drawing Sync
Logic: Synchronization of drawings and coordinate maps must be "Atomic" (happening simultaneously with data changes).
Requirement: When a "Recut" or timeframe shift occurs, the timeToIndex map and the DrawingsPrimitive must update in the same render cycle as the data slice.
Goal: Prevents "Floating Drawings" (where lines appear shifted for a split second) and ensures visual integrity during high-speed replay or jumps.

0.23 Garbage Collection: When a chart tab is closed, chart.remove() and registry.clear(workspaceId) must be called to explicitly free memory

0.24 Safety Toggle (Data Integrity)
·	Principle: The application acts as a Lens, not an Editor.
·	Non-Destructive Processing: Any data cleaning (e.g., removing corrupted ;;;; delimiters or reformatting timestamps) must occur in the application's RAM (volatile memory). The original source file on the user's disk must remain bit-for-bit identical to its state prior to import.
·	Write-Lock: The Electron Main Process must strictly prohibit fs.writeFile or fs.appendFile operations on any file path currently active in a Chart Workspace.
·	Export Exception: Modifications can only be saved via an explicit "Export" command, which must trigger a "Save As" dialog to a new file path, preventing accidental overwrites of the original dataset.

0.25: Production Hardening & Atomic State Persistence
0.25.1 Objective
To eliminate "silent failures" in production builds caused by asynchronous race conditions, file-system permission errors, and path desynchronization between development and compiled environments. This mandate ensures that the "Database Browser" and "Sticky Note" features operate with 100% reliability in a local .exe or .app build.
0.25.2 Architecture: Atomic File Operations
All file writes must transition from Optimistic Writes to Atomic Operations.
·	Directory Guarding: The Main process must verify and recursively create the target directory structure immediately before any write operation. This prevents "EENOENT" errors on fresh installations.
·	IPC Error Serialization: IPC handlers must no longer throw raw errors. They must return a structured result object: { success: boolean, data?: any, error?: string }.
0.25.3 Technical Specifications
A. Absolute Path Resolution (The "Safe-Path" Rule)
·	The Correction: To ensure security sandbox compliance and resolve "Invisible Files," all paths must be resolved via the Tauri path module at runtime.
·	Logic:
o	ASSETS_ROOT = resolve(APP_DATA_DIR, 'Assets')
o	DATABASE_ROOT = resolve(APP_DATA_DIR, 'Database')
·	Requirement: The Rust backend is the only layer permitted to resolve or write to these paths.
B. Database Browser Logic
·	Layout Restoration: Restoring a layout must invoke the apply_layout_configuration command. Upon completion, the frontend must trigger a Query Invalidation (via queryClient.invalidateQueries). This ensures a clean hydration from the new configuration without a hard window.location.reload(), maintaining app uptime.
·	Listing vs. Reading: For Layouts and Sticky Notes, the system must follow Lane 3 (Database) rules:
o	Layouts: The Rust IPC lists the /Database/Layouts/ directory.
o	Sticky Notes: To prevent data loss, notes are read as individual Atomic JSON files, not a single unified file.
C. Text Tool Stability (Chart.tsx)
·	To prevent UI freezing, handleTextSubmit must follow an Optimistic UI Update pattern:
1.	Clear textInputState immediately to release focus.
2.	Update the local React state and useDrawingRegistry optimistically.
3.	Await the Tauri invoke promise for persistence. If the promise rejects, roll back the local change and notify the user.
0.25.4 Verification Protocol 
Concurrency Test: Rapidly create 5 sticky notes. The Rust backend must handle these requests using tokio tasks. 
Atomic Integrity: The backend must ensure each write is atomic (Temp-Write -> Rename). The frontend must verify that each invoke returns a success code before marking the note as "Saved" in the UI.
Layout Swap: Open the Database Browser, select a saved layout, and click Restore. The app must reload and display the selected configuration accurately.

0.26: Production Performance & Thread Decoupling 
I. Persistence & I/O Decoupling (Sticky Notes & Annotations) Throttled Writes: User-input persistence must use a 2-second debounce. 
Hybrid Persistence Rule: > * Sticky Notes: Commited as Atomic JSON files via the Rust backend.
·	Annotations/Drawings: Committed to the Relational SQLite Database. 
·	Optimistic UI: The UI must update the local state immediately. It must never wait for the Tauri IPC bridge to resolve before reflecting changes on screen.
II. High-Frequency Animation (Replay Engine) Loop Purification: The requestAnimationFrame loop is reserved strictly for visual updates. 
Buffered Synchronization: Global state updates (Price labels/Order books) must be decoupled from the animation frame and synced via a secondary 100ms interval to prevent UI stuttering.

0.27:

APP FEATURES
LEFT SIDEBAR

1.1 Cursors & Crosshair System Architecture: Implemented via lightweight-charts CrosshairMode. Syncing (Multi-Chart):
·	Mechanism: When the mouse moves on one chart, coordinates are broadcasted via a Centralized Tauri Service. 
·	*Logic: Other chart instances sharing the same source_id fingerprint receive the update.
·	Hard-Link Constraint: Syncing must only occur if the charts share an identical Metadata Fingerprint. 
1.1.1 The "Persistent Precision" Logic 
We need to decouple the Mouse Cursor Icon from the Crosshair Tracking Lines.
·	The Problem: The library is likely calling container.style.cursor = 'default' whenever crosshairs are toggled off.
·	The Fix: We force a CSS override on the chart container. No matter what state the crosshair logic is in, the container is "hard-coded" to display the crosshair cursor icon.

1.2 Line tools = Trendline, Ray, Horizontal ray, Arrow line, Vertical line, Horizontal line
Drawing Engine (DrawingsPrimitive)
The app uses a custom ISeriesPrimitive implementation (DrawingsPrimitive) attached to the lightweight-charts series. This allows us to render custom Canvas shapes on top of the chart while maintaining high performance (60fps).
Coordinate Conversion: The renderer must anchor points to Unix Timestamps. 
Temporal Sync: During a Replay session or timeframe switch, the system must utilize the Temporal Index Synchronization to look up the correct index for the saved timestamp in the new dataset. 
Goal: This prevents lines from "jumping" or disappearing when the chart recuts its data slice via Polars.

1.3 Geometric Shapes
Tools: Rectangle, Triangle, Rotated Rectangle.
·	Creation Workflow:
o	Step 1: User clicks to set startPoint.
o	Step 2 (Rectangle): User drags to define width/height.
o	Step 3 (Triangle): User clicks a 3rd point to close the shape.
·	Rendering:
o	Fill: Renders ctx.fillStyle with opacity if properties.filled is true.
o	Borders: Renders ctx.strokeRect or ctx.lineTo paths.
·	Interaction: Resizing handles are generated at the vertices (corners). Dragging a handle updates only that specific point in the drawings array.

1.4 Brush (Freehand) Architecture: High-performance overlay rendering. Creation:
·	While dragging, points are pushed to a creatingPoints Ref to bypass React re-render lag. *Optimization: The path is drawn immediately to a separate canvas overlay using requestAnimationFrame. 
·	Commit-on-Release (SoT2 Sync): Upon MouseUp, the path must be converted into a persistent drawing object tagged with the current source_id fingerprint. 
·	Persistence Layer: The object is then sent via a save_drawing command to the Rust backend for insertion into the Relational SQLite Database. The UI updates the main drawings array only after receiving an IPC confirmation to prevent "Ghost Drawings."

1.5 Text & Annotations
Input Method:
·	Clicking the chart spawns a React DOM overlay at screen coordinates $(x,y)$.
·	Tauri Stability: Upon pressing "Apply," the system must immediately clear the textInputState to release focus and update the UI optimistically.
Persistence Execution: The text is saved as a Relational Drawing Object via the Rust backend.
Validation: Every text object must be bound to a unique UUID and the source_id fingerprint. Corrupted or orphaned text objects missing these identifiers must be discarded by the Backend Validation protocol.

1.6 Magnet tool
Architecture: Custom logic function snapToCandle(x, y) inside FinancialChart.
·	Behavior: When enabled (isMagnetMode=true), drawing anchor points automatically snap to the nearest OHLC value of the closest bar.
·	Logic:
1.	Converts screen coordinates $(x,y)$ to logical indices.
2.	Finds the candle at that index.
3.	Calculates Euclidean distance to Open, High, Low, and Close.
4.	If distance < 30 pixels, overrides the mouse coordinate with the exact OHLC price.
·	Usage: Critical for precision in Trendline and Fibonacci tools.

1.7 Continuous drawing mode 
Architecture: Controlled via the isStayInDrawingMode prop.
·	Behavior: Prevents the activeToolId from resetting to 'cursor' after a drawing is completed.
·	Logic: In handleToolComplete, the app checks this flag. If true, the interactionState retains the current tool, allowing rapid creation of multiple objects (e.g., placing 10 vertical lines in sequence).

1.8 Measure Tools
Tools: Measure, Date Range.
·	Logic: Calculates the delta between two points.
o	Price Delta: (Price2 - Price1).
o	Time Delta: Uses timeToIndex to count the exact number of bars between points.
·	Display: Renders a floating label (drawMeasureLabel) containing:
o	Bar count.
o	Time duration (e.g., "4h 30m").
o	Price change % (if applicable).
·	Unified Hover Logic: The crosshair move listener must perform a 'sync-seek'—if the user hovers over the price series, the app must manually find the corresponding index in the volume series to update the floating HUD (Mandate 3.0.4) simultaneously.

1.9 Global Bulk Actions 
Logic: 'Delete All', 'Hide All', and 'Lock All' must be synchronized between the React state and the Rust backend.
Backend Sync: 'Delete All' must explicitly trigger the invoke('delete_all_drawings', { sourceId }) command to ensure database wipes match UI clears.

1.9.1 Lock/ Unlock all drawings
Feature: Lock/Unlock All Drawings. Architecture: Controlled via the areDrawingsLocked boolean prop.
·	Behavior: When true, the interactionState prevents the "Drag" and "Select" states from activating.
·	Logic:
o	Hit Testing: The getHitObject function still detects drawings (to allow hovering), but the handleCanvasMouseDown event explicitly blocks the "Drag" action if areDrawingsLocked is true.
o	Cursor Feedback: The cursor style is forced to 'not-allowed' when hovering over a drawing, giving the user immediate visual feedback that the object cannot be moved.
·	Exception: This is a global override. It supersedes the individual "Lock" property of a single drawing.

1.9.2 Hide/ Show all drawings 
Feature: Hide/Show All Drawings. Architecture: Handled via the visibleDrawings memoization logic.
·	Behavior: Toggles the rendering of the DrawingsPrimitive without deleting data.
·	Logic:
o	Filtering: The visibleDrawings array is filtered based on the visibility toggle state (likely passed down or managed via a parent context/prop like isDrawingSyncEnabled or a visibility prop).
o	Rendering: If hidden, the DrawingsPaneRenderer receives an empty list (or specific flag), causing it to skip the draw() loop entirely.
o	Performance: This is a "Virtual Hide." The drawing objects remain in memory and state, ensuring instant reappearance without re-fetching data.

1.9.3 Hide/ Show Favorites Bar 
Feature: Hide/Show Favorites Bar. Architecture: External UI State (Parent Component).
·	Note: This feature is external to the FinancialChart component itself.
·	Logic: The Favorites Bar is a sibling component (likely in ChartWorkspace.tsx or similar). Its visibility is controlled by a React State boolean (e.g., showFavorites) in the parent layout, which conditionally renders the DOM element. It does not affect the internal logic of the chart canvas.

1.9.4 Nuclear Clear System 
Feature: Clear All Drawings.
Architecture: Event-Driven Surgical Database Purge. 
Behavior: Permanently deletes all drawing objects associated with the active source_id. 
Logic:
1.	Trigger: User clicks "Clear All."
2.	Backend Call: Frontend invokes delete_all_drawings(source_id).
3.	Rust Execution: Diesel performs a DELETE FROM drawings WHERE source_id = ? transaction.
4.	UI Sync: Upon success, the useDrawingRegistry is purged, and the chart is re-initialized. This ensures the "Clear" is permanent and synchronized across all open chart tabs.

TOP BAR HEADER
2.0 Search Asset Library
= See mandate 0.11.2 

2.1 Candle vs. Line Selector (Series Engine) Architecture: Dynamic Series Swapping via Ref-managed Transformers. 
Logic: When switching between 'Line' and 'Candle' modes:
1.	Series Swap: The seriesRef.current is re-assigned via chart.add[Type]Series.
2.	Transformer Utility: The system must run a Rust-side Data Map. For Line charts, Polars filters for { time, close as value }. For Candle charts, it provides the full OHLC.
3.	Drawings Sync: All registered drawings (UUID-based) must be re-attached to the new series instance immediately to ensure the user doesn't lose their technical analysis during the switch.

2.2 Undo/ Redo
Architecture: Implemented within the useDrawingRegistry hook using a State History Stack.
·	Logic: * Stack Management: The registry maintains two internal arrays: past and future.
o	Undo: Pops the last state from past, sets it as the current drawings state, and pushes the previous state to future.
o	Redo: Reverses the Undo process.
·	Trigger: This is usually mapped to keydown listeners (Ctrl/Cmd + Z / Y).
·	Constraint: To prevent memory leaks, the stack is limited to the last 50 actions. Reinit/Clear actions wipe the history stacks.

2.3 Standard Replay / Advanced Replay
2.3.1 Replay Engine Architecture
The application provides two distinct simulation environments. While both utilize historical CSV data, they operate on fundamentally different temporal and functional logic. 

2.3.1.0 Standard Replay (Standard Mode)
·	Purpose: Rapid historical backtesting and pattern review. 
·	Mechanism: Variable-speed playback driven by a speedMultiplier. 
·	Behavior: The user manually "steps" forward one candle at a time or plays back data at accelerated speeds (e.g., 1 candle per 0.1 seconds). 
·	UI Controls: Features full access to speed adjustment buttons and "Step Forward/Backward" controls. 

2.3.1.1 Advanced Replay (Real-Time Simulation Mode)
·	Purpose: High-fidelity psychological trading practice ("Live Practice"). 
·	Temporal Logic (Hard-Locked): The system enforces a strict 1:1 time ratio. A 1-minute candle takes exactly 60 seconds of wall-clock time to form. 
·	UI Constraints: Speed adjustment controls are strictly hidden or disabled to prevent "time-warping" and maintain simulation integrity.
·	Precision Clock: Uses high-resolution system time (performance.now()) to sync the "Market Clock" with the real-world clock.
·	Trading Integration: This mode is strictly tethered to the Trading Panel. The price "ticks" incrementally to update the Open PnL of active mock trades in real-time. 

2.3.1.2 Operational Robustness (Global Standards)
·	The Unix Anchor: Both modes must track history via Unix Timestamps rather than Array Indices. This ensures that switching timeframes (e.g., 1H to 15M) maintains the exact temporal position without "jumping." 
·	Drawing Continuity: Drawings must remain active and editable during replay. They are anchored to their Unix coordinates, ensuring they align perfectly with candles regardless of timeframe shifts or "recuts." 
·	Spatial Integrity: The chart must not use scrollToRealTime while in Replay Mode to prevent the camera from snapping away from the replay playhead. 

2.3.1.3 The "Seamless Replay" Mandate
1.	Global Replay Cursor: The "Current Replay Time" must be stored as a Unix timestamp (UTC) rather than a data index. Indices change between timeframes (e.g., 100 bars on 1H is not the same as 100 bars on 5m), but the timestamp remains constant.
2.	Pre-Switch Snapshot: Before the timeframe changes, the current playback state (Playing/Paused, Speed, and Current Timestamp) must be captured.
3.	Post-Switch Reconciliation: After the new timeframe's data loads, the Replay Tool must scan the new dataset for the nearest matching timestamp and resume playback from that exact moment.

2.3.1.4 The "Slice & Append" Replay Logic
To ensure the Replay Tool functions like professional trading platforms (e.g., TradingView), the engine must distinguish between static historical data and the dynamic replay buffer.

2.3.1.5 Historical Data Preservation
The Cut Point: When a user selects a "Starting Candle" for replay, the system must perform a "Slice" from the beginning of the dataset (index 0) to the selected index.
Initialization: The chart must immediately render this historical slice using the .setData() method. The chart should never appear empty or reset to a single candle upon entering replay mode.

2.3.1.6 Replay Playback & Buffer Management Architecture: 
Rust-Streamed Replay Engine. 
Constraint: Never update the main React state (e.g., setTabs) during active playback. 
Logic: > * Data Drip: The playback engine consumes a Buffered Stream provided by the Rust backend. Rust performs the "Cut" via Polars and sends only the next required batch of ticks to the frontend.
·	State Sync: React state synchronization must only occur on 'Pause' or 'Stop'.
·	Memory Safety: The bufferCursorRef tracks the current position within the Rust-validated timestamp map to ensure that switching timeframes during replay remains frame-accurate 

2.3.1.7 Update Mechanism (.update vs. .setData)
Performance Requirement: To prevent "clankiness" and UI flickering, the engine must use the charting library's .update() method for playback.
Logic: .update() appends a single data point to the existing series, whereas .setData() replaces the entire series. The replay engine must strictly use .update() to maintain the historical context.

2.3.1.8 Visual Continuity
Seamless Transition: The transition from the static historical data to the replayed data must be visually seamless, utilizing requestAnimationFrame to synchronize with the screen's refresh rate.

2.3.1.9 Replay Engine Architecture 
Logic: The Replay Engine must operate independently of the React Render Cycle. Use useRef for the bufferCursor and requestAnimationFrame for the "drip" animation.
Constraint: Never update the main React state (e.g., setTabs or updateTab) during active playback. State sync must only occur on 'Pause' or 'Stop' to maintain 60fps chart performance.

2.3.2.0 The Zero-Latency Timer (Advance Replay) Architecture: Decoupled Price-Axis Overlay. 1. Bypass the Series: We will stop using createPriceLine to avoid internal library overhead during rapid ticks. 
2. The Virtual Axis Label: Instead of a standard React component, we utilize a Ref-based Portal that sits to the left of the Price Axis. 
3. Real-Time Coordinate Mapping: > * Mechanism: The label's position is updated directly via requestAnimationFrame using a style.transform: translateY transition.
·	Sync: It uses the chart's priceToCoordinate method.
·	Performance Guard: This movement is decoupled from the React render cycle, ensuring that the timer follows the price tick with zero-latency without triggering a full component re-render.

2.3.2.1 Replay State Deferral 
Logic: The 'Pause' functionality must preserve the current bufferCursorRef position.
Constraint: Do not reset the index to startIndex on pause. The playhead must remain stationary at the last rendered candle until 'Play' is resumed or 'Stop' is triggered.

2.3.2.2 Calibration Mandate - Precision Timer 
1. The Math Fix (True Backend Sync): The countdown must be derived from the Rust Backend's Wall Clock.
·	Formula: Remaining = Next_Bar_Close_Timestamp - Current_Rust_System_Time.
·	Sync: The backend emits a timer-sync event every 1 second to recalibrate the frontend UI, ensuring the purple countdown box exactly matches the moment the Polars engine closes the candle. 
2. The UI Fix: Shift the purple box to a fixed offset to the left of the price scale to ensure zero overlap with the price label.

2.4 Select Favorite Timeframes (Quick Access)
Architecture: External UI state synchronized with the interval prop and the Rust/SQLite Metadata Cache.
Logic:
·	Persistence: The Top Bar renders a filtered list of intervals derived from a favorites table stored in the Relational SQLite Database.
·	Dynamic Sync: Upon application launch, the Rust backend pushes the user’s favorite configurations to the UI via a get_user_settings command, bypassing volatile localStorage.
Interaction: *Clicking a favorite timeframe updates the interval prop passed to Chart.tsx.
Temporal Synchronization (Replay Mode): *Anchor Logic: Timeframe switching MUST use Unix Timestamps as the anchor, not bar indices.
·	Execution: Changing the timeframe triggers a Polars-backed query in the Rust backend. The backend identifies the exact candle index in the new timeframe that matches the current Unix timestamp, ensuring the user remains at the same point in history across all resolutions.
Timeframe Granularity & Normalization: * Logic: The system must strictly distinguish between 1mn (1 minute) and 1mo (1 month). 
*Rust-Side Requirement: All timeframe parsing must be handled by the Rust Backend using the standardized TF_PATTERNS regex. The frontend must never assume 'm' stands for minutes if 'mo' or 'mn' is present. This ensures that "Lane 2" (Explorer) files are correctly mapped to the simulation engine.

2.5 Themes/ Skins
Theme Synchronization (Durable Settings)
·	Architecture: Implemented via a global theme state persisted in the Relational SQLite Database.
·	Logic: When the theme toggles, the Rust backend updates the settings table. The frontend updates the hex-code constants passed to chart.applyOptions().
Elements: Synchronizes background colors, text colors for scales, and gridline contrast.

RIGHT SIDEBAR
3.0 Tools; Indicators = SMA, Volume

3.1 Sticky Notes (Heads-Up Display)
Architecture: Floating UI Layer managed via a System Overlay strategy.
Logic: Sticky Notes are persistent, draggable <div> containers sitting on the Highest UI Layer (z-index 10000+).
Persistence : 
* Data Structure: Each note is a unique object containing { id, content, inkData, position, size, noteColor }. 
* Storage: Notes are stored as Atomic JSON files within Database/StickyNotes/note_[uuid].json. This ensures that the failure of one note does not corrupt the entire database.
Capabilities: * Text Mode: A standard <textarea> for rapid, non-blocking typing. 
* Ink Mode: A transparent <canvas> overlay for free-hand annotations. 
* Size Constraints: Must enforce a Min: 100x100px and Max: 400x400px to maintain chart visibility.

3.1.1 Sticky Note UI/UX Refinement
The Sticky Note must evolve into a "Windowed Utility" with a dedicated Header Bar for management.
·	The Header Bar: A thin strip at the top of the note (the "drag handle") containing:
o	Left Side: A Title Field. This is a small, inline-editable text area that defaults to "New Note."
o	Right Side (Action Group):
§	Minimize (Minus Icon): Collapses the note into a "Tab" or "Bar" that stays at the same coordinates but hides the content.
§	Save (Diskette/Check Icon): Manually triggers a high-priority write to the database (though auto-save should still persist in the background).
§	Close (x) icon – for closing sticky note

3.1.2 The Modular Sticky Note (Color & Docking)
The note needs a "System Tray" or "Settings Menu" within its own header to manage its appearance and behavior.
·	Color Customization:
o	Provide a palette of 5-6 "Post-it" style colors (Yellow, Blue, Green, Pink, Grey, Dark Mode).
o	Changing the color must update both the Background and the Header for visual consistency.
o	The selected color must be saved as noteColor in sticky_notes.json.
·	The "Undock" Mechanism:
o	By default, notes exist within the "Chart Work area" layer.
o	"Undocking" (or "Pinning") ensures the note stays visible even if the user switches symbols or layouts.
o	Z-Index Management: Undocked notes must stay on the highest layer (above all sidebars and panels).

3.1.3 Metadata Access & The "Logical Firewall"
Metadata Access Pattern
The Safe-Path Rule: Access to Database/StickyNotes and Database/Layouts MUST strictly bypass general file-explorer logic.
Tauri IPC Execution:
·	Managers must use dedicated Tauri Invoke commands (save_sticky_note and load_sticky_notes) that point directly to the resolved METADATA_ROOT. 
* Collision Avoidance: These files are stored in a physical branch separate from the /Assets folder.
The "Logical Firewall": * Isolation: The Sticky Note database is EXEMPT from the dual-stream data logic. It must NEVER be scanned by the LocalDataExplorer. 
* Search Exclusion: File-browsing logic for Market Data must explicitly ignore the Database/ directory to prevent system metadata from appearing as "Chartable Data".
UI Decoupling: * The "Open Sticky Note" action is a System Event and does not share state with sidebar panels or mode toggles. 
* Visual Layer: Management exists as a System Overlay, ensuring it remains functional regardless of the active chart asset.

3.2 Local Data Explorer
= See mandate 0.11.3 

3.3 Layout & Multi-Chart Engine (= Full Chart, Split 2x, Split 4x; Storage = Save Layout to DB, Export Layout (.json), Import Layout (.json); Save Chart Data as Csv, Load Csv into Tab, New chart Tab)
This system governs how multiple chart instances coexist, synchronize data, and manage their individual or collective states.

3.3.1 Viewport Partitioning
·	Architecture: Managed via a responsive CSS Grid wrapper in the ChartWorkspace. 
·	Logic: Layout is determined by a layoutType state (e.g., 'single', 'quad'). 
·	Performance: Each chart instance maintains its own chartRef and seriesRef. To prevent memory leaks, the app must call chart.remove() during cleanup. Tauri Requirement: The cleanup phase must also signal the Rust backend to drop the specific data_buffer associated with the closed chart_id. 

3.3.2 Layout Synchronization (The "Entanglement" Philosophy)
·	Mechanism: A single "Master Sync" toggle in the Top Bar. 
·	Logic: When ON, Chart B is entangled with Chart A. 
·	State Propagation: Instead of a simple frontend provider, synchronization is anchored to the source_id Fingerprint. Any change to Symbol, Timeframe, or Scroll position triggers a Tauri Broadcast that all charts with "Master Sync" enabled must consume. 

3.3.3 Storage & Portability (SQLite & CSV)
·	Save Layout: Periodically serializes layout states into the Relational SQLite Database. We explicitly ABANDON the use of standalone .json files for internal layout storage to ensure relational integrity between drawings and chart states.
·	Export/Import:
o	Export: Generates a standardized schema file containing the useDrawingRegistry state. 
o	Import: Reads the file, validates the schema via Rust, and updates the SQLite drawings table. 
·	Save Chart Data as CSV: Iterates through the active fullData array, converting OHLCV objects to a standardized string format. The Rust backend automatically strips corrupted delimiters (e.g., ;;;;) during export. 

3.3.4 The Independent Layout Manager
·	Physical Isolation: Layout metadata is stored in $APP_DATA/Database/Layouts/. 
·	Logical Firewall: This directory is strictly OFF-LIMITS to the LocalDataExplorer. It must never appear in market data browsers. 
·	Trigger Mechanism: The "Open Layout Manager" button dispatches a TOGGLE_LAYOUT_MANAGER event. 
·	Execution: Restoring a layout must use TanStack Query Invalidation to refresh the useChartState hook. Hard window.location.reload() calls are FORBIDDEN to preserve the Rust IPC bridge.
3.3.5 Tab Management
Architecture: Dynamic rendering of Chart tab instances within a tabbed interface.
·	New Chart Tab: Spawns a new independent Chart tab with its own unique Chart tab Id.
·	Load CSV into Tab: Allows a user to select a local file (like your cleaned BTCUSDT_15m_final.csv) and inject it directly into a specific tab's fullData state, bypassing the standard API fetch.

3.4 Object Tree (Registry Explorer)
·	Architecture: A React sidebar providing two-way sync with the Rust/SQLite Drawing Registry. 
·	State Mapping: Iterates through the drawings table (filtered by active source_id) to display active objects. 
·	Visibility & Lock Sync: Clicking 'eye' or 'padlock' icons triggers a update_drawing_metadata Rust command, ensuring the change is persisted in SQLite immediately. 
·	Z-Order Management: Users drag items to reorder the array. The DrawingsPrimitive uses this order to determine canvas layering during the render loop. 
·	Grouping: Supports logical folders for collective visibility/locking of related technical tools (e.g., "Trade Setup A"). 
·	Goal: Centralized management that prevents clutter and ensures precise control over complex multi-object setups while maintaining 60fps performance. 

3.5 Trade Panel (Execution Interface)
Architecture: A separate React DOM overlay that communicates with the Rust Backend via the execute_trade command. 
Logic: Provides a GUI for manual trade execution, including market and limit orders. 
Visual Feedback: When an order is placed, a dedicated PriceLine is rendered on the chart at the entry price. 
Persistence: All executions must be committed to the Relational SQLite Database. 
Undo/Redo Constraint: Positions and orders are excluded from the useDrawingRegistry history stack to prevent accidental deletion via Ctrl+Z.

3.6 Toggle Gridlines = Toggle to hide or show gridlines
Gridline Toggle (Canvas Aesthetics)
Architecture: Direct modification of chart.applyOptions().
·	Logic: Controlled via a showGrid boolean.
·	Implementation: * VertGrid: Controlled by vertLines: { visible: showGrid }.
o	HorzGrid: Controlled by horzLines: { visible: showGrid }.
·	Performance: Because this uses applyOptions, the chart updates the background canvas layer without needing to re-process the price data or drawing coordinates. It is a "Zero-Cost" visual update.
·	Timeframe switching MUST use Unix Timestamps as the anchor, not bar indices, to ensure the user remains at the exact same point in history across all resolutions

3.7 Application Re-Initialization (Re-load)
Architecture: A high-level trigger that resets the application state without breaking the system bridge. 
Logic: A dedicated "Emergency Reset" button. 
Action:
·	Avoid Hard Reloads: The system must NOT use window.location.reload() as it destroys the Rust IPC context.
·	Controlled Re-init: The app triggers a Global Query Invalidation. This clears the cached market data and re-triggers a fresh fetch from the Rust/Polars data stream for the current symbol and interval. 
·	Goal: Provides a "fail-safe" to return the UI to a stable state while maintaining the integrity of the underlying Rust process.

3.8 Global Settings Engine
The Settings engine manages the aesthetic and functional properties of the chart canvas through the chart.applyOptions() method.

3.8.1 Crosshair & Cursor Persistence
·	Architecture: Managed via the crosshair options in the charting library.
·	Requirement: The Crosshair toggle is a "Hard-Wire" feature. It must be implemented via a useEffect that calls chart.applyOptions() directly. A React prop change alone is insufficient to override the engine's internal crosshair state.

3.8.2 Candle & Background Aesthetics
·	Logic: Modifies CandlestickSeries options directly for Up/Down, Wick, and Border colors.
·	Syncing: Changes are applied via series.applyOptions(), triggering an immediate re-render of the price action layer without a data reload.
·	Customization: Controls background types (Solid/Gradient), grid styles (Dashed/Dotted), and pane margins to ensure price action remains centered.

3.8.3 Chart Settings & Utilities 
o	Price Scale Settings: This icon specifically spawns the Price Scale Configuration menu to adjust how price data is projected on the Y-axis.

3.8.3.1 Price Scale Engine
The Price Scale Engine governs the mathematical projection of price data onto the vertical axis. It is critical for accurately visualizing volatility and long-term trends.
3.8.3.2 Projection Modes:
o	Linear Scale: Uniform distance between absolute price points.
o	Logarithmic Scale: Based on percentage changes to prevent vertical "price compression" for high-volatility assets like BTC.
o	Percentage Scale: Transforms the Y-axis into values relative to the first visible bar (0%).
3.8.3.3 Scaling Behavior:
o	Auto Scale: Fits the Y-axis to the visible high/low range.
o	Manual Override: Dragging the scale automatically disables "Auto Scale"

CHART AREA
4.0 Persistent Drawing Settings Bar (The Toolbar)
·	Architecture: A stable workstation tool sitting on the Highest UI Layer.
·	Logic: The Drawing Settings Bar (containing color pickers, line thickness, and delete buttons) must remain at a fixed coordinate on the chart overlay.
·	Sticky Positioning:
o	Initial State: Defaults to the Top-Center of the chart on first launch.
o	User Preference: If dragged, the app captures $(x,y)$ coordinates.
·	Persistence: Coordinates must be saved to the Relational SQLite Database via the save_ui_settings Rust command. All paths are resolved via the Tauri path API to the application root.
·	Visibility Trigger:
o	The bar appears only when a drawing is selected.
o	Upon selection changes, the bar maintains its Sticky Position and updates internal settings via the useDrawingRegistry without moving.

FLOATING BOTTOM PANEL
5.0 Market Overview Panel
·	Architecture: A data-grid component consuming a separate Rust-managed feed.
·	Data Sync: Focuses on real-time "Tick" data (Last Price, 24h Change%) to provide "Peripheral Vision".
·	Interaction: Clicking a symbol triggers the onSymbolChange event, updated via the Tauri IPC Bridge.

5.1 Order History Panel (Execution Ledger)
·	Architecture: A state-driven table synchronized with the SQLite Trades Table.
·	Visual Correlation: Selecting an order triggers a Temporal Sync. The engine uses a Polars LazyFrame search to locate the exact Unix Timestamp of the execution and scrolls the chart to that coordinate.
·	Constraint: Trade executions are protected records. The useDrawingRegistry must filter and exclude objects with type: 'TRADE_EXECUTION' from the undo/redo history stacks to prevent ledger deletion.

5.2 Panel Management (Docking & Visibility)
·	Architecture: Implemented as an "Accordion" component.
·	Persistence: The open/closed state is saved to the Relational SQLite Database.
·	Bottom Panel Resizability:
o	Logic: Uses a horizontal drag-handle with an invisible "overlay mask" to prevent cursor-sticking.
o	Thread Safety: Resizing must trigger the chart's resize() method using a Resize Observer debounced to protect the main thread.

5.3 The Inversion Engine:
·	Core Logic: Toggles invertScale in priceScale options.
·	Coordinate Synchronization: All custom overlays (Sticky Notes, Drawings) must stay bound to their Unix Price Values, not screen positions.
·	Visual State: Labels remain legible, but the numerical order is reversed
