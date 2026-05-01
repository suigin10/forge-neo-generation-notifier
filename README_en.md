# Forge Neo Finish Notifier

A simple generation-complete notification extension for Forge Neo / Stable Diffusion WebUI.

This extension does not rely on Forge Neo's built-in "Request Browser Notification" feature.
Instead, it independently monitors generation status and sends notifications.

---

## Features

- Displays a notification panel in the bottom-right corner
- Independent permission and test notification buttons
- Shows browser notifications when generation is complete
- Plays a notification sound
- Detects generation state via progress bar and stop button
- Prevents false notifications on initial page load

---

## Installation

1. Place this folder inside the Forge Neo `extensions` directory
2. Restart Forge Neo
3. Open Forge Neo in your browser
4. Click "Enable notifications" in the bottom-right corner
5. If a test notification appears, setup is complete

---

## Behavior

The script only notifies on the following state transition:

Generating → Idle

---

## Requirements for Notifications

Browser notifications require a secure context.

Recommended URL:
http://localhost:7860

---

## Notes for LAN Access (Brave, etc.)

When accessing via a LAN IP, notifications may be blocked.

Allow the connection via your browser shortcut properties.

Example for Brave:
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"

---

## Button States

- Enable notifications: Notifications not yet permitted
- Test notification: Notifications permitted
- Allow in browser settings: Notifications blocked
- HTTPS/localhost required: Not a secure context
- Not supported: Browser not supported

---

## Troubleshooting

### Notifications not appearing

- Make sure you're accessing via localhost
- Check browser notification permissions
- Check OS notification settings

---

## Version

v1.0.1

---

## License

MIT
