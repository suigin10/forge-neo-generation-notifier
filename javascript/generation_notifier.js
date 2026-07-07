(() => {
  const EXT_NAME = "Generation Notifier";
  const CHECK_INTERVAL_MS = 1000;
  const NOTIFY_COOLDOWN_MS = 10000;
  const SOUND_STORAGE_KEY = "generation_notifier_sound_enabled";

  // Ignore the first few monitor loops to avoid false notifications during Forge Neo startup.
  // This is state-based, not time-based, so it is more robust across different PCs/browsers.
  const STARTUP_SYNC_LOOPS = 3;

  // Ignore finish detection immediately after a tab visibility change.
  // This prevents duplicate notifications caused by Brave/Chrome re-evaluating the page state.
  const VISIBILITY_GUARD_MS = 3000;

  // Network/progress mode:
  // DOM and gallery changes are too noisy in Forge Neo.
  // Do not notify on /queue/join or /run/predict responses.
  // Notify only on Gradio queue process_completed, or on progress API becoming inactive
  // after it was observed active for this generation.
  const GENERATE_CAPTURE_WINDOW_MS = 10000;
  const PENDING_CAPTURE_TIMEOUT_MS = 20000;
  const PROGRESS_API_RETRY_MS = 15000;
  const PROGRESS_FINISH_CONFIRM_LOOPS = 3;

  let wasGenerating = false;
  let startupSyncCount = 0;
  let lastNotify = 0;
  let lastVisibilityChange = 0;
  let generationStartTime = null;
  let generationCaptureUntil = 0;
  let pendingCaptureStartedAt = 0;
  let activeQueueEventIds = new Set();
  let activeNetworkGeneration = false;
  let seenProgressApiActive = false;
  let progressApiInactiveLoops = 0;
  let progressApiBackoffUntil = 0;
  let networkHooksInstalled = false;
  let loopBusy = false;
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
        new Notification("Generation Notifier test", {
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
    if (document.getElementById("generation-notifier-panel")) return;

    const panel = document.createElement("div");
    panel.id = "generation-notifier-panel";
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
    title.textContent = "Generation Notifier";
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

  function resetGenerationTracking() {
    generationCaptureUntil = 0;
    pendingCaptureStartedAt = 0;
    activeQueueEventIds.clear();
    activeNetworkGeneration = false;
    seenProgressApiActive = false;
    progressApiInactiveLoops = 0;
  }

  function isGenerateButtonTarget(target) {
    const b = target?.closest?.("button");
    if (!b || b.closest("#generation-notifier-panel")) return false;

    if (b.id === "txt2img_generate" || b.id === "img2img_generate") {
      return true;
    }

    const text = (b.textContent || "").trim();

    return /generate|生成/i.test(text) &&
      !/interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(text);
  }

  function armGenerationCapture() {
    // Prepare for a fresh generation attempt.
    resetGenerationTracking();
    generationCaptureUntil = Date.now() + GENERATE_CAPTURE_WINDOW_MS;
    pendingCaptureStartedAt = Date.now();
    generationStartTime = Date.now();

    console.log(`[${EXT_NAME}] armed generation capture`);
    updateElapsedLabel(true);
  }

  document.addEventListener("click", (event) => {
    if (isGenerateButtonTarget(event.target)) {
      armGenerationCapture();
    }
  }, true);

  function getRequestUrl(input) {
    try {
      if (typeof input === "string") return input;
      if (input instanceof URL) return input.toString();
      if (input && typeof input.url === "string") return input.url;
    } catch (e) {
      console.warn(`[${EXT_NAME}] failed to read request URL`, e);
    }

    return "";
  }

  function isArmedForGenerationCapture() {
    return Date.now() <= generationCaptureUntil;
  }

  function beginNetworkGeneration(reason) {
    if (!generationStartTime) {
      generationStartTime = Date.now();
    }

    pendingCaptureStartedAt = 0;
    activeNetworkGeneration = true;
    wasGenerating = true;

    console.log(`[${EXT_NAME}] generation started via ${reason}`);
    updateElapsedLabel(true);
  }

  function completeNetworkGeneration(reason) {
    if (!activeNetworkGeneration && !wasGenerating) return;

    console.log(`[${EXT_NAME}] generation completed via ${reason}`);

    resetGenerationTracking();
    notifyDone();
    wasGenerating = false;
    updateElapsedLabel(false);
  }

  function captureQueueEventId(eventId) {
    if (!eventId) return;

    const id = String(eventId);
    activeQueueEventIds.add(id);
    beginNetworkGeneration(`queue event ${id}`);
  }

  function isQueueJoinUrl(url) {
    return /\/queue\/join(?:\?|$)/.test(url);
  }

  function isQueueDataUrl(url) {
    return /\/queue\/data(?:\?|$)/.test(url);
  }

  function isPredictUrl(url) {
    return /\/run\/predict(?:\?|$)|\/api\/predict(?:\?|$)/.test(url);
  }

  function shouldCaptureQueueJoin(url) {
    return isArmedForGenerationCapture() && isQueueJoinUrl(url);
  }

  function handleQueuePayload(payload) {
    if (!payload || typeof payload !== "object") return;

    const eventId = payload.event_id ? String(payload.event_id) : "";
    const msg = String(payload.msg || "");

    if (!eventId && !msg) return;

    // If queue/join response was missed, capture only real running events.
    // Never capture process_completed by itself because it might belong to an old event.
    if (
      eventId &&
      activeQueueEventIds.size === 0 &&
      (activeNetworkGeneration || isArmedForGenerationCapture()) &&
      /process_starts|process_generating/.test(msg)
    ) {
      captureQueueEventId(eventId);
    }

    if (eventId && activeQueueEventIds.size > 0 && !activeQueueEventIds.has(eventId)) {
      return;
    }

    if (/process_starts|process_generating/.test(msg)) {
      beginNetworkGeneration(`queue ${msg}`);
      return;
    }

    if (msg === "process_completed" && (activeQueueEventIds.size > 0 || activeNetworkGeneration)) {
      completeNetworkGeneration(`queue ${eventId || "unknown event"}`);
    }
  }

  function handleQueueMessageData(rawData) {
    if (!rawData || (!activeNetworkGeneration && !isArmedForGenerationCapture())) return;

    try {
      handleQueuePayload(JSON.parse(String(rawData)));
    } catch {
      // Ignore non-JSON queue messages.
    }
  }

  function handleSseBlock(block) {
    const dataLines = String(block)
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    if (dataLines.length <= 0) return;

    handleQueueMessageData(dataLines.join("\n"));
  }

  async function readQueueDataStream(response) {
    try {
      if (!response?.body?.getReader) {
        const text = await response.text();
        text.split(/\r?\n\r?\n/).forEach(handleSseBlock);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        blocks.forEach(handleSseBlock);
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        handleSseBlock(buffer);
      }
    } catch (e) {
      console.warn(`[${EXT_NAME}] failed to read queue/data stream`, e);
    }
  }

  async function getProgressApiGeneratingState() {
    const now = Date.now();

    if (now < progressApiBackoffUntil) return null;

    try {
      const url = new URL("/sdapi/v1/progress", window.location.origin);
      url.searchParams.set("skip_current_image", "true");

      const res = await fetch(url.toString(), {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        progressApiBackoffUntil = now + PROGRESS_API_RETRY_MS;
        return null;
      }

      const data = await res.json();
      const state = data?.state || {};

      const jobCount = Number(state.job_count || 0);
      const samplingStep = Number(state.sampling_step || 0);
      const samplingSteps = Number(state.sampling_steps || 0);
      const progress = Number(data?.progress || 0);
      const jobText = String(state.job || "").trim();

      return (
        jobCount > 0 ||
        (progress > 0 && progress < 1) ||
        (samplingSteps > 0 && samplingStep < samplingSteps) ||
        (jobText.length > 0 && progress < 1)
      );
    } catch (e) {
      progressApiBackoffUntil = now + PROGRESS_API_RETRY_MS;
      console.warn(`[${EXT_NAME}] progress API unavailable`, e);
      return null;
    }
  }

  async function updateProgressApiFallback() {
    if (!activeNetworkGeneration && !pendingCaptureStartedAt && !isArmedForGenerationCapture()) return;

    const apiGenerating = await getProgressApiGeneratingState();

    if (apiGenerating === true) {
      seenProgressApiActive = true;
      progressApiInactiveLoops = 0;

      if (!activeNetworkGeneration) {
        beginNetworkGeneration("progress API");
      }

      return;
    }

    if (apiGenerating === false && activeNetworkGeneration && seenProgressApiActive) {
      progressApiInactiveLoops += 1;

      if (progressApiInactiveLoops >= PROGRESS_FINISH_CONFIRM_LOOPS) {
        completeNetworkGeneration("progress API");
      }

      return;
    }

    if (apiGenerating === false) {
      progressApiInactiveLoops = 0;
    }
  }

  function installNetworkHooks() {
    if (networkHooksInstalled) return;
    networkHooksInstalled = true;

    const nativeFetch = window.fetch?.bind(window);

    if (nativeFetch) {
      window.fetch = async function(input, init) {
        const url = getRequestUrl(input);
        const captureQueueJoin = shouldCaptureQueueJoin(url);
        const queueData = isQueueDataUrl(url);
        const predictDuringCapture = isArmedForGenerationCapture() && isPredictUrl(url);

        let response;

        try {
          response = await nativeFetch(input, init);
        } catch (e) {
          if (captureQueueJoin || predictDuringCapture) {
            console.warn(`[${EXT_NAME}] captured generation request failed`, e);
          }

          throw e;
        }

        if (queueData) {
          readQueueDataStream(response.clone());
        }

        if (captureQueueJoin) {
          beginNetworkGeneration("queue/join");

          response.clone().json().then((data) => {
            captureQueueEventId(data?.event_id || data?.eventId);
          }).catch((e) => {
            console.warn(`[${EXT_NAME}] failed to parse queue/join response`, e);
          });
        }

        if (predictDuringCapture) {
          // Important:
          // Do NOT complete on /run/predict or /api/predict.
          // In Forge/Gradio this can be only an initial/auxiliary request.
          console.log(`[${EXT_NAME}] predict request observed; waiting for queue completion or progress API finish`);
        }

        return response;
      };
    }

    const NativeEventSource = window.EventSource;

    if (NativeEventSource) {
      const WrappedEventSource = function(url, config) {
        const es = new NativeEventSource(url, config);

        try {
          if (isQueueDataUrl(String(url || ""))) {
            es.addEventListener("message", (event) => {
              handleQueueMessageData(event.data);
            });
          }
        } catch (e) {
          console.warn(`[${EXT_NAME}] failed to attach queue/data listener`, e);
        }

        return es;
      };

      WrappedEventSource.prototype = NativeEventSource.prototype;
      WrappedEventSource.CONNECTING = NativeEventSource.CONNECTING;
      WrappedEventSource.OPEN = NativeEventSource.OPEN;
      WrappedEventSource.CLOSED = NativeEventSource.CLOSED;

      window.EventSource = WrappedEventSource;
    }

    const NativeWebSocket = window.WebSocket;

    if (NativeWebSocket) {
      const WrappedWebSocket = function(url, protocols) {
        const ws = protocols === undefined
          ? new NativeWebSocket(url)
          : new NativeWebSocket(url, protocols);

        try {
          const urlText = String(url || "");

          if (/queue|predict/.test(urlText)) {
            ws.addEventListener("message", (event) => {
              handleQueueMessageData(event.data);
            });
          }
        } catch (e) {
          console.warn(`[${EXT_NAME}] failed to attach websocket listener`, e);
        }

        return ws;
      };

      WrappedWebSocket.prototype = NativeWebSocket.prototype;
      WrappedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
      WrappedWebSocket.OPEN = NativeWebSocket.OPEN;
      WrappedWebSocket.CLOSING = NativeWebSocket.CLOSING;
      WrappedWebSocket.CLOSED = NativeWebSocket.CLOSED;

      window.WebSocket = WrappedWebSocket;
    }

    console.log(`[${EXT_NAME}] network hooks installed`);
  }

  function isGenerating() {
    return activeNetworkGeneration;
  }

  function syncStartupState(generating) {
    if (startupSyncCount >= STARTUP_SYNC_LOOPS) return false;

    startupSyncCount += 1;

    // Network/progress mode should not infer startup generation state from the DOM.
    updateElapsedLabel(generating);
    updateButtonState();
    updateSoundButtonState();

    return true;
  }

  async function loop() {
    if (loopBusy) return;

    loopBusy = true;

    try {
      const generating = isGenerating();
      const now = Date.now();

      if (syncStartupState(generating)) {
        return;
      }

      await updateProgressApiFallback();

      // If Generate was clicked but no generation request/progress was captured,
      // reset the pending state. Do not notify: this is probably validation failure or UI-only activity.
      if (!activeNetworkGeneration && pendingCaptureStartedAt > 0 && now - pendingCaptureStartedAt > PENDING_CAPTURE_TIMEOUT_MS) {
        console.warn(`[${EXT_NAME}] generation capture timed out`);
        resetGenerationTracking();
        generationStartTime = null;
      }

      updateElapsedLabel(activeNetworkGeneration || pendingCaptureStartedAt > 0);
      updateButtonState();
      updateSoundButtonState();
    } catch (e) {
      console.warn(`[${EXT_NAME}] loop failed`, e);
    } finally {
      loopBusy = false;
    }
  }

  function init() {
    installNetworkHooks();
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
