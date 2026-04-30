(() => {
  const EXT_NAME = "Forge Neo Finish Notifier";
  const CHECK_INTERVAL_MS = 1000;
  const NOTIFY_COOLDOWN_MS = 3000;

  let wasGenerating = false;
  let lastNotify = 0;
  let button = null;
  let statusLabel = null;

  function isNotificationSupported() {
    return "Notification" in window;
  }

  function getPermissionText() {
    if (!isNotificationSupported()) return "通知APIなし";
    if (!window.isSecureContext) return "安全でない接続";
    if (Notification.permission === "granted") return "通知ON";
    if (Notification.permission === "denied") return "通知拒否中";
    return "通知未許可";
  }

  function updateButtonState() {
    if (!button || !statusLabel) return;

    const text = getPermissionText();
    statusLabel.textContent = text;

    if (!isNotificationSupported()) {
      button.disabled = true;
      button.textContent = "通知非対応";
      return;
    }

    if (!window.isSecureContext) {
      button.disabled = true;
      button.textContent = "HTTPS/localhostが必要";
      return;
    }

    if (Notification.permission === "granted") {
      button.disabled = false;
      button.textContent = "テスト通知";
      return;
    }

    if (Notification.permission === "denied") {
      button.disabled = true;
      button.textContent = "ブラウザ設定で許可して";
      return;
    }

    button.disabled = false;
    button.textContent = "通知を有効化";
  }

  async function requestOrTestNotification() {
    try {
      if (!isNotificationSupported()) {
        alert("このブラウザは通知APIに対応していません。");
        return;
      }

      if (!window.isSecureContext) {
        alert("通知にはHTTPSまたはlocalhost扱いの安全な接続が必要です。Brave起動オプションでこのURLを安全扱いにするか、http://localhost:7860 で開いてください。");
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
        updateButtonState();
      }

      if (Notification.permission === "granted") {
        new Notification("Forge Neo通知テスト", {
          body: "通知は有効です。生成完了時にお知らせします。",
          silent: false
        });
      }

      updateButtonState();
    } catch (e) {
      console.warn(`[${EXT_NAME}] request/test notification failed`, e);
      alert("通知の有効化に失敗しました。Consoleを確認してください。");
    }
  }

  function createFloatingButton() {
    if (document.getElementById("forge-neo-finish-notifier-panel")) return;

    const panel = document.createElement("div");
    panel.id = "forge-neo-finish-notifier-panel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.bottom = "16px";
    panel.style.zIndex = "999999";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "6px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "10px";
    panel.style.background = "rgba(20, 20, 20, 0.85)";
    panel.style.color = "white";
    panel.style.fontSize = "12px";
    panel.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
    panel.style.backdropFilter = "blur(4px)";

    const title = document.createElement("div");
    title.textContent = "Finish Notifier";
    title.style.fontWeight = "bold";
    title.style.textAlign = "center";

    statusLabel = document.createElement("div");
    statusLabel.style.textAlign = "center";
    statusLabel.style.opacity = "0.9";

    button = document.createElement("button");
    button.type = "button";
    button.style.padding = "6px 10px";
    button.style.border = "0";
    button.style.borderRadius = "8px";
    button.style.cursor = "pointer";
    button.style.fontWeight = "bold";
    button.style.background = "#3b82f6";
    button.style.color = "white";
    button.addEventListener("click", requestOrTestNotification);

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.title = "閉じる";
    close.style.position = "absolute";
    close.style.right = "4px";
    close.style.top = "2px";
    close.style.border = "0";
    close.style.background = "transparent";
    close.style.color = "white";
    close.style.cursor = "pointer";
    close.style.fontSize = "14px";
    close.addEventListener("click", () => panel.remove());

    panel.appendChild(close);
    panel.appendChild(title);
    panel.appendChild(statusLabel);
    panel.appendChild(button);
    document.body.appendChild(panel);

    updateButtonState();
  }

  function notifyDone() {
    const now = Date.now();
    if (now - lastNotify < NOTIFY_COOLDOWN_MS) return;
    lastNotify = now;

    try {
      if (isNotificationSupported() && Notification.permission === "granted") {
        new Notification("生成完了", {
          body: "Forge Neoの生成が終了しました。",
          silent: false
        });
      } else {
        console.log(`[${EXT_NAME}] generation finished, but notification is not granted`);
      }
    } catch (e) {
      console.warn(`[${EXT_NAME}] notification failed`, e);
    }

    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVYGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAk5qkrrSqpJqLfnRmUExIR0lPXG12gYqPm5+gn6Copqagn56bmJeUkY2IfnRuZ2JeWlhZYGp2go2VmZuen6CenZuYl5WQjYJ5cWhaVU5KSEtQWmZygIqUmp+ho6KhoJ6amJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoA="
      );
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function isGenerating() {
    const progressCandidates = [
      "#progressbar",
      ".progressDiv",
      ".progress",
      "[id*='progress']",
      "[class*='progress']"
    ];

    const hasVisibleProgress = progressCandidates.some(selector => {
      return [...document.querySelectorAll(selector)].some(isVisible);
    });

    const hasActiveStopButton = [...document.querySelectorAll("button")]
      .some(b => {
        const text = (b.textContent || "").trim();
        return /interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(text) && !b.disabled && isVisible(b);
      });

    return hasVisibleProgress || hasActiveStopButton;
  }

  function loop() {
    try {
      const generating = isGenerating();

      if (wasGenerating && !generating) {
        notifyDone();
      }

      wasGenerating = generating;
      updateButtonState();
    } catch (e) {
      console.warn(`[${EXT_NAME}] loop failed`, e);
    }
  }

  function init() {
    createFloatingButton();
    setInterval(loop, CHECK_INTERVAL_MS);
    console.log(`[${EXT_NAME}] loaded`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
