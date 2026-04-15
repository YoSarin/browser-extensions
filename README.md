# Browser Extensions

A collection of browser extensions, primarily targeting Microsoft Edge.

## Extensions

### [ms-qol-improvements](./ms-qol-improvements/)

Quality-of-life improvements for Microsoft web apps:

- **Azure Portal** – replaces the generic favicon with the SVG icon of the currently active blade
- **Azure DevOps** – sets context-aware favicons for pipelines (with build status badges), git repos, settings, work items, and more; adds a clickable link from the pipeline YAML header to its source file in the repo
- **Azure Data Explorer** – updates the page title on dashboards to include the active page name (e.g. `Page → Dashboard Name`)

### [ms-tab-lock](./ms-tab-lock/)

Lock a tab so that closing it (Ctrl+W, middle-click, close button, etc.) immediately re-opens the same URL **in the same position** — same index, window, pinned state, and tab group.

- Click the extension icon or press **Alt+L** to toggle the lock
- A red **L** badge indicates a locked tab
- Closing a locked tab re-creates it at the exact same position and re-locks it automatically
- Closing an entire window does **not** trigger re-open (session-scoped lock)

#### Installation (Edge)

**From the Edge Add-ons Store** (recommended):

- [MS QoL Improvements](#) <!-- TODO: replace with store link after publishing -->
- [Tab Lock](#) <!-- TODO: replace with store link after publishing -->

**Manual (developer mode):**

1. Open `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the extension directory (e.g. `ms-qol-improvements` or `ms-tab-lock`)

## Privacy

See [PRIVACY.md](./PRIVACY.md). These extensions do not collect or transmit any data.

## License

[MIT](./LICENSE)
