# Forge Neo Generation Notifier

Forge Neo / Stable Diffusion WebUI 向けの、生成完了を通知するシンプルな拡張です。

Forge Neo 本体の `Request Browser Notification` 機能には依存せず、独自に生成状態を監視して通知を行います。

---

## 特徴

* 画面右下に通知パネルを表示
* 通知の許可・テストボタンを表示
* 通知音の ON / OFF 切り替え
* 生成完了時にブラウザ通知を表示
* 通知音の再生（ON 時）
* 通知に生成時間を表示
* 生成中の経過時間をパネルに表示
* 進行バーや停止ボタンから生成状態を検出

---

## 導入方法

1. このフォルダを Forge Neo の `extensions` フォルダに配置します。
2. Forge Neo を再起動します。
3. ブラウザで Forge Neo を開きます。
4. 画面右下の `Enable notifications` をクリックします。
5. テスト通知が表示されれば設定完了です。

---

## 動作仕様

以下の状態変化を検知して通知します。

```text
生成中 → 非生成状態
```

v1.1.2 以降では、DOM やギャラリー更新ではなく、Gradio の queue / progress 状態を使って生成完了を判定します。

---

## 通知が動作する条件

ブラウザ通知には、安全な接続として扱われるページが必要です。

推奨 URL は以下です。

```text
http://localhost:7860
```

`localhost` でアクセスしている場合は、通常そのまま通知を利用できます。

---

## LAN アクセス時の注意

LAN 内の別 PC から IP アドレスでアクセスしている場合、ブラウザ通知がブロックされることがあります。

例：

```text
http://192.168.x.x:7860
```

この場合は、使用しているブラウザで対象 URL を「安全な接続として扱う」設定に追加してください。

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

### Brave などで起動オプションを使う場合

ショートカットの起動オプションに以下のように追加します。

```bat
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://127.0.0.1:7860,http://localhost:7860,http://192.168.x.x:7860"
```

※ `192.168.x.x` の部分は、自分の環境に合わせて変更してください。

---

## ボタン表示の意味

* `Enable notifications`：通知がまだ許可されていません
* `Test notification`：通知が許可されています
* `Sound: ON / OFF`：通知音の切り替え
* `Allow in browser settings`：ブラウザ側で通知がブロックされています
* `HTTPS/localhost required`：安全な接続として扱われていません
* `Not supported`：ブラウザが通知に対応していません

---

## トラブルシューティング

### 通知が出ない

以下を確認してください。

* `localhost` でアクセスしているか
* ブラウザ側で通知が許可されているか
* OS 側の通知設定が有効になっているか
* LAN アクセスの場合、安全な接続として許可しているか

### 音が鳴らない

以下を確認してください。

* `Sound` が `ON` になっているか
* ブラウザや OS 側で音声がミュートされていないか
* テスト通知ボタンを一度押してみたか

一部のブラウザでは、ユーザー操作後でないと音が再生されない場合があります。

---

## バージョン

### v1.1.2

* Forge Neo で Checkpoint / LoRA タブを操作した際に、生成完了と誤検出される問題を修正
* DOM やギャラリー更新ではなく、Gradio の queue / progress 状態を使って生成完了を判定するよう変更

### v1.1.1

* 生成完了の誤検出を軽減

### v1.1.0

* 初回リリース

---

## ライセンス

MIT
