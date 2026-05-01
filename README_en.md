# Forge Neo Generation Notifier

A simple generation-complete notification extension for Forge Neo / Stable Diffusion WebUI.

This extension does not rely on Forge Neo's built-in "Request Browser Notification" feature.
Instead, it independently monitors the generation state and sends a browser notification when generation finishes.

---

## Features

- Displays a notification panel in the bottom-right corner
- Independent notification permission and test button
- Sound ON / OFF toggle
- Shows a browser notification when generation is complete
- Plays a notification sound when sound is enabled
- Displays generation time in the notification
- Shows elapsed generation time in the panel while running
- Detects generation state from progress bars and stop buttons

---

## Installation

1. Place this folder inside the Forge Neo `extensions` folder
2. Restart Forge Neo
3. Open Forge Neo in your browser
4. Click **Enable notifications** in the bottom-right corner
5. If the test notification appears, setup is complete

---

## Behavior

The script sends a notification only on the following state transition:

Generating → Idle

---

## Notification Requirements

Browser notifications require a secure context.

Recommended URL:

```text
http://localhost:7860
```

---

## Notes for LAN Access

When accessing Forge Neo through a LAN IP address, browser notifications may be blocked.

For Brave or Chromium-based browsers, you can allow the LAN URL as a secure origin via the browser shortcut properties.

Example for Brave:

```text
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"
```

Replace `192.168.1.1:7860` with your actual Forge Neo LAN address.

---

## Button States

- **Enable notifications**: Notifications have not been allowed yet
- **Test notification**: Notifications are allowed
- **Sound: ON / OFF**: Toggle notification sound
- **Allow in browser settings**: Notifications are blocked by the browser
- **HTTPS/localhost required**: The current connection is not secure
- **Not supported**: The browser does not support notifications

---

## Troubleshooting

### Notifications do not appear

- Make sure you are accessing Forge Neo through `localhost`
- Check browser notification permissions
- Check OS notification settings
- If using a LAN IP address, allow it as a secure origin in your browser

### Sound does not play

- Make sure **Sound: ON** is selected
- Some browsers may block audio until the page has received user interaction
- Try clicking the test notification button once after loading Forge Neo

---

## Version

v1.1.0

---

## License

MIT
