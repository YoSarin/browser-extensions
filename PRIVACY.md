# Privacy Policy

**Effective date:** April 15, 2026

This privacy policy applies to the following browser extensions:

- **MS Favicon Changer**
- **Tab Lock**

## Data Collection

These extensions **do not collect, store, transmit, or share any personal data or browsing information**. They operate entirely within your browser.

### MS Favicon Changer

This extension modifies favicons on Azure Portal and Azure DevOps pages to provide better visual context. It only reads DOM elements on matching Microsoft pages (`portal.azure.com`, `dev.azure.com`, `*.visualstudio.com`) to extract icon information. No data leaves your browser.

### Tab Lock

This extension allows you to lock browser tabs so they re-open automatically if closed. It stores locked-tab metadata (URL, tab position, pinned state) using the browser's built-in `chrome.storage.session` API, which is local to your browser session and cleared when the browser closes. No data is sent to any external server.

## Permissions Justification

- **tabs / tabGroups** (Tab Lock): Required to monitor tab state and re-create closed locked tabs in the correct position.
- **storage** (Tab Lock): Required to persist lock state across service worker restarts within a browser session.
- **scripting** (Tab Lock): Required to inject a visual lock indicator (🔒 badge) on the favicon of locked tabs.
- **host_permissions** (Tab Lock): Required so the scripting API can inject the favicon badge on any page the user chooses to lock.

## Third-Party Services

These extensions do not use any third-party analytics, tracking, or advertising services.

## Changes to This Policy

Any changes to this privacy policy will be posted in this repository.

## Contact

If you have questions about this privacy policy, please open an issue in this repository.
