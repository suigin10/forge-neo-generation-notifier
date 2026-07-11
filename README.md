# Forge Neo Generation Notifier

SD Forge Neoで画像生成が完了したときに、ブラウザ通知と通知音で知らせるシンプルな拡張機能です。  
A simple extension that sends a browser notification and plays a sound when image generation finishes in SD Forge Neo.

[日本語](#日本語) | [English](#english)

---

# 日本語

## 概要

Forge Neo / Stable Diffusion WebUI向けの画像生成完了通知拡張です。

画面右下に小さな通知パネルを表示し、画像生成の完了時にブラウザ通知を送ります。通知音のON / OFF切り替えや、生成中の経過時間表示にも対応しています。

通知は本拡張が独自に行います。生成完了の判定には、Gradioのqueue / progress状態、progress API、Generate / InterruptボタンなどのUI状態を組み合わせて利用します。

## 特徴

- 画像生成完了時にブラウザ通知を表示
- 通知音のON / OFF切り替え
- 通知に生成時間を表示
- 生成中の経過時間を画面右下に表示
- 通知許可ボタンとテスト通知ボタンを搭載
- Gradioのqueue / progress状態、progress API、UI状態を組み合わせて完了を検出
- Checkpoint / LoRAタブ、画像プレビュー、タブ切り替えなどによる誤通知を抑制
- Generate / Interrupt / 再生成の連続操作に対応
- Forge Neo起動処理中にGenerateを押した場合の誤通知を抑制

## 対応環境

主にSD Forge Neoでの使用を想定しています。

ブラウザ通知を利用するには、ページがsecure context（安全なコンテキスト）として扱われる必要があります。

推奨URL：

```text
http://localhost:7860
```

`localhost`でForge Neoへアクセスしている場合は、通常は追加設定なしで通知を利用できます。

## インストール

### 方法1：ZIPから導入

1. このリポジトリをZIPでダウンロードします。
2. ZIPを展開します。
3. フォルダをForge Neoの`extensions`フォルダへ配置します。
4. Forge Neoを再起動します。

配置例：

```text
stable-diffusion-webui-forge/
└─ extensions/
   └─ forge-neo-generation-notifier/
      ├─ install.py
      └─ javascript/
         └─ generation_notifier.js
```

### 方法2：Gitで導入

Forge Neoの`extensions`フォルダで、次のコマンドを実行します。

```bash
git clone https://github.com/suigin10/forge-neo-generation-notifier.git
```

導入後、Forge Neoを再起動してください。

## 初期設定

1. ブラウザでForge Neoを開きます。
2. 画面右下の通知パネルを確認します。
3. `Enable notifications`をクリックします。
4. ブラウザの通知許可ダイアログで通知を許可します。
5. `Test notification`を押し、通知が表示されることを確認します。
6. 必要に応じて`Sound: ON / OFF`で通知音を切り替えます。

## 動作仕様

本拡張は、Generateボタンの操作後に生成状態を監視し、実際の画像生成が完了したと判断したときに通知します。

完了判定には、主に次の情報を利用します。

- Gradio queueのイベント
- progress API
- Generate / Interrupt / Stopボタンの状態
- 画像出力を含むqueue応答
- Forge Neo / Gradio側の通知シグナル

単一のUI変化だけでは完了と判断せず、複数の情報を組み合わせて誤通知を抑えています。

### v1.1.5の起動時対策

Forge Neoの起動処理中には、画像生成以外の初期化処理でもGradio queueが使用される場合があります。

v1.1.5では、`/queue/join`を検出しただけでは画像生成開始と判断しません。queueイベントは一度「生成候補」として保持し、次のいずれかを確認してから実際の画像生成として扱います。

- progress APIで生成中と確認できた
- Interrupt / Stopボタンが表示された
- queue応答に画像出力が含まれていた

これにより、Forge Neoの起動が完了する前にGenerateを押した場合でも、起動用queueの完了を画像生成完了と誤認しにくくしています。

## ボタン表示

| 表示 | 意味 |
|---|---|
| `Enable notifications` | 通知がまだ許可されていません |
| `Test notification` | 通知が許可されています |
| `Sound: ON / OFF` | 通知音を切り替えます |
| `Allow in browser settings` | ブラウザ側で通知がブロックされています |
| `HTTPS/localhost required` | ページがsecure contextとして扱われていません |
| `Not supported` | ブラウザがNotification APIに対応していません |

## LANアクセス時の注意

同じLAN内の別PCからIPアドレスでForge Neoへアクセスすると、ブラウザ通知がブロックされる場合があります。

例：

```text
http://192.168.x.x:7860
```

この場合は、対象URLをブラウザ側で「安全な接続として扱うオリジン」に追加してください。

### Chrome

アドレスバーで次を開きます。

```text
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

`Insecure origins treated as secure`を`Enabled`にし、使用するURLを追加します。

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

設定後、Chromeを再起動してください。

### Edge

アドレスバーで次を開きます。

```text
edge://flags/#unsafely-treat-insecure-origin-as-secure
```

`Insecure origins treated as secure`を`Enabled`にし、使用するURLを追加します。

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

設定後、Edgeを再起動してください。

### BraveなどのChromium系ブラウザ

ブラウザのショートカットへ起動オプションを追加する方法もあります。

Braveの例：

```text
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860"
```

`192.168.x.x`は、自分の環境で使用しているIPアドレスへ置き換えてください。

> ブラウザの実験的設定を変更する場合は、対象を信頼できるローカルネットワーク内のURLだけに限定してください。

## トラブルシューティング

### 通知が表示されない

次を確認してください。

- Forge Neoへ`localhost`でアクセスしているか
- ブラウザで通知が許可されているか
- OS側の通知設定が有効か
- Forge NeoのタブがブラウザやOSによって強く制限されていないか
- LANアクセスの場合、対象URLが安全なオリジンとして扱われているか

通知許可を変更した場合は、Forge Neoのページを再読み込みしてください。

### 通知音が鳴らない

次を確認してください。

- `Sound`が`ON`になっているか
- ブラウザやOSがミュートされていないか
- `Test notification`を一度押したか
- ブラウザの自動再生制限により音声がブロックされていないか

一部のブラウザでは、ユーザーがページを操作するまで音声再生が許可されません。

### 生成完了前に通知される

- 拡張機能が最新版か確認してください。
- Forge Neoを再起動し、ブラウザ側も再読み込みしてください。
- 古い`generation_notifier.js`が残っていないか確認してください。
- 再現する場合は、ブラウザの開発者ツールにあるConsoleログと、再現手順を添えてIssueへ報告してください。

### 生成が完了しても通知されない

- 通常生成で再現するか確認してください。
- Interrupt直後や連続生成だけで発生するか確認してください。
- ブラウザの開発者ツールにあるConsoleで、`[Generation Notifier]`から始まるログを確認してください。

## アップデート

Gitで導入した場合は、拡張機能のフォルダで次を実行します。

```bash
git pull
```

更新後はForge Neoを再起動し、ブラウザのページを再読み込みしてください。

ZIPで導入した場合は、既存フォルダを新しいバージョンで置き換えてください。

## アンインストール

Forge Neoを終了し、`extensions`内の次のフォルダを削除します。

```text
forge-neo-generation-notifier
```

その後、Forge Neoを再起動してください。

## バージョン履歴

### v1.1.5

- Forge Neo起動処理中にGenerateを押した際、起動用queueの完了を画像生成完了と誤認する問題を修正
- `/queue/join`を生成開始の確定条件ではなく、生成候補として扱うよう変更
- progress API、Interrupt / Stop UI、または画像出力を確認してから実生成として確定するよう改善
- 起動処理由来のqueue完了を無視したあとも、本来の生成リクエストを継続して捕捉するよう改善

### v1.1.4

- Generate / Interrupt / 再生成の連続操作時の安定性を改善
- 信頼できるGradio queue完了イベントを、UIガード中でも生成完了として確定するよう改善
- UI操作中の古いqueue完了イベントや無関係な完了イベントをより安全に無視
- Forge Neo / Gradio側のブラウザ通知を完了判定の補助シグナルとして利用

### v1.1.3

- 生成中に画像プレビューを開いた際、生成完了と誤検出される問題を修正
- `txt2img` / `img2img`などのタブ操作による誤通知を軽減
- Gradio queueの`event_id`と短時間のprogress確認を使って完了判定を改善

### v1.1.2

- Checkpoint / LoRAタブ操作時の生成完了誤検出を修正
- DOMやギャラリー更新ではなく、Gradio queue / progress状態を使う方式へ変更
- 生成中のUI操作による誤判定を軽減

### v1.1.1

- 生成完了の誤検出を軽減

### v1.1.0

- 初回リリース

## ライセンス

MIT License

---

# English

## Overview

Forge Neo Generation Notifier is a simple image-generation completion notification extension for Forge Neo / Stable Diffusion WebUI.

It adds a small panel to the bottom-right corner of the page and sends a browser notification when image generation finishes. It also supports an optional notification sound and displays elapsed generation time while a task is running.

Notifications are sent independently by this extension. Completion detection combines Gradio queue / progress state, the progress API, and UI state such as the Generate and Interrupt buttons.

## Features

- Browser notification when image generation finishes
- Notification sound with ON / OFF control
- Generation time shown in the notification
- Live elapsed-time display in the bottom-right panel
- Notification permission and test notification buttons
- Completion detection using Gradio queue / progress state, the progress API, and UI state
- Reduced false notifications caused by Checkpoint / LoRA tabs, image previews, and tab switching
- Improved handling of rapid Generate / Interrupt / restart operations
- Reduced false notifications when Generate is pressed during Forge Neo startup

## Requirements

This extension is primarily intended for SD Forge Neo.

Browser notifications require the page to be treated as a secure context.

Recommended URL:

```text
http://localhost:7860
```

When Forge Neo is opened through `localhost`, browser notifications should usually work without additional configuration.

## Installation

### Method 1: Install from ZIP

1. Download this repository as a ZIP file.
2. Extract the ZIP file.
3. Place the extracted folder inside Forge Neo's `extensions` folder.
4. Restart Forge Neo.

Example folder structure:

```text
stable-diffusion-webui-forge/
└─ extensions/
   └─ forge-neo-generation-notifier/
      ├─ install.py
      └─ javascript/
         └─ generation_notifier.js
```

### Method 2: Install with Git

Run the following command inside Forge Neo's `extensions` folder:

```bash
git clone https://github.com/suigin10/forge-neo-generation-notifier.git
```

Restart Forge Neo after installation.

## Initial Setup

1. Open Forge Neo in your browser.
2. Find the notification panel in the bottom-right corner.
3. Click `Enable notifications`.
4. Allow notifications in the browser permission dialog.
5. Click `Test notification` and confirm that a notification appears.
6. Use `Sound: ON / OFF` to change the notification sound setting.

## How It Works

After the Generate button is pressed, the extension monitors the generation state and sends a notification only when it determines that real image generation has finished.

Completion detection mainly uses the following signals:

- Gradio queue events
- The progress API
- Generate / Interrupt / Stop button state
- Queue responses containing image output
- Forge Neo / Gradio notification signals

The extension does not treat a single UI change as completion. It combines multiple signals to reduce false notifications.

### Startup Handling in v1.1.5

During Forge Neo startup, Gradio queue operations may also be used for initialization tasks unrelated to image generation.

Starting with v1.1.5, detecting `/queue/join` alone is not treated as proof that image generation has started. The queue event is first stored as a generation candidate and is promoted to a real generation run only after one of the following is confirmed:

- The progress API reports active generation
- The Interrupt / Stop button becomes visible
- The queue response contains image output

This reduces false completion notifications when Generate is pressed before Forge Neo has fully finished its startup process.

## Button Labels

| Label | Meaning |
|---|---|
| `Enable notifications` | Notification permission has not been granted |
| `Test notification` | Notifications are allowed |
| `Sound: ON / OFF` | Toggles the notification sound |
| `Allow in browser settings` | Notifications are blocked by the browser |
| `HTTPS/localhost required` | The page is not treated as a secure context |
| `Not supported` | The browser does not support the Notification API |

## Notes for LAN Access

When Forge Neo is accessed from another PC on the same LAN through an IP address, browser notifications may be blocked.

Example:

```text
http://192.168.x.x:7860
```

In this case, add the target URL to the browser's list of origins treated as secure.

### Chrome

Open the following page:

```text
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

Set `Insecure origins treated as secure` to `Enabled`, then add the URLs you use:

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

Restart Chrome after changing the setting.

### Edge

Open the following page:

```text
edge://flags/#unsafely-treat-insecure-origin-as-secure
```

Set `Insecure origins treated as secure` to `Enabled`, then add the URLs you use:

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

Restart Edge after changing the setting.

### Brave and Other Chromium-Based Browsers

You can also add a launch option to the browser shortcut.

Example for Brave:

```text
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860"
```

Replace `192.168.x.x` with the IP address used in your environment.

> When changing experimental browser security settings, limit the exception to trusted local-network URLs only.

## Troubleshooting

### Notifications Do Not Appear

Check the following:

- Make sure Forge Neo is opened through `localhost`
- Make sure browser notifications are allowed
- Make sure operating-system notifications are enabled
- Make sure the Forge Neo tab is not heavily restricted by the browser or operating system
- For LAN access, make sure the target URL is treated as a secure origin

Reload the Forge Neo page after changing notification permissions.

### Notification Sound Does Not Play

Check the following:

- Make sure `Sound` is set to `ON`
- Make sure the browser and operating system are not muted
- Click `Test notification` at least once
- Check whether browser autoplay restrictions are blocking audio

Some browsers do not allow audio playback until the user interacts with the page.

### A Notification Appears Before Generation Finishes

- Make sure the extension is up to date.
- Restart Forge Neo and reload the browser page.
- Check that an older copy of `generation_notifier.js` is not still present.
- If the problem can be reproduced, open an Issue with the reproduction steps and the browser Console log.

### No Notification Appears After Generation Finishes

- Check whether the issue also occurs during a normal generation.
- Check whether it occurs only after Interrupt or during rapid consecutive generations.
- Open the browser developer tools and review Console messages beginning with `[Generation Notifier]`.

## Updating

If the extension was installed with Git, run the following command inside the extension folder:

```bash
git pull
```

Restart Forge Neo and reload the browser page after updating.

For ZIP installations, replace the existing extension folder with the new version.

## Uninstallation

Close Forge Neo and remove the following folder from `extensions`:

```text
forge-neo-generation-notifier
```

Then restart Forge Neo.

## Version History

### v1.1.5

- Fixed a false completion notification that could occur when Generate was pressed during Forge Neo startup
- Changed `/queue/join` from a confirmed generation-start signal to a generation candidate
- Real generation is now confirmed only after progress API activity, Interrupt / Stop UI state, or image output is detected
- Improved capture handling so the real generation request can still be detected after an unrelated startup queue completion is ignored

### v1.1.4

- Improved stability during rapid Generate / Interrupt / restart operations
- Trusted Gradio queue completion events can now finalize generation even while UI guards are active
- Stale or unrelated queue completion events are ignored more safely during UI operations
- Forge Neo / Gradio browser notifications are used as an auxiliary completion signal

### v1.1.3

- Fixed false completion detections caused by opening the image preview during generation
- Reduced false notifications when interacting with tabs such as `txt2img` / `img2img`
- Improved completion detection using Gradio queue `event_id` and short progress confirmation

### v1.1.2

- Fixed false completion detections caused by changing Checkpoint / LoRA tabs
- Switched completion detection from DOM / gallery updates to Gradio queue / progress state
- Reduced false detections caused by UI operations during generation

### v1.1.1

- Reduced false completion detections

### v1.1.0

- Initial release

## License

MIT License
