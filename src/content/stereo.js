class StereoCamera {
  constructor() {
    this.isCapturing = false;
    this.ui = null;
    this.viewfinder = null;
    this.modal = null;
    this.resourcesLoaded = false;
    this.presets = null;
    this.scaleFactor = 1.0;
    this.currentImageData = null;
    this.currentFilename = null;
    this.updateCaptureDimensions();
    this.imageProcessor = new ImageProcessor(
      this.captureWidth,
      this.captureHeight
    );
    this.initPromise = this.initUi();
  }

  updateCaptureDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let baseCaptureHeight = Math.floor(viewportHeight * 0.85);
    let baseCaptureWidth = Math.floor(baseCaptureHeight * 0.75);

    baseCaptureWidth = Math.max(400, baseCaptureWidth);
    baseCaptureHeight = Math.max(500, baseCaptureHeight);

    if (baseCaptureWidth > viewportWidth * 0.9) {
      baseCaptureWidth = Math.floor(viewportWidth * 0.9);
      baseCaptureHeight = Math.floor(baseCaptureWidth / 0.75);
    }

    this.captureWidth = Math.floor(baseCaptureWidth * this.scaleFactor);
    this.captureHeight = Math.floor(baseCaptureHeight * this.scaleFactor);

    if (this.imageProcessor) {
      this.imageProcessor.updateDimensions(
        this.captureWidth,
        this.captureHeight
      );
    }
  }

  async initUi() {
    try {
      await this.loadPresets();
      await this.createFloatingUI();
      this.createViewfinder();
      this.populatePresetOptions();
      this.attachEventListeners();

      const detectedPreset = this.detectPresetFromUrl();
      if (detectedPreset) {
        this.setPresetConfiguration(detectedPreset);
        const presetSelect = document.getElementById("preset-select");
        if (presetSelect) {
          presetSelect.value = detectedPreset;
        }
      }

      this.resourcesLoaded = true;
    } catch (error) {
      this.resourcesLoaded = false;
    }
  }

  async loadPresets() {
    try {
      const presetsUrl = chrome.runtime.getURL("assets/data/presets.json");
      const response = await fetch(presetsUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch presets: ${response.status}`);
      }

      this.presets = await response.json();
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  }

  detectPresetFromUrl() {
    if (!this.presets) {
      return null;
    }

    const currentUrl = window.location.href.toLowerCase();

    for (const [presetKey, preset] of Object.entries(this.presets)) {
      if (preset.urlKeywords && Array.isArray(preset.urlKeywords)) {
        for (const keyword of preset.urlKeywords) {
          if (currentUrl.includes(keyword.toLowerCase())) {
            return presetKey;
          }
        }
      }
    }

    return null;
  }

  populatePresetOptions() {
    const presetSelect = document.getElementById("preset-select");
    if (!presetSelect || !this.presets) {
      return;
    }

    presetSelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Custom";
    presetSelect.appendChild(defaultOption);

    Object.keys(this.presets).forEach((presetKey) => {
      const preset = this.presets[presetKey];
      const option = document.createElement("option");
      option.value = presetKey;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  }

  async createFloatingUI() {
    await this.loadCSS("src/components/floating-ui/floating-ui.css");
    await this.loadCSS("src/components/viewfinder/viewfinder.css");

    const templateUrl = chrome.runtime.getURL(
      "src/components/floating-ui/floating-ui.html"
    );
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch UI template: ${response.status}`);
    }

    const htmlContent = await response.text();

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    this.ui = tempDiv.querySelector("#stereocamera-floating-ui");
    this.modal = tempDiv.querySelector("#stereocamera-modal");

    if (!this.ui) {
      throw new Error("Failed to find UI element in template");
    }

    if (!this.modal) {
      throw new Error("Failed to find modal element in template");
    }

    document.body.appendChild(this.ui);
    document.body.appendChild(this.modal);
  }

  async loadCSS(filename) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = chrome.runtime.getURL(filename);
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  createViewfinder() {
    this.viewfinder = document.createElement("div");
    this.viewfinder.id = "stereocamera-viewfinder";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Viewfinder";
    this.viewfinder.appendChild(label);

    document.body.appendChild(this.viewfinder);
    this.updateViewfinderPosition();

    window.addEventListener("resize", () => {
      this.updateCaptureDimensions();
      this.updateViewfinderPosition();
    });
  }

  updateViewfinderPosition() {
    if (!this.viewfinder) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = (viewportWidth - this.captureWidth) / 2;
    const top = (viewportHeight - this.captureHeight) / 2;

    this.viewfinder.style.left = `${left}px`;
    this.viewfinder.style.top = `${top}px`;
    this.viewfinder.style.width = `${this.captureWidth}px`;
    this.viewfinder.style.height = `${this.captureHeight}px`;
  }

  attachEventListeners() {
    if (!this.ui) {
      return;
    }

    const strafeSlider = document.getElementById("strafe-slider");
    const strafeValue = document.getElementById("strafe-value");
    const rotationSlider = document.getElementById("rotation-slider");
    const rotationValue = document.getElementById("rotation-value");
    const scaleSlider = document.getElementById("scale-slider");
    const scaleValue = document.getElementById("scale-value");
    const strafeMethodSelect = document.getElementById("strafe-method");
    const rotationMethodSelect = document.getElementById("rotation-method");
    const presetSelect = document.getElementById("preset-select");
    const captureBtn = document.getElementById("capture-btn");
    const swapBtn = document.getElementById("swap-btn");
    const closeBtn = document.getElementById("close-btn");

    strafeSlider.addEventListener("input", () => {
      strafeValue.textContent = strafeSlider.value;
      this.setPresetToCustom();
    });

    rotationSlider.addEventListener("input", () => {
      rotationValue.textContent = rotationSlider.value;
      this.setPresetToCustom();
    });

    scaleSlider.addEventListener("input", () => {
      this.scaleFactor = parseFloat(scaleSlider.value);
      scaleValue.textContent = this.scaleFactor.toFixed(2);
      this.updateCaptureDimensions();
      this.updateViewfinderPosition();
      this.setPresetToCustom();
    });

    strafeMethodSelect.addEventListener("change", () => {
      this.strafeMethod = strafeMethodSelect.value;
      this.setPresetToCustom();
    });

    rotationMethodSelect.addEventListener("change", () => {
      this.rotationMethod = rotationMethodSelect.value;
      this.setPresetToCustom();
    });

    presetSelect.addEventListener("change", () => {
      this.setPresetConfiguration(presetSelect.value);
    });

    this.strafeMethod = strafeMethodSelect.value || InputMethod.LEFT_MOUSE_DRAG;
    this.rotationMethod =
      rotationMethodSelect.value || InputMethod.SHIFT_MOUSE_DRAG;
    captureBtn.addEventListener("click", () => {
      this.startCapture();
    });

    swapBtn.addEventListener("click", () => {
      this.swapLeftRight();
    });

    closeBtn.addEventListener("click", () => {
      this.ui.style.display = "none";
      if (this.viewfinder) {
        this.viewfinder.style.display = "none";
      }
    });

    const modalDownloadBtn = document.getElementById("modal-download-btn");
    const modalCancelBtn = document.getElementById("modal-cancel-btn");

    if (modalDownloadBtn) {
      modalDownloadBtn.addEventListener("click", () => {
        this.downloadCurrentImage();
        this.hideModal();
      });
    }

    if (modalCancelBtn) {
      modalCancelBtn.addEventListener("click", () => {
        this.hideModal();
      });
    } // Close modal when clicking outside
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.hideModal();
        }
      });
    }

    // Add keyboard support for modal
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.modal &&
        this.modal.style.display === "flex"
      ) {
        this.hideModal();
      }
    });
  }

  showStatus(message, type = "info") {
    const statusDiv = document.getElementById("status");
    if (!statusDiv) {
      return;
    }

    const colors = {
      info: { bg: "#e3f2fd", color: "#1976d2", border: "#2196f3" },
      success: { bg: "#e8f5e8", color: "#2e7d32", border: "#4caf50" },
      error: { bg: "#ffebee", color: "#c62828", border: "#f44336" },
    };

    const style = colors[type] || colors.info;
    statusDiv.style.display = "block";
    statusDiv.style.backgroundColor = style.bg;
    statusDiv.style.color = style.color;
    statusDiv.style.border = `1px solid ${style.border}`;
    statusDiv.textContent = message;
  }

  findCanvas() {
    const canvases = document.querySelectorAll("canvas");
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 200 && rect.height > 200) {
        return canvas;
      }
    }

    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const iframeCanvases = iframeDoc.querySelectorAll("canvas");
        for (const canvas of iframeCanvases) {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            return canvas;
          }
        }
      }
    }

    return null;
  }

  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      const mainCanvas = this.findCanvas();
      if (!mainCanvas) {
        reject(new Error("Canvas container not found"));
        return;
      }
      // Use Chrome's captureVisibleTab API to take a screenshot
      // This requires the "activeTab" permission in manifest.json
      chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
        if (response && response.dataUrl) {
          resolve(response.dataUrl);
        } else {
          reject(new Error("Failed to capture tab"));
        }
      });
    });
  }

  async startCapture() {
    if (this.isCapturing) {
      this.showStatus("Capture already in progress", "error");
      return;
    }

    this.isCapturing = true;
    const captureBtn = document.getElementById("capture-btn");
    const strafeSlider = document.getElementById("strafe-slider");
    const rotationSlider = document.getElementById("rotation-slider");

    let originalText = "Capture Stereo Image";
    let strafeAmount, rotationAmount;

    if (captureBtn) {
      originalText = captureBtn.textContent;
      captureBtn.disabled = true;
      captureBtn.textContent = "Capturing...";
    }

    if (strafeSlider) {
      strafeAmount = parseInt(strafeSlider.value);
    }

    if (rotationSlider) {
      rotationAmount = parseInt(rotationSlider.value);
    }

    try {
      this.showStatus("Preparing capture...", "info");

      const mainCanvas = this.findCanvas();
      if (!mainCanvas) {
        throw new Error("Canvas container not found");
      }

      // Hide viewfinder during capture
      const viewfinderWasVisible =
        this.viewfinder && this.viewfinder.style.display !== "none";
      if (viewfinderWasVisible) {
        this.viewfinder.style.display = "none";
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Capture first image
      this.showStatus("Taking first screenshot...", "info");
      const leftImageFull = await this.captureScreenshot();
      const leftImage = await this.imageProcessor.cropImageToCenter(
        leftImageFull
      );

      this.showStatus(`Strafing...`, "info");
      await this.simulateInput(this.strafeMethod, strafeAmount);
      await new Promise((resolve) => setTimeout(resolve, 20));

      this.showStatus(`Rotating...`, "info");
      await this.simulateInput(this.rotationMethod, rotationAmount);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Capture second image
      this.showStatus("Taking second screenshot...", "info");
      const rightImageFull = await this.captureScreenshot();
      const rightImage = await this.imageProcessor.cropImageToCenter(
        rightImageFull
      );
      this.showStatus("Creating stereoscopic image...", "info");
      const result = await this.imageProcessor.createStereoscopicImage(
        leftImage,
        rightImage
      );

      this.currentImageData = result.dataUrl;
      this.currentFilename = result.filename;
      this.showModal(result.dataUrl);

      this.showStatus("Stereoscopic image ready!", "success");
      setTimeout(() => {
        const statusDiv = document.getElementById("status");
        if (statusDiv) {
          statusDiv.style.display = "none";
        }
      }, 2000);

      if (viewfinderWasVisible && this.viewfinder) {
        this.viewfinder.style.display = "block";
      }
    } catch (error) {
      this.showStatus("Error: " + error.message, "error");
    } finally {
      this.isCapturing = false;
      if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.textContent = originalText;
      }
    }
  }

  async simulateInput(method, amount) {
    switch (method) {
      case InputMethod.LEFT_MOUSE_DRAG:
      case InputMethod.SHIFT_MOUSE_DRAG:
      case InputMethod.RIGHT_MOUSE_DRAG:
        return await this.simulateMouseDrag(method, amount);
      case InputMethod.WASD_KEYS:
      case InputMethod.ARROW_KEYS:
        return await this.simulateKeyPress(method, amount);
      default:
        return await this.simulateMouseDrag(amount);
    }
  }

  async simulateKeyPress(inputMethod, amount) {
    const mainCanvas = this.findCanvas();
    if (!mainCanvas) {
      throw new Error("Canvas container not found");
    }
    mainCanvas.focus();

    let keyCode, keyChar;
    if (inputMethod === InputMethod.WASD_KEYS) {
      keyCode = amount > 0 ? "KeyD" : "KeyA";
      keyChar = amount > 0 ? "d" : "a";
    } else {
      keyCode = amount > 0 ? "ArrowRight" : "ArrowLeft";
      keyChar = amount > 0 ? "ArrowRight" : "ArrowLeft";
    }

    const numPresses = Math.abs(Math.floor(amount / 5));
    for (let i = 0; i < numPresses; i++) {
      const keyDownEvent = new KeyboardEvent("keydown", {
        key: keyChar,
        code: keyCode,
        bubbles: true,
        cancelable: true,
      });

      const keyUpEvent = new KeyboardEvent("keyup", {
        key: keyChar,
        code: keyCode,
        bubbles: true,
        cancelable: true,
      });

      mainCanvas.dispatchEvent(keyDownEvent);
      await new Promise((resolve) => setTimeout(resolve, 50));
      mainCanvas.dispatchEvent(keyUpEvent);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async simulateMouseDrag(method, amount) {
    const mainCanvas = this.findCanvas();
    if (!mainCanvas) {
      throw new Error("Canvas container not found");
    }

    mainCanvas.focus();

    const rect = mainCanvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let useShift = method === InputMethod.SHIFT_MOUSE_DRAG;
    let button = method === InputMethod.RIGHT_MOUSE_DRAG ? 2 : 0;
    let buttons = method === InputMethod.RIGHT_MOUSE_DRAG ? 2 : 1;

    const startEvent = new MouseEvent("mousedown", {
      clientX: centerX,
      clientY: centerY,
      button: button,
      buttons: buttons,
      bubbles: true,
      cancelable: true,
      view: window,
      shiftKey: useShift,
    });

    const target = document.pointerLockElement || mainCanvas;
    target.dispatchEvent(startEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const steps = Math.abs(amount);
    const direction = amount > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const currentX = centerX + amount * progress;
      const mouseMoveEvent = new MouseEvent("mousemove", {
        clientX: currentX,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
        view: window,
        movementX: direction * 2,
        movementY: 0,
        buttons: 1,
        shiftKey: useShift,
      });

      target.dispatchEvent(mouseMoveEvent);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const finalX = centerX - amount;
    const endEvent = new MouseEvent("mouseup", {
      clientX: finalX,
      clientY: centerY,
      button: 0,
      buttons: 0,
      bubbles: true,
      cancelable: true,
      view: window,
      shiftKey: useShift,
    });

    target.dispatchEvent(endEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  setPresetToCustom() {
    const presetSelect = document.getElementById("preset-select");
    if (presetSelect && presetSelect.value !== "") {
      presetSelect.value = "";
    }
  }

  swapLeftRight() {
    const strafeSlider = document.getElementById("strafe-slider");
    const strafeValue = document.getElementById("strafe-value");
    const rotationSlider = document.getElementById("rotation-slider");
    const rotationValue = document.getElementById("rotation-value");

    if (strafeSlider && strafeValue) {
      const currentStrafeValue = parseInt(strafeSlider.value);
      const newStrafeValue = currentStrafeValue * -1;
      strafeSlider.value = newStrafeValue;
      strafeValue.textContent = newStrafeValue;
    }

    if (rotationSlider && rotationValue) {
      const currentRotationValue = parseInt(rotationSlider.value);
      const newRotationValue = currentRotationValue * -1;
      rotationSlider.value = newRotationValue;
      rotationValue.textContent = newRotationValue;
    }

    this.showStatus("L/R swapped!", "success");
    setTimeout(() => {
      const statusDiv = document.getElementById("status");
      if (statusDiv) {
        statusDiv.style.display = "none";
      }
    }, 2000);
  }

  showModal(imageDataUrl) {
    if (!this.modal) return;

    const previewImage = document.getElementById("modal-preview-image");
    if (previewImage) {
      previewImage.src = imageDataUrl;
    }

    this.modal.style.display = "flex";

    // Prevent body scrolling when modal is open
    document.body.style.overflow = "hidden";
  }

  hideModal() {
    if (!this.modal) return;

    this.modal.style.display = "none";

    // Restore body scrolling
    document.body.style.overflow = "";

    this.currentImageData = null;
    this.currentFilename = null;
  }

  downloadCurrentImage() {
    if (!this.currentImageData || !this.currentFilename) {
      console.error("No image data available for download");
      return;
    }

    const link = document.createElement("a");
    link.download = this.currentFilename;
    link.href = this.currentImageData;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setPresetConfiguration(presetKey) {
    const strafeMethodSelect = document.getElementById("strafe-method");
    const rotationMethodSelect = document.getElementById("rotation-method");
    const strafeSlider = document.getElementById("strafe-slider");
    const strafeValue = document.getElementById("strafe-value");
    const rotationSlider = document.getElementById("rotation-slider");
    const rotationValue = document.getElementById("rotation-value");
    const scaleSlider = document.getElementById("scale-slider");
    const scaleValue = document.getElementById("scale-value");

    if (
      !strafeMethodSelect ||
      !rotationMethodSelect ||
      !this.presets ||
      !presetKey
    ) {
      return;
    }

    const preset = this.presets[presetKey];
    if (!preset) {
      return;
    }

    strafeMethodSelect.value = preset.strafeMethod;
    rotationMethodSelect.value = preset.rotationMethod;

    if (strafeSlider && preset.defaultStrafeAmount !== undefined) {
      strafeSlider.value = preset.defaultStrafeAmount;
      if (strafeValue) {
        strafeValue.textContent = preset.defaultStrafeAmount;
      }
    }

    if (rotationSlider && preset.defaultRotationAmount !== undefined) {
      rotationSlider.value = preset.defaultRotationAmount;
      if (rotationValue) {
        rotationValue.textContent = preset.defaultRotationAmount;
      }
    }

    if (scaleSlider && preset.defaultScaleFactor !== undefined) {
      scaleSlider.value = preset.defaultScaleFactor;
      this.scaleFactor = preset.defaultScaleFactor;
      if (scaleValue) {
        scaleValue.textContent = this.scaleFactor.toFixed(2);
      }
      this.updateCaptureDimensions();
      this.updateViewfinderPosition();
    }

    this.strafeMethod = strafeMethodSelect.value;
    this.rotationMethod = rotationMethodSelect.value;
  }

  async toggleUi() {
    await this.initPromise;

    if (this.ui) {
      const currentDisplay = window.getComputedStyle(this.ui).display;
      const isHidden = currentDisplay === "none";

      this.ui.style.display = isHidden ? "block" : "none";

      if (this.viewfinder) {
        this.viewfinder.style.display = isHidden ? "block" : "none";
        this.updateViewfinderPosition();
      }

      if (!isHidden) {
        this.hideModal();
      }
    }
  }
}

window.stereoCamera = new StereoCamera();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleUI") {
    if (window.stereoCamera) {
      // Extension already initialized, just toggle
      window.stereoCamera
        .toggleUi()
        .then(() => {
          sendResponse({ success: true, action: "toggled" });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
    } else {
      sendResponse({ success: false, error: "StereoCamera not initialized" });
    }
    return true;
  }

  // Ping response to check if script is loaded and resources status
  if (request.action === "ping") {
    sendResponse({
      success: true,
      ready: !!window.stereoCamera,
      resourcesLoaded: window.stereoCamera
        ? window.stereoCamera.resourcesLoaded
        : false,
    });
    return true;
  }
});

const InputMethod = Object.freeze({
  LEFT_MOUSE_DRAG: "leftMouseDrag",
  SHIFT_MOUSE_DRAG: "shiftMouseDrag",
  RIGHT_MOUSE_DRAG: "rightMouseDrag",
  ARROW_KEYS: "arrowKeys",
  WASD_KEYS: "wasdKeys",
});
