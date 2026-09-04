---
title: Privacy Policy
---

# ReadVeil privacy policy

**Last updated:** 3 September 2026

ReadVeil is a Chrome extension that shows selected webpage text one segment at a time in a full-page overlay. This policy explains what information the extension handles, how that information is used, and what it never does.

ReadVeil is developed by Tommy Truong. Questions: [dev.ttruong@gmail.com](mailto:dev.ttruong@gmail.com).

## Summary

- Selected text is processed **on your device** so the overlay can show reading segments.
- Appearance and reading preferences are saved **on your device** with Chrome’s local storage.
- ReadVeil does **not** send your reading text, browsing history, or settings to a server.
- ReadVeil does **not** use analytics, advertising, accounts, cookies, or third-party trackers.
- Uninstalling the extension removes its local settings.

## Information the extension handles

### Selected text

When you start a session — by clicking the toolbar icon or choosing **Read with ReadVeil** on a selection — the extension reads the text you highlighted on the current page. Chrome may also pass the selected text from the context menu as a fallback if the live page selection is not available.

That text stays in memory for the session so ReadVeil can split it into segments and rebuild those segments if you change display settings. It is not written to disk, not synced, and not sent over the network. Closing the overlay discards it.

ReadVeil does not read the rest of the page, form fields you did not select, passwords, or browsing history.

### Settings

The extension saves reader preferences in `chrome.storage.local` in your browser profile:

- font, size, and weight
- theme and custom colors
- chunk mode and words-on-screen count

These preferences exist only so the overlay looks the same the next time you use it. They are not synced to a developer-operated server. Chrome may sync this storage across your signed-in Chrome profiles if you have extension sync enabled; that is a Chrome feature, not a ReadVeil server.

### What is not collected

ReadVeil does not collect names, email addresses, account credentials, payment information, location, contacts, health data, or identifiers. It does not log which sites you visit. It does not use cookies.

## How information is used

Selected text is used only to display reading segments in the overlay. Settings are used only to restore your reader appearance and segment preferences.

ReadVeil does not use this information for advertising, analytics, profiling, or any purpose other than providing the reading overlay.

## Sharing

ReadVeil does not sell, rent, or share user data with third parties. There is no developer backend, no analytics SDK, and no advertising network.

The extension does not make network requests.

## Permissions

The extension requests:

- **activeTab** — access the current tab after you click the toolbar icon or the context menu item
- **scripting** — inject the overlay into that tab
- **contextMenus** — add **Read with ReadVeil** when text is selected
- **storage** — save settings locally

The overlay is injected only after you invoke the extension. It is not injected on every page load.

## Retention and deletion

Selected text is discarded when you close the overlay or end the session.

Settings remain in `chrome.storage.local` until you change them, clear site/extension data in Chrome, or uninstall ReadVeil. Uninstalling the extension removes its stored settings.

## Limited use

ReadVeil complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements. User data (selected text and local settings) is used only to provide and improve the extension’s core reading functionality. It is not used to determine creditworthiness, not sold, and not transferred to third parties.

## Children’s privacy

ReadVeil does not target children and does not knowingly collect personal information from anyone.

## Changes

If this policy changes, the date at the top of this page will be updated. The current version will always be available at this URL.

## Contact

Questions about this policy: [dev.ttruong@gmail.com](mailto:dev.ttruong@gmail.com).
