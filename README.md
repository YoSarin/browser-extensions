# Browser Extensions

A collection of browser extensions, primarily targeting Microsoft Edge.

## Extensions

### [ms-favicon](./ms-favicon/)

Changes favicons on Microsoft pages to better reflect the current page context:

- **Azure Portal** – replaces the generic favicon with the SVG icon of the currently active blade
- **Azure DevOps** – sets context-aware favicons for pipelines (with build status badges), git repos, settings, work items, and more

### [ms-tab-lock](./ms-tab-lock/)

Lock a tab so that closing it (Ctrl+W, middle-click, close button, etc.) immediately re-opens the same URL **in the same position** — same index, window, pinned state, and tab group.

- Click the extension icon or press **Alt+L** to toggle the lock
- A red **L** badge indicates a locked tab
- Closing a locked tab re-creates it at the exact same position and re-locks it automatically
- Closing an entire window does **not** trigger re-open (session-scoped lock)

#### Installation (Edge)

1. Open `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the extension directory (e.g. `ms-favicon` or `ms-tab-lock`)
