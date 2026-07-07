# Forge Neo Generation Notifier

A simple extension for Forge Neo / Stable Diffusion WebUI that sends a notification when image generation is complete.

This extension does not depend on Forge Neo's built-in `Request Browser Notification` feature.
Instead, it monitors the generation state independently and sends its own notifications.

---

## Features

* Displays a notification panel in the bottom-right corner
* Provides notification permission and test buttons
* Allows notification sound to be turned ON / OFF
* Shows a browser notification when generation is complete
* Plays a notification sound when enabled
* Displays the generation time in the notification
* Shows the elapsed generation time in the panel
* Detects the generation state using the progress bar and stop button

---

## Installation

1. Place this folder inside Forge Neo's `extensions` folder.
2. Restart Forge Neo.
3. Open Forge Neo in your browser.
4. Click `Enable notifications` in the bottom-right panel.
5. If the test notification appears, setup is complete.

---

## Behavior

This extension sends a notification when the following state change is detected:

```text
Generating → Not generating
```

Since v1.1.2, completion detection is based on Gradio queue / progress state instead of DOM or gallery updates.

---

## Notification Requirements

Browser notifications require the page to be treated as a secure context.

Recommended URL:

```text
http://localhost:7860
```

When accessing Forge Neo via `localhost`, notifications should usually work without additional browser settings.

---

## Notes for LAN Access

When accessing Forge Neo from another PC on the same LAN using an IP address, browser notifications may be blocked.

Example:

```text
http://192.168.x.x:7860
```

In that case, add the target URL to your browser's list of origins treated as secure.

### Chrome

Open the following page in the address bar:

```text
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

Set `Insecure origins treated as secure` to `Enabled`, then add the following origins:

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

Restart Chrome after changing the setting.

### Edge

Open the following page in the address bar:

```text
edge://flags/#unsafely-treat-insecure-origin-as-secure
```

Set `Insecure origins treated as secure` to `Enabled`, then add the following origins:

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

Restart Edge after changing the setting.

### Brave or other Chromium-based browsers

You can also add a launch option to the browser shortcut.

Example for Brave:

```bat
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860"
```

Replace `192.168.x.x` with the IP address used in your own environment.

---

## Button Labels

* `Enable notifications`: Notifications have not been allowed yet
* `Test notification`: Notifications are allowed
* `Sound: ON / OFF`: Toggles notification sound
* `Allow in browser settings`: Notifications are blocked by the browser
* `HTTPS/localhost required`: The page is not treated as a secure context
* `Not supported`: Browser notifications are not supported

---

## Troubleshooting

### Notifications do not appear

Check the following:

* Make sure you are accessing Forge Neo via `localhost`
* Check browser notification permissions
* Check OS notification settings
* If using LAN access, make sure the URL is treated as a secure origin

### Notification sound does not play

Check the following:

* Make sure `Sound` is set to `ON`
* Make sure the browser or OS audio is not muted
* Try pressing the test notification button once

Some browsers may block audio playback until the user interacts with the page.

---

## Version History

### v1.1.2

* Fixed an issue where changing Checkpoint / LoRA tabs in Forge Neo could be incorrectly detected as generation completion
* Changed completion detection to use Gradio queue / progress state instead of DOM or gallery updates

### v1.1.1

* Reduced false completion detections

### v1.1.0

* Initial release

---

## License

MIT
