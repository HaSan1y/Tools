# HaSan1y Tools

A curated collection of browser extensions, Frontend Mentor challenges, Blender helpers, Colab experiments, and Windows PowerShell utilities.

## Browser Extensions

- Focus Mode Pro - selectable reader overlay with themes, sizing, and non-destructive restore.
- Focus Mode Free - simple page-section focus helper.
- MP3 Queue Player - browser audio queue for MP3, WAV, and OGG files.
- GitHub README Simplifier - cleaner reading mode for GitHub README pages.
- Favicon Generator - generate common favicon and extension icon sizes.
- Mobile Power Overlay - page overlay experiment for mobile-style power UI.
- Twitter Filter - content filtering helper for Twitter/X.
- YT Playlist Manager Free - YouTube playlist utility for Chrome.
- YGO Reveal Alerts - work-in-progress card reveal alert helper.
- Page Watcher / Firefox Page Watcher - page change monitoring extensions.
- Translate2CSV - extract translation-oriented page data into CSV-friendly output.

Most extensions target one or more of Chrome, Firefox, Edge, Kiwi, and Brave. Check each `manifest.json` before packaging a store build.

## Other Tools

- Blender LM Studio Prompt Executor - sends AI tasks to LM Studio and executes the returned Python in Blender.
- PowerShell Extension Creator - scaffolds browser extension folders on Windows.
- Colab notebooks and scripts - experiments for scraping, prompts, and generation workflows.
- Yuck - Smart Picture Learning for Windows

## Frontend Challenges

The `@chall` folder contains small HTML/CSS/JavaScript challenge builds:

- Advice API app
- Newsletter signup form
- Testimonials grid
- Three-column preview cards
- Cookie law banner

## Development

### Chrome, Edge, Brave, Kiwi

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked`.
4. Select the extension folder that contains `manifest.json`.

### Firefox

1. Open `about:debugging`.
2. Choose `This Firefox`.
3. Load the extension's `manifest.json` as a temporary add-on.

For unsigned permanent testing, use Firefox Developer Edition and set `xpinstall.signatures.required` to `false` in `about:config`.

## Structure

```text
.
├── index.html
├── readme.md
├── @Browser-Extensions/
├── @chall/
├── @collab/
├── Blender-Extensions/
├── DotNet
└── win11powershell/
```

## Author

https://github.com/HaSan1y
