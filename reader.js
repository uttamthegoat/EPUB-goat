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
    this.lastScrollTop = 0;
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
    
    // Create elements instead of using innerHTML
    const heading = document.createElement("h3");
    heading.textContent = "Error";
    
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    
    const button = document.createElement("button");
    button.textContent = "Reload";
    button.addEventListener("click", () => location.reload());
    
    // Append elements to the error div
    errorDiv.appendChild(heading);
    errorDiv.appendChild(paragraph);
    errorDiv.appendChild(button);
    
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

    // Mobile sidebar toggle functionality
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebar = document.getElementById("sidebar");
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.add("active");
      });
    }
    
    if (sidebarClose && sidebar) {
      sidebarClose.addEventListener("click", () => {
        sidebar.classList.remove("active");
      });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (event) => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && sidebar && sidebar.classList.contains("active")) {
        // Check if click is outside sidebar and not on the toggle button
        if (!sidebar.contains(event.target) && 
            event.target !== sidebarToggle && 
            (!sidebarToggle || !sidebarToggle.contains(event.target))) {
          sidebar.classList.remove("active");
        }
      }
    });

    // Hide toolbar on scroll down, show on scroll up
    this.setupScrollListener();

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

  setupScrollListener() {
    const pageContent = document.getElementById("pageContent");
    const toolbar = document.querySelector(".toolbar");
    
    if (!pageContent || !toolbar) return;
    
    let lastScrollTop = 0;
    let scrollTimeout;
    
    pageContent.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      
      const scrollTop = pageContent.scrollTop;
      
      // Determine scroll direction
      if (scrollTop > lastScrollTop && scrollTop > 50) {
        // Scrolling down & not at the top
        toolbar.classList.add("hidden");
      } else {
        // Scrolling up or at the top
        toolbar.classList.remove("hidden");
      }
      
      lastScrollTop = scrollTop;
      
      // Show toolbar after scrolling stops
      scrollTimeout = setTimeout(() => {
        toolbar.classList.remove("hidden");
      }, 1500);
    });
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
    
    // Clear the chapter list safely
    while (chapterList.firstChild) {
      chapterList.removeChild(chapterList.firstChild);
    }

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
    
    // Display chapter content - using DOMParser for safer HTML handling
    const pageContent = document.getElementById("pageContent");
    
    // Clear existing content
    while (pageContent.firstChild) {
      pageContent.removeChild(pageContent.firstChild);
    }
    
    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(chapter.content, "text/html");
    
    // Import and append the body content
    const bodyContent = doc.querySelector("body");
    if (bodyContent) {
      // Use a document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      // Clone all child nodes from the parsed body
      Array.from(bodyContent.childNodes).forEach(node => {
        fragment.appendChild(document.importNode(node, true));
      });
      
      pageContent.appendChild(fragment);
    }
    
    // Update navigation
    this.updateNavigation();
    
    // Highlight active chapter in the list
    const chapterItems = document.querySelectorAll(".chapter-item");
    chapterItems.forEach((item, i) => {
      if (i === index) {
        item.classList.add("active");
        item.setAttribute("aria-current", "true");
      } else {
        item.classList.remove("active");
        item.setAttribute("aria-current", "false");
      }
    });
    
    // Scroll to top of the page
    pageContent.scrollTop = 0;
    window.scrollTo(0, 0);
    
    // Close sidebar on mobile after chapter selection
    const sidebar = document.getElementById("sidebar");
    if (window.innerWidth <= 768 && sidebar) {
      sidebar.classList.remove("active");
    }
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
      // Scroll to top is handled in goToChapter
    }
  }

  nextChapter() {
    if (this.currentChapter < this.chapters.length - 1) {
      this.goToChapter(this.currentChapter + 1);
      // Scroll to top is handled in goToChapter
    }
  }

  showReader() {
    document.getElementById("uploadSection").style.display = "none";
    document.getElementById("readerSection").style.display = "flex";
    
    // Apply saved settings when reader is shown
    this.applySettings();
    
    // Setup scroll listener after reader is shown
    this.setupScrollListener();
  }
}

// Initialize the reader when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new EPUBReader();
});
