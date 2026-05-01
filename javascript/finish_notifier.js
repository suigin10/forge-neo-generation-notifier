(() => {
  const EXT_NAME = "Forge Neo Finish Notifier";
  const CHECK_INTERVAL_MS = 1000;
  const NOTIFY_COOLDOWN_MS = 3000;

  let initialized = false;
  let wasGenerating = false;
  let lastNotify = 0;

  let button = null;
  let statusLabel = null;

  function isNotificationSupported() {
    return "Notification" in window;
  }

  function getPermissionText() {
    if (!isNotificationSupported()) return "Notifications not supported";
    if (!window.isSecureContext) return "Insecure connection";
    if (Notification.permission === "granted") return "Notifications enabled";
    if (Notification.permission === "denied") return "Notifications blocked";
    return "Notifications not allowed";
  }

  function updateButtonState() {
    if (!button || !statusLabel) return;

    statusLabel.textContent = getPermissionText();

    if (!isNotificationSupported()) {
      button.disabled = true;
      button.textContent = "Not supported";
      return;
    }

    if (!window.isSecureContext) {
      button.disabled = true;
      button.textContent = "HTTPS/localhost required";
      return;
    }

    if (Notification.permission === "granted") {
      button.disabled = false;
      button.textContent = "Test notification";
      return;
    }

    if (Notification.permission === "denied") {
      button.disabled = true;
      button.textContent = "Allow in browser settings";
      return;
    }

    button.disabled = false;
    button.textContent = "Enable notifications";
  }

  async function requestOrTestNotification() {
    try {
      if (!isNotificationSupported()) {
        alert("This browser does not support the Notification API.");
        return;
      }

      if (!window.isSecureContext) {
        alert(
          "Notifications require HTTPS or a secure localhost context. " +
          "Open Forge Neo via http://localhost:7860, or mark the LAN URL as secure in your browser launch options."
        );
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
        updateButtonState();
      }

      if (Notification.permission === "granted") {
        new Notification("Forge Neo notification test", {
          body: "Notifications are enabled. You will be notified when generation finishes.",
          silent: false
        });
      }

      updateButtonState();
    } catch (e) {
      console.warn(`[${EXT_NAME}] request/test notification failed`, e);
      alert("Failed to enable or test notifications. Please check the browser console.");
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
    close.title = "Close";
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
        new Notification("Generation complete", {
          body: "Forge Neo generation has finished.",
          silent: false
        });
      } else {
        console.log(`[${EXT_NAME}] generation finished, but notifications are not granted`);
      }
    } catch (e) {
      console.warn(`[${EXT_NAME}] notification failed`, e);
    }

    playNotificationSound();
  }

  function playNotificationSound() {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVYGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAk5qkrrSqpJqLfnRmUExIR0lPXG12gYqPm5+gn6Copqagn56bmJeUkY2IfnRuZ2JeWlhZYGp2go2VmZuen6CenZuYl5WQjYJ5cWhaVU5KSEtQWmZygIqUmp+ho6KhoJ6amJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoJ6bmJaSjYh8dm1jW15cXmRseIKNlpueoKCgoA="
      );
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore sound playback errors.
    }
  }

  function isVisible(el) {
    if (!el) return false;

    const style = window.getComputedStyle(el);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.offsetParent !== null
    );
  }

  function isGenerating() {
    const progressCandidates = [
      "#progressbar",
      ".progressDiv",
      ".progress",
      "[id*='progress']",
      "[class*='progress']"
    ];

    const hasVisibleProgress = progressCandidates.some((selector) => {
      return [...document.querySelectorAll(selector)].some(isVisible);
    });

    const hasActiveStopButton = [...document.querySelectorAll("button")].some((buttonElement) => {
      const text = (buttonElement.textContent || "").trim();

      return (
        /interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(text) &&
        !buttonElement.disabled &&
        isVisible(buttonElement)
      );
    });

    return hasVisibleProgress || hasActiveStopButton;
  }

  function loop() {
    try {
      const generating = isGenerating();

      // First loop only records the current state.
      // This prevents a false "generation complete" notification on initial page load.
      if (!initialized) {
        initialized = true;
        wasGenerating = generating;
        updateButtonState();
        console.log(`[${EXT_NAME}] initialized. generating=${generating}`);
        return;
      }

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
    loop();
    console.log(`[${EXT_NAME}] loaded`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
