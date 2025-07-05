class ImageProcessor {
  constructor(captureWidth, captureHeight) {
    this.captureWidth = captureWidth;
    this.captureHeight = captureHeight;
  }

  updateDimensions(captureWidth, captureHeight) {
    this.captureWidth = captureWidth;
    this.captureHeight = captureHeight;
  }

  cropImageToCenter(imageDataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        canvas.width = this.captureWidth;
        canvas.height = this.captureHeight;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const sourceX = ((viewportWidth - this.captureWidth) / 2) * dpr;
        const sourceY = ((viewportHeight - this.captureHeight) / 2) * dpr;
        const sourceWidth = this.captureWidth * dpr;
        const sourceHeight = this.captureHeight * dpr;

        // Create rounded rectangle clipping path
        const borderRadius = 12;
        ctx.beginPath();
        ctx.roundRect(
          0,
          0,
          this.captureWidth,
          this.captureHeight,
          borderRadius
        );
        ctx.clip();

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          this.captureWidth,
          this.captureHeight
        );

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = imageDataUrl;
    });
  }

  async createStereoscopicImage(leftImageData, rightImageData, options = {}) {
    const {
      margin = 30,
      borderRadius = 12,
      backgroundColor = "#000000",
      filename = `stereoscopic-image-${Date.now()}.png`,
      format = "image/png",
      quality = 1.0,
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const leftImg = new Image();
      const rightImg = new Image();

      leftImg.onload = () => {
        const imgWidth = leftImg.width;
        const imgHeight = leftImg.height;

        canvas.width = imgWidth * 2 + margin * 3;
        canvas.height = imgHeight + margin * 2;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this._drawRoundedImage(
          ctx,
          leftImg,
          margin,
          margin,
          imgWidth,
          imgHeight,
          borderRadius
        );

        rightImg.onload = () => {
          this._drawRoundedImage(
            ctx,
            rightImg,
            imgWidth + margin * 2,
            margin,
            imgWidth,
            imgHeight,
            borderRadius
          );
          const dataUrl = canvas.toDataURL(format, quality);
          resolve({ dataUrl, filename });
        };

        rightImg.onerror = () =>
          reject(new Error("Failed to load right image"));
        rightImg.src = rightImageData;
      };

      leftImg.onerror = () => reject(new Error("Failed to load left image"));
      leftImg.src = leftImageData;
    });
  }

  _drawRoundedImage(ctx, img, x, y, width, height, borderRadius) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.clip();
    ctx.drawImage(img, x, y);
    ctx.restore();
  }

  _downloadImage(dataUrl, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getImageDimensions(imageDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  }

  convertImageFormat(imageDataUrl, format = "image/png", quality = 1.0) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(format, quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  }
}

window.ImageProcessor = ImageProcessor;
