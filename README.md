# Forge Neo Generation Notifier

Forge Neo / Stable Diffusion WebUI 向けの、画像生成完了を通知するシンプルな拡張機能です。

Forge Neo 本体の `Request Browser Notification` 機能には依存せず、生成状態を独自に監視して通知を行います。

---

## 特徴

- 画面右下に通知パネルを表示
- 通知許可ボタンとテスト通知ボタンを表示
- 通知音の ON / OFF 切り替え
- 画像生成完了時にブラウザ通知を表示
- 通知音の再生（ON 時）
- 通知に生成時間を表示
- 生成中の経過時間をパネルに表示
- Gradio の queue / progress 状態、progress API、UI 状態を使って生成完了を検出

---

## 導入方法

1. このフォルダを Forge Neo の `extensions` フォルダに配置します。
2. Forge Neo を再起動します。
3. ブラウザで Forge Neo を開きます。
4. 右下の通知パネルにある `Enable notifications` をクリックします。
5. テスト通知が表示されれば設定完了です。

---

## 動作仕様

この拡張機能は、以下の状態変化を検出したときに通知します。

```text
生成中 → 非生成状態
```

完了判定には、Gradio の queue / progress 状態、progress API、Generate / Interrupt ボタンなどの UI 状態を利用します。

画像プレビュー操作やタブ切り替えなど、生成完了ではない UI 変化による誤通知を抑えるようにしています。

---

## 通知が動作する条件

ブラウザ通知を利用するには、ページが secure context（安全なコンテキスト）として扱われる必要があります。

推奨 URL：

```text
http://localhost:7860
```

Forge Neo に `localhost` でアクセスしている場合は、通常は追加設定なしで通知を利用できます。

---

## LAN アクセス時の注意

同じ LAN 内の別 PC から IP アドレスで Forge Neo にアクセスしている場合、ブラウザ通知がブロックされることがあります。

例：

```text
http://192.168.x.x:7860
```

その場合は、対象 URL をブラウザ側で「安全な接続として扱うオリジン」に追加してください。

### Chrome の場合

アドレスバーで以下を開きます。

```text
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

`Insecure origins treated as secure` を `Enabled` にして、入力欄に以下のように追加します。

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

設定後、Chrome を再起動してください。

### Edge の場合

アドレスバーで以下を開きます。

```text
edge://flags/#unsafely-treat-insecure-origin-as-secure
```

`Insecure origins treated as secure` を `Enabled` にして、入力欄に以下のように追加します。

```text
http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860
```

設定後、Edge を再起動してください。

### Brave などの Chromium 系ブラウザで起動オプションを使う場合

ブラウザのショートカットに起動オプションを追加する方法もあります。

Brave の例：

```bat
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860"
```

`192.168.x.x` の部分は、自分の環境で使用している IP アドレスに置き換えてください。

---

## ボタン表示の意味

- `Enable notifications`：通知がまだ許可されていません
- `Test notification`：通知が許可されています
- `Sound: ON / OFF`：通知音の切り替え
- `Allow in browser settings`：ブラウザ側で通知がブロックされています
- `HTTPS/localhost required`：ページが secure context として扱われていません
- `Not supported`：ブラウザ通知に対応していません

---

## トラブルシューティング

### 通知が出ない

以下を確認してください。

- Forge Neo に `localhost` でアクセスしているか
- ブラウザ側で通知が許可されているか
- OS 側の通知設定が有効になっているか
- LAN アクセスの場合、対象 URL が安全なオリジンとして扱われているか

### 通知音が鳴らない

以下を確認してください。

- `Sound` が `ON` になっているか
- ブラウザや OS 側で音声がミュートされていないか
- テスト通知ボタンを一度押してみたか

一部のブラウザでは、ユーザーがページを操作するまで音声再生がブロックされる場合があります。

---

## バージョン履歴

### v1.1.4

- Generate / Interrupt / 再生成の連続操作時の安定性を改善
- 信頼できる Gradio queue 完了イベントは、UI ガード中でも生成完了として確定するよう改善
- UI 操作中の古い queue 完了イベントや無関係な完了イベントをより安全に無視
- Forge Neo / Gradio 側のブラウザ通知を、完了判定の補助シグナルとして利用

### v1.1.3

- 生成中に画像プレビューを開いた際、生成完了と誤検出される問題を修正
- `txt2img` / `img2img` などのタブ操作による誤通知を軽減
- Gradio queue の `event_id` と短時間の progress 確認を使って完了判定を改善

### v1.1.2

- Checkpoint / LoRA タブ操作時の生成完了誤検出を修正
- DOM やギャラリー更新ではなく、Gradio queue / progress 状態を使う方式に変更
- 生成中の UI 操作による誤判定を軽減

### v1.1.1

- 生成完了の誤検出を軽減

### v1.1.0

- 初回リリース

---

## ライセンス

MIT
