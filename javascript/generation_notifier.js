(() => {
  const EXT_NAME = "Generation Notifier";
  const SOUND_STORAGE_KEY = "generation_notifier_sound_enabled";

  const CHECK_INTERVAL_MS = 1000;
  const STARTUP_SYNC_LOOPS = 3;
  const NOTIFY_COOLDOWN_MS = 2500;

  const GENERATE_CAPTURE_WINDOW_MS = 12000;
  const PENDING_CAPTURE_TIMEOUT_MS = 20000;
  const PROGRESS_API_RETRY_MS = 15000;
  const PROGRESS_FINISH_CONFIRM_LOOPS = 2;
  const DOM_FINISH_CONFIRM_LOOPS = 3;

  const MIN_QUEUE_COMPLETION_AGE_MS = 2500;
  const MIN_WEAK_QUEUE_COMPLETION_AGE_MS = 6000;
  const MIN_DOM_COMPLETION_AGE_MS = 4500;

  const QUEUE_COMPLETION_CONFIRM_DELAY_MS = 700;
  const DEFERRED_COMPLETION_FALLBACK_MS = 2500;
  const TRUSTED_QUEUE_GUARD_BYPASS_MS = 1200;
  const DISCARD_COMPLETION_AFTER_START_MS = 3500;
  const IGNORED_EVENT_ID_TTL_MS = 30000;

  const GENERATE_PRESS_LOCK_MS = 1200;
  const INTERRUPT_PRESS_LOCK_MS = 800;
  const GENERATE_WHILE_RUNNING_IGNORE_MS = 1500;
  const READY_DOM_FINISH_CONFIRM_LOOPS = 2;

  const VISIBILITY_GUARD_MS = 3000;
  const GENERIC_UI_GUARD_MS = 6500;
  const IMAGE_PREVIEW_GUARD_MS = 4500;
  const IMAGE_PREVIEW_MODAL_CLOSE_GUARD_MS = 3000;
  const RECENT_PROGRESS_ACTIVE_BLOCK_MS = 2500;

  const INTERRUPT_SETTLE_GRACE_MS = 1000;
  const INTERRUPT_FORCE_FINISH_MS = 10000;
  const INTERRUPT_RECENT_PROGRESS_BLOCK_MS = 1800;

  const STATE_IDLE = "idle";
  const STATE_PENDING = "pending";
  const STATE_RUNNING = "running";
  const STATE_STOPPING = "stopping";

  let state = STATE_IDLE;
  let runId = 0;
  let startupSyncCount = 0;
  let loopBusy = false;
  let networkHooksInstalled = false;
  let notificationBridgeInstalled = false;
  let ownNotificationDepth = 0;
  let lastExternalNotificationSignal = 0;

  let generationStartTime = null;
  let pendingStartedAt = 0;
  let captureUntil = 0;
  let stopRequestedAt = 0;
  let activeQueueEventIds = new Set();
  let ignoredQueueEventIds = new Map();
  let discardCompletionsUntil = 0;

  let seenQueueRunning = false;
  let seenProgressActive = false;
  let seenDomRunning = false;
  let hadRunningEvidence = false;
  let progressInactiveLoops = 0;
  let domInactiveLoops = 0;
  let lastProgressActiveAt = 0;
  let lastDomRunningAt = 0;
  let progressApiBackoffUntil = 0;

  let lastNotify = 0;
  let lastVisibilityChange = 0;
  let lastUserInteractionAt = 0;
  let lastImagePreviewInteraction = 0;
  let lastImagePreviewModalSeenAt = 0;
  let pendingCompletion = null;
  let generatePressLockedUntil = 0;
  let interruptPressLockedUntil = 0;
  let lastGeneratePressAt = 0;
  let readyDomInactiveLoops = 0;

  let button = null;
  let soundButton = null;
  let statusLabel = null;
  let elapsedLabel = null;
  let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) !== "false";

  document.addEventListener("visibilitychange", () => {
    lastVisibilityChange = Date.now();
  });

  function log(message, extra) {
    if (extra !== undefined) {
      console.log(`[${EXT_NAME}] ${message}`, extra);
      return;
    }

    console.log(`[${EXT_NAME}] ${message}`);
  }

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

    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  function updateElapsedLabel(show) {
    if (!elapsedLabel) return;

    if (show && generationStartTime) {
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

    if (soundEnabled) playSound();
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

  function createBrowserNotification(title, options) {
    if (!isNotificationSupported() || Notification.permission !== "granted") return null;

    ownNotificationDepth += 1;

    try {
      return new Notification(title, options);
    } finally {
      window.setTimeout(() => {
        ownNotificationDepth = Math.max(0, ownNotificationDepth - 1);
      }, 0);
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
        createBrowserNotification("Generation Notifier test", {
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

  function notifyDone(startTime, reason) {
    const now = Date.now();

    if (now - lastNotify < NOTIFY_COOLDOWN_MS) {
      log(`notification skipped by cooldown (${reason})`);
      return;
    }

    lastNotify = now;

    const durationText = startTime
      ? `Generation time: ${formatDuration(now - startTime)}`
      : "Generation time: Unknown";

    try {
      if (isNotificationSupported() && Notification.permission === "granted") {
        createBrowserNotification("Generation complete", {
          body: `Forge Neo generation has finished.\n${durationText}`,
          silent: !soundEnabled,
        });
      } else {
        log("generation finished, but notification is not granted");
      }
    } catch (e) {
      console.warn(`[${EXT_NAME}] notification failed`, e);
    }

    playSound();
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function cleanupIgnoredQueueEventIds() {
    const now = Date.now();

    for (const [id, expiresAt] of ignoredQueueEventIds.entries()) {
      if (expiresAt <= now) ignoredQueueEventIds.delete(id);
    }
  }

  function retireActiveQueueEventIds(reason) {
    const expiresAt = Date.now() + IGNORED_EVENT_ID_TTL_MS;

    for (const id of activeQueueEventIds) {
      ignoredQueueEventIds.set(id, expiresAt);
    }

    if (activeQueueEventIds.size > 0) {
      log(`retired ${activeQueueEventIds.size} old queue event_id(s) via ${reason}`);
    }

    activeQueueEventIds.clear();
  }

  function resetUiGuardsForNewRun() {
    lastUserInteractionAt = 0;
    lastImagePreviewInteraction = 0;
    lastImagePreviewModalSeenAt = 0;
    pendingCompletion = null;
  }

  function resetRunFields(options = {}) {
    if (options.retireQueueEvents) {
      retireActiveQueueEventIds(options.reason || "reset");
    } else {
      activeQueueEventIds.clear();
    }

    cleanupIgnoredQueueEventIds();
    seenQueueRunning = false;
    seenProgressActive = false;
    seenDomRunning = false;
    hadRunningEvidence = false;
    progressInactiveLoops = 0;
    domInactiveLoops = 0;
    readyDomInactiveLoops = 0;
    lastProgressActiveAt = 0;
    lastDomRunningAt = 0;
    stopRequestedAt = 0;
    pendingCompletion = null;
  }

  function resetToIdle(reason) {
    log(`reset to idle via ${reason}`);
    runId += 1;
    state = STATE_IDLE;
    generationStartTime = null;
    pendingStartedAt = 0;
    captureUntil = 0;
    resetRunFields();
    discardCompletionsUntil = 0;
    resetUiGuardsForNewRun();
    updateElapsedLabel(false);
  }

  function startNewRun(reason) {
    const now = Date.now();

    // Repeated Generate clicks before Gradio has emitted queue/progress signals
    // must not create a new run generation. If we reset the run here, the real
    // queue event_id may be lost and the later process_completed can be ignored.
    if (state === STATE_PENDING && pendingStartedAt && now - pendingStartedAt < PENDING_CAPTURE_TIMEOUT_MS) {
      log(`ignored repeated Generate while pending via ${reason} (run ${runId})`);
      return;
    }

    // If a real generation is already visible, a Generate-looking event is
    // usually the reused Gradio button before its label/DOM has settled.
    if ((state === STATE_RUNNING || state === STATE_STOPPING) && looksGeneratingFromDom()) {
      log(`ignored Generate while generation UI is active via ${reason} (run ${runId})`);
      return;
    }

    // A rapid Interrupt -> Generate can leave old queue/data or delayed
    // completion callbacks in flight. Bump runId first, retire old event_id(s),
    // and ignore completion-like messages for a short start window.
    runId += 1;
    resetRunFields({ retireQueueEvents: true, reason });
    resetUiGuardsForNewRun();

    state = STATE_PENDING;
    readyDomInactiveLoops = 0;
    generationStartTime = null;
    pendingStartedAt = now;
    captureUntil = now + GENERATE_CAPTURE_WINDOW_MS;
    discardCompletionsUntil = now + DISCARD_COMPLETION_AFTER_START_MS;

    log(`new generation armed via ${reason} (run ${runId})`);
    updateElapsedLabel(false);
  }

  function markRunning(reason) {
    if (state === STATE_IDLE && Date.now() > captureUntil) return;

    if (!generationStartTime) generationStartTime = Date.now();

    if (state !== STATE_RUNNING) {
      log(`generation running via ${reason} (run ${runId})`);
    }

    state = STATE_RUNNING;
    pendingStartedAt = 0;
    captureUntil = 0;
    pendingCompletion = null;

    if (/queue|process_starts|process_generating/i.test(String(reason || ""))) {
      seenQueueRunning = true;
    }

    hadRunningEvidence = true;
    updateElapsedLabel(true);
  }

  function requestStop(reason) {
    if (state === STATE_IDLE) return;

    if (state === STATE_STOPPING && stopRequestedAt > 0) {
      log(`ignored duplicate interrupt/stop via ${reason} (run ${runId})`);
      return;
    }

    state = STATE_STOPPING;
    stopRequestedAt = Date.now();
    pendingStartedAt = 0;
    captureUntil = 0;
    pendingCompletion = null;
    domInactiveLoops = 0;
    readyDomInactiveLoops = 0;
    progressInactiveLoops = 0;

    if (!generationStartTime) generationStartTime = Date.now();

    log(`interrupt/stop requested via ${reason} (run ${runId})`);
    updateElapsedLabel(true);
  }

  function finishRun(reason, options = {}) {
    if (state === STATE_IDLE) return;

    const startTime = generationStartTime;
    log(`generation finished via ${reason} (run ${runId})`);

    runId += 1;
    state = STATE_IDLE;
    generationStartTime = null;
    pendingStartedAt = 0;
    captureUntil = 0;
    resetRunFields({ retireQueueEvents: true, reason: `finish ${reason}` });
    discardCompletionsUntil = 0;
    resetUiGuardsForNewRun();
    updateElapsedLabel(false);

    if (options.notify !== false) {
      notifyDone(startTime, reason);
    }
  }

  function getGenerationAgeMs() {
    return generationStartTime ? Date.now() - generationStartTime : 0;
  }

  function getActionButton(target) {
    const b = target?.closest?.("button, input[type='button'], input[type='submit']");
    if (!b || b.closest("#generation-notifier-panel")) return null;
    return b;
  }

  function getButtonActionText(b) {
    if (!b) return "";

    return [
      b.textContent || "",
      b.value || "",
      b.getAttribute?.("aria-label") || "",
      b.getAttribute?.("title") || "",
      b.id || ""
    ].join(" ");
  }

  function isInterruptActionText(text) {
    return /interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(String(text || ""));
  }

  function isGenerateActionText(text) {
    return /generate|生成/i.test(String(text || ""));
  }

  function isGenerateButtonTarget(target) {
    const b = getActionButton(target);
    if (!b || b.disabled || !isVisible(b)) return false;

    const text = getButtonActionText(b);

    // Some Gradio builds keep txt2img_generate / img2img_generate as the same
    // element while changing its label to Interrupt / Stop. In that case the
    // button must be treated as an interrupt, not as a new Generate press.
    if (isInterruptActionText(text)) return false;

    if (b.id === "txt2img_generate" || b.id === "img2img_generate") {
      return true;
    }

    return isGenerateActionText(text);
  }

  function isInterruptButtonTarget(target) {
    const b = getActionButton(target);
    if (!b || b.disabled || !isVisible(b)) return false;

    return isInterruptActionText(getButtonActionText(b));
  }

  function acceptGeneratePress(reason) {
    const now = Date.now();

    // One physical click usually produces pointerdown and click.
    // Only collapse those very-near duplicate edges. Do not use a long lock here:
    // long Generate locks are exactly what can leave an old timer alive during
    // rapid Interrupt -> Generate operations.
    if (now - lastGeneratePressAt < 180) {
      log(`ignored duplicate Generate edge ${reason}`);
      return false;
    }

    // If an actual interrupt/stop control is visible, a Generate-looking event
    // during the same moment is probably the reused Gradio button before its
    // label/DOM settled. Do not create a new run from that false edge.
    if (state !== STATE_IDLE && looksGeneratingFromDom() && !looksReadyForGenerationFromDom()) {
      log(`ignored Generate ${reason} while interrupt/stop UI is visible`);
      lastGeneratePressAt = now;
      return false;
    }

    lastGeneratePressAt = now;
    generatePressLockedUntil = now + 180;
    return true;
  }

  function acceptInterruptPress(reason) {
    const now = Date.now();

    if (now < interruptPressLockedUntil) {
      log(`ignored duplicate interrupt ${reason}`);
      return false;
    }

    interruptPressLockedUntil = now + INTERRUPT_PRESS_LOCK_MS;
    return true;
  }

  function isImagePreviewTarget(target) {
    if (!target?.closest || target.closest("#generation-notifier-panel")) return false;

    let el = target.closest("img, canvas");

    if (!el) {
      const container = target.closest([
        '[class*="gallery"]',
        '[class*="Gallery"]',
        '[class*="image"]',
        '[class*="Image"]',
        '[data-testid*="gallery"]',
        '[data-testid*="image"]'
      ].join(","));

      if (container && !container.closest("#generation-notifier-panel")) {
        el = container.querySelector("img, canvas") || container;
      }
    }

    if (!el) return false;

    const rect = el.getBoundingClientRect();
    return rect.width >= 24 && rect.height >= 24;
  }

  function elementLooksVisible(el) {
    if (!el || !(el instanceof Element)) return false;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }

    const rect = el.getBoundingClientRect();
    return rect.width >= 120 && rect.height >= 120;
  }

  function isImagePreviewModalOpen() {
    const selectors = [
      "#lightboxModal",
      "#modalImage",
      ".lightboxModal",
      ".lightbox",
      ".gradio-modal",
      ".modal",
      ".modal-container",
      ".image-preview",
      ".fullscreen",
      '[role="dialog"]',
      '[class*="lightbox"]',
      '[class*="Lightbox"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[class*="preview"]',
      '[class*="Preview"]',
      '[class*="fullscreen"]',
      '[class*="Fullscreen"]'
    ];

    const candidates = document.querySelectorAll(selectors.join(","));

    for (const el of candidates) {
      if (!elementLooksVisible(el)) continue;

      const rect = el.getBoundingClientRect();
      const hasLargeMedia = Array.from(el.querySelectorAll("img, canvas")).some((media) => {
        const mediaRect = media.getBoundingClientRect();
        return mediaRect.width >= 120 && mediaRect.height >= 120;
      });

      const coversViewport = rect.width >= window.innerWidth * 0.35 &&
        rect.height >= window.innerHeight * 0.35;

      if (hasLargeMedia && coversViewport) return true;
    }

    return false;
  }

  function markUserInteraction(reason) {
    if (state === STATE_IDLE) return;

    lastUserInteractionAt = Date.now();
    log(`UI guard armed: ${reason}`);
  }

  function markImagePreviewInteraction() {
    if (state === STATE_IDLE) return;

    lastImagePreviewInteraction = Date.now();
    lastUserInteractionAt = lastImagePreviewInteraction;
    log("image preview guard armed");
  }

  function isImagePreviewGuardActive() {
    const now = Date.now();

    if (isImagePreviewModalOpen()) {
      lastImagePreviewModalSeenAt = now;
      return true;
    }

    return now - lastImagePreviewInteraction < IMAGE_PREVIEW_GUARD_MS ||
      now - lastImagePreviewModalSeenAt < IMAGE_PREVIEW_MODAL_CLOSE_GUARD_MS;
  }

  function isCompletionGuardActive() {
    const now = Date.now();
    return now - lastVisibilityChange < VISIBILITY_GUARD_MS ||
      now - lastUserInteractionAt < GENERIC_UI_GUARD_MS ||
      isImagePreviewGuardActive();
  }

  function looksReadyForGenerationFromDom() {
    const buttons = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']"));
    let hasGenerate = false;
    let hasInterrupt = false;

    for (const b of buttons) {
      if (!isVisible(b) || b.disabled) continue;
      if (b.closest("#generation-notifier-panel")) continue;

      const text = getButtonActionText(b);

      if (isInterruptActionText(text)) {
        hasInterrupt = true;
        break;
      }

      if (isGenerateActionText(text) || b.id === "txt2img_generate" || b.id === "img2img_generate") {
        hasGenerate = true;
      }
    }

    return hasGenerate && !hasInterrupt;
  }

  function looksGeneratingFromDom() {
    const buttons = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']"));

    return buttons.some((b) => {
      if (!isVisible(b) || b.disabled) return false;
      if (b.closest("#generation-notifier-panel")) return false;

      const text = [
        b.textContent || "",
        b.value || "",
        b.getAttribute?.("aria-label") || "",
        b.getAttribute?.("title") || "",
        b.id || ""
      ].join(" ");

      return /interrupt|skip|stop|cancel|中断|スキップ|停止|キャンセル/i.test(text);
    });
  }

  document.addEventListener("pointerdown", (event) => {
    // Interrupt/Stop must win over Generate. Some UIs reuse the generate
    // button element/id while changing only the label during generation.
    if (isInterruptButtonTarget(event.target)) {
      if (acceptInterruptPress("pointerdown")) requestStop("interrupt pointerdown");
      return;
    }

    if (isGenerateButtonTarget(event.target)) {
      if (acceptGeneratePress("pointerdown")) startNewRun("generate pointerdown");
      return;
    }

    if (state !== STATE_IDLE) {
      if (isImagePreviewTarget(event.target)) {
        markImagePreviewInteraction();
      } else if (!event.target?.closest?.("#generation-notifier-panel")) {
        markUserInteraction("pointerdown");
      }
    }
  }, true);

  document.addEventListener("click", (event) => {
    // Interrupt/Stop must win over Generate. Some UIs reuse the generate
    // button element/id while changing only the label during generation.
    if (isInterruptButtonTarget(event.target)) {
      if (acceptInterruptPress("click")) requestStop("interrupt click");
      return;
    }

    if (isGenerateButtonTarget(event.target)) {
      if (acceptGeneratePress("click")) startNewRun("generate click");
      return;
    }

    if (state !== STATE_IDLE) {
      if (isImagePreviewTarget(event.target)) {
        markImagePreviewInteraction();
      } else if (!event.target?.closest?.("#generation-notifier-panel")) {
        markUserInteraction("click");
      }
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
    return Date.now() <= captureUntil;
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

  function captureQueueEventId(eventId) {
    if (!eventId) return;

    const id = String(eventId);
    activeQueueEventIds.add(id);
    markRunning(`queue event ${id}`);
  }

  function deferCompletion(reason, trustedQueue) {
    if (state === STATE_IDLE) return;

    pendingCompletion = {
      runId,
      reason,
      trustedQueue: Boolean(trustedQueue),
      at: Date.now(),
    };

    log(`deferred completion via ${reason}${trustedQueue ? " (trusted queue)" : ""}`);
  }

  function requestCompletion(reason, options = {}) {
    if (state !== STATE_RUNNING && state !== STATE_STOPPING) return;

    const age = getGenerationAgeMs();
    const trustedQueue = Boolean(options.trustedQueue);
    const knownEvent = Boolean(options.knownEvent);
    const hasRunningEvidence = hadRunningEvidence || seenQueueRunning || seenProgressActive || seenDomRunning;

    if (!knownEvent && Date.now() < discardCompletionsUntil) {
      log(`ignored completion during new-run start window via ${reason}`);
      return;
    }

    if (age < MIN_QUEUE_COMPLETION_AGE_MS && !hasRunningEvidence) {
      log(`ignored too-early completion via ${reason} (${age}ms)`);
      return;
    }

    if (!knownEvent && age < MIN_QUEUE_COMPLETION_AGE_MS) {
      log(`ignored untrusted too-early completion via ${reason} (${age}ms)`);
      return;
    }

    if (!knownEvent && !hasRunningEvidence && age < MIN_WEAK_QUEUE_COMPLETION_AGE_MS) {
      log(`ignored weak early completion via ${reason} (${age}ms)`);
      return;
    }

    // UI interaction during generation can emit unrelated completion-like queue messages.
    // If the completion is not tied to the captured event_id, do not store it for later.
    // Progress API / DOM transition will still finish the run when it really ends.
    if (isCompletionGuardActive() && !knownEvent) {
      log(`ignored untrusted completion during UI guard via ${reason}`);
      return;
    }

    if (isCompletionGuardActive() && !trustedQueue && !knownEvent) {
      deferCompletion(reason, false);
      return;
    }

    const token = runId;

    window.setTimeout(async () => {
      if (runId !== token) return;
      if (state !== STATE_RUNNING && state !== STATE_STOPPING) return;

      const apiGenerating = await getProgressApiGeneratingState();

      if (apiGenerating === true) {
        seenProgressActive = true;
        hadRunningEvidence = true;
        lastProgressActiveAt = Date.now();
        progressInactiveLoops = 0;
        deferCompletion(reason, trustedQueue || knownEvent);
        return;
      }

      if (isCompletionGuardActive() && !trustedQueue && !knownEvent) {
        log(`completion confirmation blocked by UI guard via ${reason}`);
        return;
      }

      finishRun(reason);
    }, QUEUE_COMPLETION_CONFIRM_DELAY_MS);
  }

  function flushPendingCompletionIfSafe() {
    if (!pendingCompletion || pendingCompletion.runId !== runId) return;
    if (state !== STATE_RUNNING && state !== STATE_STOPPING) return;

    const age = Date.now() - pendingCompletion.at;
    const trusted = Boolean(pendingCompletion.trustedQueue);

    if (isCompletionGuardActive() && !trusted) return;
    if (isCompletionGuardActive() && trusted && age < TRUSTED_QUEUE_GUARD_BYPASS_MS) return;

    if (seenProgressActive && progressInactiveLoops < PROGRESS_FINISH_CONFIRM_LOOPS && !trusted) {
      return;
    }

    if (trusted || age >= DEFERRED_COMPLETION_FALLBACK_MS) {
      const reason = pendingCompletion.reason;
      pendingCompletion = null;
      finishRun(`deferred ${reason}`);
    }
  }

  function handleQueuePayload(payload) {
    if (!payload || typeof payload !== "object") return;

    const eventId = payload.event_id ? String(payload.event_id) : "";
    const msg = String(payload.msg || "");

    if (!eventId && !msg) return;

    cleanupIgnoredQueueEventIds();

    if (eventId && ignoredQueueEventIds.has(eventId)) {
      log(`ignored retired queue event ${eventId} (${msg})`);
      return;
    }

    if (msg === "process_completed" && Date.now() < discardCompletionsUntil) {
      const knownEarlyEvent = Boolean(eventId && activeQueueEventIds.has(eventId));
      const hasRunningEvidence = hadRunningEvidence || seenQueueRunning || seenProgressActive || seenDomRunning;

      if (!knownEarlyEvent || !hasRunningEvidence) {
        log(`discarded completion during new-run start window${eventId ? ` (${eventId})` : ""}`);
        return;
      }
    }

    if (eventId && activeQueueEventIds.size === 0 && (state !== STATE_IDLE || isArmedForGenerationCapture()) && /process_starts|process_generating/.test(msg)) {
      captureQueueEventId(eventId);
    }

    const eventIdIsDifferentFromActive =
      Boolean(eventId && activeQueueEventIds.size > 0 && !activeQueueEventIds.has(eventId));

    if (eventIdIsDifferentFromActive && msg !== "process_completed") {
      return;
    }

    if (/process_starts|process_generating/.test(msg)) {
      markRunning(`queue ${msg}`);
      return;
    }

    if (msg === "process_completed") {
      if (state !== STATE_RUNNING && state !== STATE_STOPPING) return;

      const knownEvent = Boolean(eventId && activeQueueEventIds.has(eventId));
      const mismatchedEvent = Boolean(eventId && activeQueueEventIds.size > 0 && !activeQueueEventIds.has(eventId));

      // Rapid Generate / Interrupt operations can make the stored event_id stale.
      // If this run has already shown real running evidence and enough time has
      // passed, treat a mismatched process_completed as an untrusted but usable
      // completion signal instead of dropping it forever.
      if (mismatchedEvent) {
        const age = getGenerationAgeMs();
        const hasRunningEvidence = hadRunningEvidence || seenQueueRunning || seenProgressActive || seenDomRunning;

        if (!hasRunningEvidence || age < MIN_WEAK_QUEUE_COMPLETION_AGE_MS) {
          log(`ignored mismatched early completion ${eventId} (${age}ms)`);
          return;
        }

        log(`accepted mismatched completion as fallback ${eventId} (${age}ms)`);
      }

      requestCompletion(eventId ? `queue ${eventId}` : "queue process_completed", {
        trustedQueue: knownEvent,
        knownEvent,
      });
    }
  }

  function handleQueueMessageData(rawData) {
    if (!rawData || (state === STATE_IDLE && !isArmedForGenerationCapture())) return;

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
      if (buffer.trim()) handleSseBlock(buffer);
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
      const stateData = data?.state || {};

      const jobCount = Number(stateData.job_count || 0);
      const samplingStep = Number(stateData.sampling_step || 0);
      const samplingSteps = Number(stateData.sampling_steps || 0);
      const progress = Number(data?.progress || 0);
      const jobText = String(stateData.job || "").trim();

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

  async function updateProgressApi() {
    if (state === STATE_IDLE) return;

    const apiGenerating = await getProgressApiGeneratingState();

    if (apiGenerating === true) {
      seenProgressActive = true;
      hadRunningEvidence = true;
      lastProgressActiveAt = Date.now();
      progressInactiveLoops = 0;
      pendingCompletion = null;

      if (state === STATE_PENDING || state === STATE_RUNNING) {
        markRunning("progress API");
      }

      // In STOPPING, active progress means the stop has not settled yet.
      return;
    }

    if (apiGenerating === false) {
      if (state === STATE_STOPPING) {
        if (Date.now() - stopRequestedAt >= INTERRUPT_SETTLE_GRACE_MS) {
          finishRun("interrupt/stop progress API inactive");
        }
        return;
      }

      if (state === STATE_RUNNING && seenProgressActive) {
        progressInactiveLoops += 1;

        if (progressInactiveLoops >= PROGRESS_FINISH_CONFIRM_LOOPS && !isCompletionGuardActive()) {
          finishRun("progress API inactive");
        }
      }
    }
  }

  function updateDomFallback() {
    if (state === STATE_IDLE) return;

    const now = Date.now();
    const domGenerating = looksGeneratingFromDom();

    if (domGenerating) {
      readyDomInactiveLoops = 0;
      seenDomRunning = true;
      hadRunningEvidence = true;
      lastDomRunningAt = now;
      domInactiveLoops = 0;

      if (state === STATE_PENDING || state === STATE_RUNNING) {
        markRunning("DOM stop button");
      }

      return;
    }

    const readyForNewGeneration = looksReadyForGenerationFromDom();

    if (readyForNewGeneration && state === STATE_STOPPING && stopRequestedAt > 0) {
      const stopAge = now - stopRequestedAt;

      if (stopAge >= INTERRUPT_SETTLE_GRACE_MS && now - lastProgressActiveAt >= INTERRUPT_RECENT_PROGRESS_BLOCK_MS) {
        readyDomInactiveLoops += 1;

        if (readyDomInactiveLoops >= READY_DOM_FINISH_CONFIRM_LOOPS) {
          finishRun("interrupt/stop ready DOM fallback");
        }
      }

      return;
    }

    if (state === STATE_STOPPING && stopRequestedAt > 0) {
      const stopAge = now - stopRequestedAt;

      if (stopAge < INTERRUPT_SETTLE_GRACE_MS) return;
      if (now - lastProgressActiveAt < INTERRUPT_RECENT_PROGRESS_BLOCK_MS) return;

      // A rapid Interrupt -> Generate should have created a new run already.
      // If it did not, do not keep the old timer forever.
      if (stopAge >= INTERRUPT_FORCE_FINISH_MS || seenDomRunning || !seenProgressActive) {
        finishRun("interrupt/stop DOM inactive");
      }

      return;
    }

    if (state !== STATE_RUNNING) return;

    if (readyForNewGeneration) {
      const age = getGenerationAgeMs();
      if (hadRunningEvidence && age >= MIN_DOM_COMPLETION_AGE_MS && !isCompletionGuardActive()) {
        readyDomInactiveLoops += 1;

        if (readyDomInactiveLoops >= READY_DOM_FINISH_CONFIRM_LOOPS) {
          finishRun("ready DOM fallback");
        }
      } else {
        readyDomInactiveLoops = 0;
      }
      return;
    }

    // If the user clicked tabs/panels/image preview after the last visible Stop button,
    // the Stop button may simply be hidden by the current UI. Do not use DOM fallback
    // until we see the Stop button again, or until queue/progress confirms completion.
    if (generationStartTime && lastUserInteractionAt > generationStartTime && lastUserInteractionAt > lastDomRunningAt) {
      domInactiveLoops = 0;
      return;
    }

    if (isCompletionGuardActive()) {
      domInactiveLoops = 0;
      return;
    }

    if (now - lastProgressActiveAt < RECENT_PROGRESS_ACTIVE_BLOCK_MS) {
      domInactiveLoops = 0;
      return;
    }

    const age = getGenerationAgeMs();

    if (!hadRunningEvidence || age < MIN_DOM_COMPLETION_AGE_MS) {
      domInactiveLoops = 0;
      return;
    }

    domInactiveLoops += 1;

    if (domInactiveLoops >= DOM_FINISH_CONFIRM_LOOPS) {
      finishRun("DOM inactive fallback");
    }
  }

  function updatePendingTimeout() {
    if (state !== STATE_PENDING || !pendingStartedAt) return;

    if (Date.now() - pendingStartedAt > PENDING_CAPTURE_TIMEOUT_MS) {
      resetToIdle("generation capture timeout");
    }
  }

  function installNetworkHooks() {
    if (networkHooksInstalled) return;
    networkHooksInstalled = true;

    const nativeFetch = window.fetch?.bind(window);

    if (nativeFetch) {
      window.fetch = async function(input, init) {
        const url = getRequestUrl(input);
        const queueJoin = isQueueJoinUrl(url);
        const queueData = isQueueDataUrl(url);
        const predict = isPredictUrl(url);
        const shouldCapture = isArmedForGenerationCapture();

        let response;

        try {
          response = await nativeFetch(input, init);
        } catch (e) {
          if (shouldCapture && (queueJoin || predict)) {
            console.warn(`[${EXT_NAME}] captured generation request failed`, e);
          }
          throw e;
        }

        if (queueData) {
          readQueueDataStream(response.clone());
        }

        if (queueJoin && shouldCapture) {
          markRunning("queue/join");

          response.clone().json().then((data) => {
            captureQueueEventId(data?.event_id || data?.eventId);
          }).catch((e) => {
            console.warn(`[${EXT_NAME}] failed to parse queue/join response`, e);
          });
        }

        if (predict && shouldCapture) {
          log("predict request observed; waiting for queue/progress/DOM finish");
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

    log("network hooks installed");
  }

  function isOwnNotifierNotification(title) {
    const t = String(title || "");
    return t === "Generation complete" ||
      t === "Generation Notifier test" ||
      /generation notifier/i.test(t);
  }

  function handleExternalBrowserNotification(title, options) {
    if (ownNotificationDepth > 0) return;
    if (isOwnNotifierNotification(title)) return;
    if (state === STATE_IDLE) return;

    const now = Date.now();
    if (now - lastExternalNotificationSignal < 800) return;
    lastExternalNotificationSignal = now;

    log("external browser notification detected; treating current run as finished", {
      title: String(title || ""),
      body: String(options?.body || ""),
      state,
      runId,
    });

    finishRun("external browser notification", { notify: false });
  }

  function installNotificationBridge() {
    if (notificationBridgeInstalled) return;
    if (!isNotificationSupported()) return;

    notificationBridgeInstalled = true;

    try {
      const NativeNotification = window.Notification;

      if (!NativeNotification || NativeNotification.__generationNotifierBridge) return;

      const WrappedNotification = new Proxy(NativeNotification, {
        construct(target, args) {
          const [title, options] = args;
          const instance = Reflect.construct(target, args, target);

          try {
            handleExternalBrowserNotification(title, options || {});
          } catch (e) {
            console.warn(`[${EXT_NAME}] external notification bridge failed`, e);
          }

          return instance;
        },
        get(target, prop, receiver) {
          if (prop === "__generationNotifierBridge") return true;

          const value = Reflect.get(target, prop, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, prop, value, receiver) {
          return Reflect.set(target, prop, value, receiver);
        },
      });

      window.Notification = WrappedNotification;
      log("notification bridge installed");
    } catch (e) {
      console.warn(`[${EXT_NAME}] failed to install notification bridge`, e);
    }
  }

  function syncStartupState() {
    if (startupSyncCount >= STARTUP_SYNC_LOOPS) return false;

    startupSyncCount += 1;
    updateElapsedLabel(false);
    updateButtonState();
    updateSoundButtonState();
    return true;
  }

  async function loop() {
    if (loopBusy) return;
    loopBusy = true;

    try {
      if (syncStartupState()) return;

      await updateProgressApi();
      updateDomFallback();
      flushPendingCompletionIfSafe();
      updatePendingTimeout();

      updateElapsedLabel(state !== STATE_IDLE);
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
    installNotificationBridge();
    createFloatingButton();
    setInterval(loop, CHECK_INTERVAL_MS);
    log("loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
