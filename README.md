# EPUB-goat

A beautiful, feature-rich EPUB reader extension for Firefox that allows you to read EPUB files directly in your browser without any external applications.

![EPUB-goat Logo](icons/icon-96.png)

## Features

- **Read EPUB Files**: Open and read EPUB files directly in your browser
- **Customizable Interface**: Choose from different fonts to customize your reading experience
- **Responsive Design**: Enjoy a seamless reading experience on any device
- **Chapter Navigation**: Easily navigate between chapters with intuitive controls
- **Privacy Focused**: Your EPUB files are processed locally in your browser
- **Fast & Lightweight**: Quick loading times and smooth performance even with large EPUB files

## Installation

### For Users

#### Option 1: Mozilla Add-ons Store (Recommended)

Install EPUB-goat directly from the official Mozilla Add-ons repository:

[<img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get EPUB-goat for Firefox" width="172" height="60">](https://addons.mozilla.org/en-US/firefox/addon/epub-goat/)

#### Option 2: Manual Installation

1. Download the latest `.xpi` file from the [GitHub Releases](https://github.com/uttamthegoat/EPUB-goat/releases) page
2. In Firefox, go to `about:addons`
3. Click the gear icon and select "Install Add-on From File..."
4. Select the downloaded `.xpi` file
5. Follow the prompts to complete installation

### For Developers

If you want to work on EPUB-goat or customize it for your own use, follow these steps:

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (v8 or later)

#### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/uttamthegoat/EPUB-goat.git
   cd EPUB-goat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Development:
   ```bash
   npm run dev
   ```
   This will launch Firefox with the extension loaded for testing.

4. Build:
   ```bash
   npm run build
   ```
   This will create an `.xpi` file in the `web-ext-artifacts` directory.

5. Lint:
   ```bash
   npm run lint
   ```
   This will check your code for potential issues.

## Usage

1. Click on the EPUB-goat icon in your Firefox toolbar
2. Upload an EPUB file using the "Upload EPUB File" button
3. Navigate through chapters using the sidebar or navigation buttons
4. Customize your reading experience using the font selector

## Download Links

- [Mozilla Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/epub-goat/)
- [GitHub Releases](https://github.com/uttamthegoat/EPUB-goat/releases)

## Credits

- **Developer**: [uttamthegoat](https://github.com/uttamthegoat)
- **Libraries**:
  - [JSZip](https://stuk.github.io/jszip/) - For handling EPUB file extraction
- **Fonts**:
  - [Inter](https://fonts.google.com/specimen/Inter) - A variable font family designed for computer screens
  - [Poppins](https://fonts.google.com/specimen/Poppins) - A geometric sans-serif font with a distinctive look

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For support or inquiries, please contact:
- Email: [zoronoaH311@protonmail.com](mailto:zoronoaH311@protonmail.com)
- GitHub: [uttamthegoat](https://github.com/uttamthegoat)

---

Made with 😎 by 👉**uttamthegoat**👈
