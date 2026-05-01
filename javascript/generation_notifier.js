(() => {
  const EXT_NAME = "Forge Neo Generation Notifier";
  const CHECK_INTERVAL_MS = 1000;
  const NOTIFY_COOLDOWN_MS = 10000;
  const SOUND_STORAGE_KEY = "forge_neo_generation_notifier_sound_enabled";

  // Ignore the first few monitor loops to avoid false notifications during Forge Neo startup.
  // This is state-based, not time-based, so it is more robust across different PCs/browsers.
  const STARTUP_SYNC_LOOPS = 3;

  // Ignore finish detection immediately after a tab visibility change.
  // This prevents duplicate notifications caused by Brave/Chrome re-evaluating the page state.
  const VISIBILITY_GUARD_MS = 3000;

  let wasGenerating = false;
  let startupSyncCount = 0;
  let lastNotify = 0;
  let lastVisibilityChange = 0;
  let generationStartTime = null;
  let button = null;
  let soundButton = null;
  let statusLabel = null;
  let elapsedLabel = null;
  let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) !== "false";

  document.addEventListener("visibilitychange", () => {
    lastVisibilityChange = Date.now();
  });

  function isNotificationSupported() {
    return "Notification" in window;
  }

  function getPermissionText() {
    if (!isNotificationSupported()) return "Notification API unavailable";
    if (!window.isSecureContext) return "Insecure connection";
    if (Notification.permission === "granted") return "Notifications enabled";
    if (Notification.permission === "denied") return "Notifications blocked";
    return "Notifications not allowed";
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "Unknown";

    const totalSeconds = Math.max(1, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  function updateElapsedLabel(generating) {
    if (!elapsedLabel) return;

    if (generating && generationStartTime) {
      elapsedLabel.textContent = `Running: ${formatDuration(Date.now() - generationStartTime)}`;
      elapsedLabel.style.display = "block";
      return;
    }

    elapsedLabel.textContent = "";
    elapsedLabel.style.display = "none";
  }

  function updateSoundButtonState() {
    if (!soundButton) return;

    soundButton.textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
    soundButton.title = soundEnabled ? "Disable notification sound" : "Enable notification sound";
  }

  function updateButtonState() {
    if (!button || !statusLabel) return;

    const text = getPermissionText();
    statusLabel.textContent = text;

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

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    updateSoundButtonState();

    if (soundEnabled) {
      playSound();
    }
  }

  function playSound() {
    if (!soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.38);

      oscillator.addEventListener("ended", () => {
        audioContext.close().catch(() => {});
      });
    } catch (e) {
      console.warn(`[${EXT_NAME}] sound failed`, e);
    }
  }

  async function requestOrTestNotification() {
    try {
      if (!isNotificationSupported()) {
        alert("This browser does not support the Notification API.");
        return;
      }

      if (!window.isSecureContext) {
        alert(
          "Browser notifications require HTTPS or a localhost secure context.\n" +
          "Open Forge Neo via http://localhost:7860, or allow this URL as a secure origin in your browser settings."
        );
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
        updateButtonState();
      }

      if (Notification.permission === "granted") {
        new Notification("Forge Neo notification test", {
          body: "Notifications are enabled.\nYou will be notified when generation is complete.",
          silent: !soundEnabled,
        });
        playSound();
      }

      updateButtonState();
    } catch (e) {
      console.warn(`[${EXT_NAME}] request/test notification failed`, e);
      alert("Failed to enable notifications.\nPlease check the console.");
    }
  }

  function applyButtonStyle(target, background) {
    target.style.padding = "6px 10px";
    target.style.border = "0";
    target.style.borderRadius = "8px";
    target.style.cursor = "pointer";
    target.style.fontWeight = "bold";
    target.style.background = background;
    target.style.color = "white";
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

    elapsedLabel = document.createElement("div");
    elapsedLabel.style.textAlign = "center";
    elapsedLabel.style.opacity = "0.85";
    elapsedLabel.style.display = "none";

    button = document.createElement("button");
    button.type = "button";
    applyButtonStyle(button, "#3b82f6");
    button.addEventListener("click", requestOrTestNotification);

    soundButton = document.createElement("button");
    soundButton.type = "button";
    applyButtonStyle(soundButton, "#475569");
    soundButton.addEventListener("click", toggleSound);

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
    panel.appendChild(elapsedLabel);
    panel.appendChild(button);
    panel.appendChild(soundButton);

    document.body.appendChild(panel);
    updateButtonState();
    updateSoundButtonState();
  }

  function notifyDone() {
    const now = Date.now();

    if (now - lastNotify < NOTIFY_COOLDOWN_MS) return;

    lastNotify = now;

    const durationText = generationStartTime
      ? `Generation time: ${formatDuration(now - generationStartTime)}`
      : "Generation time: Unknown";

    try {
      if (isNotificationSupported() && Notification.permission === "granted") {
        new Notification("Generation complete", {
          body: `Forge Neo generation has finished.\n${durationText}`,
          silent: !soundEnabled,
        });
      } else {
        console.log(`[${EXT_NAME}] generation finished, but notification is not granted`);
      }
    } catch (e) {
      console.warn(`[${EXT_NAME}] notification failed`, e);
    }

    playSound();
    generationStartTime = null;
    updateElapsedLabel(false);
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
      "[class*='progress']",
    ];

    const hasVisibleProgress = progressCandidates.some((selector) => {
      return [...document.querySelectorAll(selector)].some(isVisible);
    });

    const hasActiveStopButton = [...document.querySelectorAll("button")].some((b) => {
      const text = (b.textContent || "").trim();

      return /interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(text) && !b.disabled && isVisible(b);
    });

    return hasVisibleProgress || hasActiveStopButton;
  }

  function syncStartupState(generating) {
    if (startupSyncCount >= STARTUP_SYNC_LOOPS) return false;

    startupSyncCount += 1;
    wasGenerating = generating;

    if (generating && !generationStartTime) {
      generationStartTime = Date.now();
    }

    if (!generating) {
      generationStartTime = null;
    }

    updateElapsedLabel(generating);
    updateButtonState();
    updateSoundButtonState();

    return true;
  }

  function loop() {
    try {
      const generating = isGenerating();
      const now = Date.now();

      if (syncStartupState(generating)) {
        return;
      }

      if (!wasGenerating && generating) {
        generationStartTime = Date.now();
      }

      if (wasGenerating && !generating) {
        // Do not notify immediately after tab switching.
        // Keep generationStartTime intact here so the real finish notification still has duration.
        if (now - lastVisibilityChange >= VISIBILITY_GUARD_MS) {
          notifyDone();
        }
      }

      if (!generating && !wasGenerating) {
        generationStartTime = null;
      }

      wasGenerating = generating;
      updateElapsedLabel(generating);
      updateButtonState();
      updateSoundButtonState();
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
