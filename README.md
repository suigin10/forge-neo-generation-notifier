# Forge Neo Finish Notifier

Forge Neo / Stable Diffusion WebUI系向けの簡易通知拡張です。

## 内容

* 右下に独自の通知ボタンを表示します
* Forge Neo本体の Request Browser Notification ボタンに依存しません
* 通知許可済みなら生成完了時にブラウザ通知を出します
* 簡易的に生成中表示や停止ボタンを監視します

## 導入

1. このフォルダを Forge Neo の extensions フォルダへ入れる
2. Forge Neo を再起動する
3. 右下の「通知を有効化」を押す
4. テスト通知が出ればOK

## 注意

Braveなどでは通知に安全な接続が必要です。

推奨:
http://localhost:7860

LAN IPで使う場合はBraveの起動オプション例:
"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --unsafely-treat-insecure-origin-as-secure="http://localhost:7860,http://192.168.1.1:7860"

