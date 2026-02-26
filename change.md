# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Basic Electron setup (main, preload, index)
- Tab navigation interface (Main, Settings)
- Settings UI for Gemini API and Supabase integration
### Changed
- Redesigned user interface to have a browser-like top tab bar and light theme
- **Migrated UI framework from Vanilla HTML/JS to SvelteKit (Svelte 5)**
- Refactored index.html and renderer.js into Svelte components (`+page.svelte`)
- Updated build process to leverage `adapter-static` for UI coupling with Electron
