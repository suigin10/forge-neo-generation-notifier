# Forge Neo Finish Notifier

Forge Neo / Stable Diffusion WebUI向けの、生成完了を通知するシンプルな拡張です。

Forge Neo本体の「Request Browser Notification」機能には依存せず、
独自に生成状態を監視して通知を行います。

---

## 特徴

- 画面右下に通知パネルを表示
- 通知の許可・テストボタン
- 通知音のON / OFF切り替え
- 生成完了時にブラウザ通知を表示
- 通知音の再生（ON時）
- 通知に生成時間を表示
- 生成中の経過時間をパネルに表示
- 進行バーや停止ボタンから生成状態を検出

---

## 導入方法

1. このフォルダを Forge Neo の `extensions` フォルダに配置
2. Forge Neo を再起動
3. ブラウザで Forge Neo を開く
4. 右下の「Enable notifications」をクリック
5. テスト通知が表示されれば設定完了

---

## 動作仕様

以下の状態変化を検知して通知します：

生成中 → 非生成状態

---

## 通知が動作する条件

ブラウザ通知には「安全な接続」が必要です。

推奨URL：

http://localhost:7860

---

## LANアクセス時の注意

LAN IPでアクセスすると通知がブロックされる場合があります。

Braveなどのブラウザでは、ショートカットの起動オプションで安全な接続として許可できます。

例（Brave）：

"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"

※ IPアドレス部分は環境に合わせて変更してください

---

## ボタン表示の意味

- Enable notifications：通知未許可
- Test notification：通知許可済み
- Sound: ON / OFF：通知音の切り替え
- Allow in browser settings：通知がブロックされている
- HTTPS/localhost required：安全な接続ではない
- Not supported：ブラウザ非対応

---

## トラブルシューティング

### 通知が出ない

- localhostでアクセスしているか確認
- ブラウザの通知許可を確認
- OSの通知設定を確認
- LANアクセスの場合は安全な接続として許可する

### 音が鳴らない

- SoundがONになっているか確認
- 一部ブラウザではユーザー操作後でないと音が鳴らない場合あり
- テスト通知ボタンを一度押してみる

---

## バージョン

v1.1.0

---

## ライセンス

MIT
