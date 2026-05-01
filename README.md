# Forge Neo Finish Notifier

Forge Neo / Stable Diffusion WebUI系向けのシンプルな生成完了通知拡張です。

Forge Neo本体の「Request Browser Notification」機能には依存せず、
独自に生成状態を監視して通知を行います。

\---

## 機能

* 画面右下に通知パネルを表示
* 独立した通知許可・テストボタン
* 生成完了時にブラウザ通知を表示
* 通知音の再生
* 進行バーや停止ボタンから生成状態を検出
* 初回ページロード時の誤通知を防止

\---

## 導入方法

1. このフォルダを Forge Neo の `extensions` フォルダに配置
2. Forge Neo を再起動
3. ブラウザで Forge Neo を開く
4. 右下の「Enable notifications」をクリック
5. テスト通知が出れば設定完了

\---

## 動作仕様

スクリプトは以下の状態変化のみ通知します：

生成中 → 非生成状態

\---

## 通知が動作する条件

ブラウザ通知には「安全な接続」が必要です。

推奨URL：
http://localhost:7860

\---

## LANアクセス時の注意（Braveなど）

LAN IPでアクセスすると通知がブロックされる場合があります。

ブラウザのショートカットのプロパティで接続を許可してください。

Braveの例：
"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"

\---

## ボタン表示の意味

* Enable notifications：通知未許可
* Test notification：通知許可済み
* Allow in browser settings：通知ブロック中
* HTTPS/localhost required：安全な接続ではない
* Not supported：ブラウザ非対応

\---

## トラブルシューティング

### 通知が出ない

* localhostでアクセスしているか確認
* 通知許可を確認
* OSの通知設定を確認

\---

## バージョン

v1.0.1

\---

## ライセンス

MIT

