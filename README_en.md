# Forge Neo Generation Notifier

A simple extension for Forge Neo / Stable Diffusion WebUI that notifies you when image generation is complete.

This extension does not rely on Forge Neo's built-in "Request Browser Notification" feature.  
Instead, it independently monitors the generation state and sends notifications.

---

## Features

- Displays a notification panel in the bottom-right corner of the screen
- Notification permission and test button
- Notification sound ON / OFF toggle
- Shows a browser notification when generation is complete
- Plays a notification sound when enabled
- Displays the generation time in the notification
- Shows elapsed generation time in the panel while running
- Detects generation state from the progress bar and stop/control buttons

---

## Installation

1. Place this folder in Forge Neo's `extensions` folder.
2. Restart Forge Neo.
3. Open Forge Neo in your browser.
4. Click `Enable notifications` in the bottom-right panel.
5. If a test notification appears, setup is complete.

---

## How It Works

The extension sends a notification when it detects the following state change:

Generating → Not generating

---

## Notification Requirements

Browser notifications require a secure context.

Recommended URL:

http://localhost:7860

---

## Notes for LAN Access

Notifications may be blocked when accessing Forge Neo via a LAN IP address.

In browsers such as Brave, you can allow the LAN URL as a secure origin by adding a launch option to the browser shortcut.

Example for Brave:

```text
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"
```

Change the IP address to match your own environment.

---

## Button Labels

- `Enable notifications`: Notifications have not been allowed yet
- `Test notification`: Notifications are already allowed
- `Sound: ON / OFF`: Toggle notification sound
- `Allow in browser settings`: Notifications are blocked
- `HTTPS/localhost required`: The current connection is not secure
- `Not supported`: Browser notifications are not supported

---

## Troubleshooting

### Notifications do not appear

- Make sure you are accessing Forge Neo via localhost.
- Check your browser notification permissions.
- Check your OS notification settings.
- If using LAN access, allow the URL as a secure origin.

### Sound does not play

- Make sure `Sound` is turned ON.
- Some browsers may not play sound until after a user interaction.
- Try clicking the test notification button once.

---

## Version

v1.1.2
- Fixed false completion notifications when switching Checkpoint / LoRA tabs in Forge Neo.
- Generation completion is now detected using Gradio queue/progress state instead of noisy DOM/gallery changes.
v1.1.1 Reduced false detections of generation completion  
v1.1.0 Initial public release

---

## License

MIT
