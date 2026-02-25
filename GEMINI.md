# Red Pill Charting

A high-performance financial charting application built with Tauri, React, and Lightweight Charts.

## Project Overview
- **Purpose:** Professional-grade financial charting and analysis tool.
- **Frontend:** React 18, TypeScript, Vite 6.
- **Desktop Wrapper:** Tauri 2 (Rust).
- **Charting Library:** TradingView Lightweight Charts 5.
- **Styling:** Tailwind CSS (configured in `index.html`) with a custom "Midnight River" dark theme.
- **Data Management:** React Context for global UI state; TanStack React Query for data synchronization.
- **Key Features:**
  - Interactive drawing tools (Trendlines, Horizontal/Vertical lines, Rays, Brush, Shapes).
  - Market Replay system with speed control and "Cut" functionality.
  - Magnet mode for precise drawing alignment to OHLC data.
  - Multi-symbol and multi-interval support.
  - Local data persistence via Tauri services.

## Architecture
- `components/`: UI components organized by functional area (Chart, Layout, Overlays, Panels, Sidebar).
- `context/`: Global state providers (`ChartContext`, `MarketContext`).
- `hooks/`: Reusable React hooks for drawing logic, persistence, and online status.
- `services/`: Integration layer with the Tauri/Rust backend (`tauriService.ts`).
- `src-tauri/`: Rust backend logic and Tauri configuration.
- `utils/`: Common utilities for telemetry, binary parsing, and math.

## Technical Mandates (Inferred from Codebase)
The project adheres to specific architectural and functional mandates:
- **0.6.1:** `Ctrl + D` toggles Developer Tools.
- **1.4 / 0.17:** Drawing persistence and shadow registry logic.
- **1.6:** Absolute interaction lock and overlay architecture for drawing phases.
- **0.22.1:** Replay system ensures time-scale range shifting is managed during playback.
- **0.5.1:** Attribution for the charting library is hidden in the UI.
- **1.9.4:** **Race Condition Prevention (Bulk Delete):** To avoid IPC race conditions, "Clear All" operations must utilize atomic bulk delete commands (`plugin:db|clear_drawings`) rather than iterating through individual IDs. State must be cleared optimistically and reverted only on verified backend failure.
- **1.1.2:** **Sidebar Accessibility & Portal Visibility:** The left sidebar must implement vertical scrolling to maintain access to all tools. Sub-menus (Pop-ups) and tooltips must be rendered via **React Portals** to prevent clipping by sidebar `overflow` boundaries.
- **1.4.1:** **Individual Drawing Selection:** Selection state must be surgically managed to ensure the "Drawing Toolbar" and "Object Tree" remain synchronized without triggering full chart re-renders.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- Rust (for Tauri/Desktop builds)

### Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server (Web only):
   ```bash
   npm run dev
   ```
3. Run the Tauri desktop application in development mode:
   ```bash
   npm run tauri dev
   ```

### Production Build
1. Build the frontend and desktop application:
   ```bash
   npm run tauri build
   ```

## Development Conventions
- **Type Safety:** Strict TypeScript usage for all frontend logic.
- **State Isolation:** UI state in Context; Data/IO in React Query or Services.
- **Performance:** Use `useRef` for high-frequency updates (e.g., 60fps drawing/replay) to avoid unnecessary React re-renders.
- **Styling:** Use the custom Tailwind theme variables defined in `index.html`.
- **Telemetry:** Use `Telemetry` utility for logging and performance monitoring.

Detailed project logic and 'Red Pill' philosophy are defined in /docs/SOURCE_OF_TRUTH.md.

