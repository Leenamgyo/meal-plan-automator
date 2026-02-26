# Meal Chart Automation (Electron + SvelteKit)

This is a desktop application built with Electron and SvelteKit to automate the conversion and processing of meal chart data.

## Features
- **Modern UI**: macOS-inspired split pane interface with dark/light mode compatibility.
- **SvelteKit Powered**: Fast, reactive frontend using Svelte 5 and Vite.
- **Electron Backed**: Native desktop capabilities.
- **AI Integration Prepared**: UI setup to take raw meal text and convert it to structured JSON using Gemini API.
- **Supabase Prepared**: Settings UI to link a Supabase project for database storage.

## Setup Instructions

### Prerequisites
- Node.js (v18+)

### Installation
1. Clone this repository or download the source code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the SvelteKit frontend:
   ```bash
   npm run build
   ```
4. Start the Electron application:
   ```bash
   npm start
   ```

### Development
For active SvelteKit UI development in the browser:
```bash
npm run dev
```

To build and package the application for distribution:
```bash
npm run dist
```
