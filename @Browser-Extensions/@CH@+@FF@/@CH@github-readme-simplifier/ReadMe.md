**GitHub README Simplifier**
**A Chrome Extension that extracts and restructures GitHub README files using your own AI provider.**

**Supports:**
**Local LLMs via LM Studio**
**OpenAI API (optional)**
**Translation + restructuring**
**Clean technical formatting**
**License and security section preservation**

**Why This Exists**
**Many GitHub repositories contain:**
**Marketing fluff**
**Badges**
**Donation links**
**Long explanations**
**Unstructured documentation**

**This extension:**
**Extracts the README**
**Removes noise**
**Preserves licensing and legal sections**
**Rewrites it into clean technical structure**
**Optionally translates it**

**Features**
**Extract README directly from GitHub**
**Smart truncation for large repositories**

**Preserves:**
**License sections**
**Security warnings**
**Important external links**

**AI provider selection:**
**LM Studio (local, private)**
**OpenAI (cloud)**
**Open result inline or in new tab**
**Clean Markdown rendering**
**Structured Output Format**

**All output follows this structure:**
**# Project Summary**
**# Requirements**
**# Installation**
**# Minimal Usage**
**# Important Notes**

**Installation (Development Mode)**
**Download or clone this repository.**
**Open Chrome → chrome://extensions**
**Enable Developer Mode.**
**Click "Load unpacked".**
**Select the extension folder.**
**Using with LM Studio (Recommended)**
**Install LM Studio.**
**Download a compatible chat model (e.g., instruct models).**
**Start the local server.**

**Set:**
**Provider: LM Studio**
**Model: your loaded model ID**
**Default endpoint:**
**http://localhost:1234/v1/chat/completions**
**No data leaves your machine when using LM Studio.**

**Using with OpenAI**
**Obtain an API key from OpenAI.**
**Enter your API key in the extension settings.**
**Select a supported model (e.g., gpt-4o-mini).**
**Requires internet connection and valid billing.**

**Privacy**
**When using LM Studio: processing is fully local.**
**When using OpenAI: README content is sent to OpenAI’s API.**
**The extension does not collect, store, or transmit data to any third-party server controlled by the developer.**

**Legal Notice**
**This tool restructures and reformats README files using AI.**
**The original repository license remains unchanged.**
**Users are responsible for reviewing generated output.**
**AI-generated text may contain inaccuracies.**
**This tool does not modify the original GitHub repository.**
**The developer assumes no liability for misuse or incorrect AI output.**

**Limitations**
**Very large READMEs are truncated for token safety.**
**Output quality depends on the selected model.**
**Some models may require custom prompt templates (LM Studio).**

**Intended Audience**
**Developers evaluating repositories quickly**
**Technical reviewers**
**Open-source researchers**
**Engineers scanning large projects**

**Roadmap Ideas**
**Streaming output**
**Custom structure templates**
**Token usage estimation**
**Export as PDF**
**Model auto-detection**

**License**
**MIT (or your chosen license)**
