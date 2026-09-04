---
title: Privacy Policy
---

# Focus Reader privacy policy

**Last updated:** 3 September 2026

Focus Reader is a Chrome extension that shows selected webpage text one segment at a time in a full-page overlay. This policy describes what data the extension handles and what it does not do.

## Summary

- Selected text is processed **on your device** so the overlay can show reading segments.
- Appearance and chunking preferences are saved **on your device** with Chrome’s local storage.
- Focus Reader does **not** send your reading text, browsing history, or settings to a server.
- Focus Reader does **not** use analytics, advertising, accounts, or third-party trackers.

## Data the extension handles

### Selected text

When you start a session (toolbar icon or **Read with Focus Reader** on a selection), the extension reads the text you highlighted on the current page. That text stays in memory for the session so Focus Reader can split it into segments and rebuild chunks if you change display settings. It is not written to disk, not synced, and not sent over the network. Closing the overlay discards it.

### Settings

The extension saves reader preferences in `chrome.storage.local` on your computer: font, size, weight, theme, custom colors, chunk mode, and words-on-screen count. Chrome keeps this data in the browser profile. Focus Reader does not sync it to a developer-operated server.

### What is not collected

Focus Reader does not collect names, email addresses, account credentials, payment information, location, browsing history, cookies, or the full contents of pages you visit. It only reads the selection you choose to send into the overlay.

## How data is used

Selected text is used only to display reading segments in the overlay. Settings are used only to restore your reader appearance and chunking preferences the next time you open the overlay.

## Sharing

Focus Reader does not sell, rent, or share user data with third parties. There is no developer backend and no analytics SDK.

## Permissions

The extension requests:

- **activeTab** — access the current tab after you click the toolbar icon or the context menu item
- **scripting** — inject the overlay into that tab
- **contextMenus** — add **Read with Focus Reader** when text is selected
- **storage** — save settings locally

The overlay is injected only after you invoke the extension. It is not injected on every page load.

## Limited use

Focus Reader complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. User data (selected text and local settings) is used only to provide the extension’s core reading functionality. It is not used for advertising, not sold, and not transferred to third parties.

## Children’s privacy

Focus Reader does not target children and does not knowingly collect personal information from anyone.

## Changes

If this policy changes, the date at the top of this page will be updated. The current version will always be available at this URL.

## Contact

Questions about this policy: reach out to dev.ttruong@gmail.com
