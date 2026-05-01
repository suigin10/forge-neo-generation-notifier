# Forge Neo Finish Notifier

A simple browser notification extension for Forge Neo / Stable Diffusion WebUI-based interfaces.

This extension adds its own notification panel and does not depend on Forge Neo's built-in **Request Browser Notification** button.

## Features

* Shows a small **Finish Notifier** panel in the bottom-right corner
* Provides an independent browser notification permission/test button
* Sends a browser notification when image generation finishes
* Plays a short notification sound when generation finishes
* Detects generation state by monitoring visible progress indicators and active stop/interrupt buttons
* Prevents false completion notifications on initial page load

## Installation

1. Copy this extension folder into Forge Neo's `extensions` folder.
2. Restart Forge Neo.
3. Open Forge Neo in your browser.
4. Click the **Enable notifications** button in the bottom-right panel.
5. If the test notification appears, setup is complete.

## How it works

The script checks the page state periodically.

On the first check, it only records the current state. This prevents a false **Generation complete** notification when the page is opened or refreshed.

After that, it sends a notification only when the state changes from:

```text
generating -> not generating
```

## Browser notification requirements

Browser notifications require a secure context.

Recommended access URL:

```text
http://localhost:7860
```

If you access Forge Neo from another device or via a LAN IP address, browsers such as Brave may block notifications because the page is treated as insecure.

Example Brave launch option:

```text
"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"
```

Replace `192.168.1.101:7860` with your own Forge Neo LAN address.

## Button labels

Depending on the browser notification state, the panel button may show:

* **Enable notifications**: notification permission has not been requested yet
* **Test notification**: notifications are already allowed
* **Allow in browser settings**: notifications are blocked
* **HTTPS/localhost required**: the page is not running in a secure context
* **Not supported**: the browser does not support the Notification API

## Troubleshooting

### No notification appears

Check the following:

* Open Forge Neo via `http://localhost:7860`
* Confirm that browser notifications are allowed for the site
* If using a LAN IP address, make sure the browser is launched with the secure-origin option
* Check whether your OS notification settings are blocking browser notifications

### A notification appears on first page load

This version is designed to prevent that behavior.

If it still happens, check that the latest `javascript/finish\_notifier.js` has been installed and that the browser is not using a cached old script.

### The button does nothing

Open the browser console and check for JavaScript errors.

In Brave/Chrome/Edge:

```text
F12 -> Console
```

## Files

```text
forge-neo-finish-notifier/
├─ javascript/
│  └─ finish\_notifier.js
└─ README.md
```

## Version

v1.0.1

## License

MIT

