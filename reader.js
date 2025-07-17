class EPUBReader {
  constructor() {
    this.epub = null;
    this.chapters = [];
    this.currentChapter = 0;
    this.validateEnvironment();
    this.settings = {
      fontFamily: "default",
      fontSize: 16,
    };
    this.init();
  }

  validateEnvironment() {
    if (typeof JSZip === "undefined") {
      this.showError("JSZip library is not loaded. Please contact support.");
      return false;
    }
    return true;
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `
      <h3>Error</h3>
      <p>${message}</p>
      <button onclick="location.reload()">Reload</button>
    `;
    document.body.appendChild(errorDiv);
  }

  init() {
    const uploadBtn = document.getElementById("uploadBtn");
    const epubFile = document.getElementById("epubFile");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    uploadBtn.addEventListener("click", () => epubFile.click());
    epubFile.addEventListener("change", (e) => this.handleFileUpload(e));
    prevBtn.addEventListener("click", () => this.previousChapter());
    nextBtn.addEventListener("click", () => this.nextChapter());

    // font listener
    const fontDropdown = document.getElementById("fontDropdown");
    if (fontDropdown) {
      fontDropdown.addEventListener("change", (e) =>
        this.changeFontFamily(e.target.value)
      );
    }

    // Load saved settings
    this.loadSettings();
  }

  changeFontFamily(fontFamily) {
    this.settings.fontFamily = fontFamily;
    const pageContent = document.getElementById("pageContent");

    // Remove existing font classes
    pageContent.classList.remove("font-inter", "font-poppins", "font-default");

    // Apply new font class
    if (fontFamily !== "default") {
      pageContent.classList.add(`font-${fontFamily}`);
    } else {
      pageContent.classList.add("font-default");
    }

    this.saveSettings();
  }

  saveSettings() {
    if (typeof browser !== "undefined" && browser.storage) {
      browser.storage.local.set({ epubReaderSettings: this.settings });
    } else {
      localStorage.setItem("epubReaderSettings", JSON.stringify(this.settings));
    }
  }

  loadSettings() {
    if (typeof browser !== "undefined" && browser.storage) {
      browser.storage.local.get(["epubReaderSettings"]).then((result) => {
        if (result.epubReaderSettings) {
          this.settings = result.epubReaderSettings;
          this.applySettings();
        }
      });
    } else {
      const saved = localStorage.getItem("epubReaderSettings");
      if (saved) {
        this.settings = JSON.parse(saved);
        this.applySettings();
      }
    }
  }

  applySettings() {
    // Apply font family
    const fontDropdown = document.getElementById("fontDropdown");

    if (fontDropdown) {
      fontDropdown.value = this.settings.fontFamily;
      this.changeFontFamily(this.settings.fontFamily);
    }
  }

  async waitForFontLoad(fontFamily) {
    if ("fonts" in document) {
      try {
        await document.fonts.load(`16px ${fontFamily}`);
        return document.fonts.check(`16px ${fontFamily}`);
      } catch (error) {
        console.warn(`Font loading check failed for ${fontFamily}:`, error);
        return false;
      }
    }
    return false;
  }

  async changeFontFamily(fontFamily) {
    this.settings.fontFamily = fontFamily;
    const pageContent = document.getElementById("pageContent");

    // Show loading state
    pageContent.style.opacity = "0.7";

    // Remove existing font classes
    pageContent.classList.remove("font-inter", "font-poppins", "font-default");

    // Apply new font class
    if (fontFamily !== "default") {
      pageContent.classList.add(`font-${fontFamily}`);

      // Wait for font to load
      const fontName = fontFamily.charAt(0).toUpperCase() + fontFamily.slice(1);
      await this.waitForFontLoad(fontName);
    } else {
      pageContent.classList.add("font-default");
    }

    // Restore opacity
    pageContent.style.opacity = "1";

    this.saveSettings();
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".epub")) {
      this.showError("Please select a valid EPUB file.");
      return;
    }

    // Validate file size (e.g., max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      this.showError("File too large. Please select a file smaller than 50MB.");
      return;
    }

    try {
      this.showLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      const epub = await zip.loadAsync(arrayBuffer);

      await this.parseEPUB(epub);
      this.showReader();
    } catch (error) {
      console.error("Error loading EPUB:", error);
      this.showError(
        "Error loading EPUB file. Please ensure it's a valid EPUB format."
      );
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(show) {
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
      loadingDiv.style.display = show ? "block" : "none";
    }
  }

  async parseEPUB(epub) {
    this.epub = epub;
    this.chapters = [];

    // Find container.xml
    const containerXML = await epub
      .file("META-INF/container.xml")
      .async("string");
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXML, "text/xml");

    // Get OPF file path
    const opfPath = containerDoc
      .querySelector("rootfile")
      .getAttribute("full-path");
    const opfContent = await epub.file(opfPath).async("string");
    const opfDoc = parser.parseFromString(opfContent, "text/xml");

    // Get spine items
    const spineItems = opfDoc.querySelectorAll("spine itemref");
    const manifestItems = opfDoc.querySelectorAll("manifest item");

    // Create manifest map
    const manifestMap = {};
    manifestItems.forEach((item) => {
      manifestMap[item.getAttribute("id")] = item.getAttribute("href");
    });

    // Process spine items
    for (let item of spineItems) {
      const idref = item.getAttribute("idref");
      const href = manifestMap[idref];

      if (href) {
        const fullPath = this.resolvePath(opfPath, href);
        try {
          const content = await epub.file(fullPath).async("string");
          const doc = parser.parseFromString(content, "text/html");

          // Extract title
          const title =
            doc.querySelector("title")?.textContent ||
            doc.querySelector("h1, h2, h3")?.textContent ||
            `Chapter ${this.chapters.length + 1}`;

          this.chapters.push({
            title: title.trim(),
            content: content,
            path: fullPath,
          });
        } catch (error) {
          console.error(`Error loading chapter ${href}:`, error);
        }
      }
    }

    this.renderChapterList();
  }

  resolvePath(basePath, relativePath) {
    const baseDir = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    return baseDir + relativePath;
  }

  renderChapterList() {
    const chapterList = document.getElementById("chapterList");
    chapterList.innerHTML = "";

    this.chapters.forEach((chapter, index) => {
      const chapterItem = document.createElement("div");
      chapterItem.className = "chapter-item";
      chapterItem.textContent = chapter.title;
      chapterItem.addEventListener("click", () => this.goToChapter(index));
      chapterList.appendChild(chapterItem);
    });

    if (this.chapters.length > 0) {
      this.goToChapter(0);
    }
  }

  goToChapter(index) {
    if (index < 0 || index >= this.chapters.length) return;

    this.currentChapter = index;
    const chapter = this.chapters[index];

    // Update content
    const pageContent = document.getElementById("pageContent");
    const parser = new DOMParser();
    const doc = parser.parseFromString(chapter.content, "text/html");
    const bodyContent = doc.body.innerHTML;
    pageContent.innerHTML = bodyContent;

    // Update chapter list highlighting
    document.querySelectorAll(".chapter-item").forEach((item, i) => {
      item.classList.toggle("active", i === index);
    });

    // Update navigation
    this.updateNavigation();
  }

  updateNavigation() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");

    prevBtn.disabled = this.currentChapter === 0;
    nextBtn.disabled = this.currentChapter === this.chapters.length - 1;
    pageInfo.textContent = `Chapter ${this.currentChapter + 1} of ${
      this.chapters.length
    }`;
  }

  previousChapter() {
    if (this.currentChapter > 0) {
      this.goToChapter(this.currentChapter - 1);
    }
  }

  nextChapter() {
    if (this.currentChapter < this.chapters.length - 1) {
      this.goToChapter(this.currentChapter + 1);
    }
  }

  showReader() {
    document.getElementById("uploadSection").style.display = "none";
    document.getElementById("readerSection").style.display = "flex";

    // Apply saved settings when reader is shown
    this.applySettings();
  }
}

// Initialize the reader when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new EPUBReader();
});
