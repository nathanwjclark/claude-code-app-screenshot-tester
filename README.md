# App Screenshot Tester

A command-line tool designed for Claude Code to capture and analyze web application loading sequences through automated screenshots.

## Overview

This tool helps developers debug loading issues, verify responsive designs, and detect JavaScript errors by capturing screenshots at regular intervals during page load. It's specifically designed to work with Claude Code's multimodal capabilities, allowing direct analysis of captured images.

## Features

- 📸 **Sequential Screenshot Capture**: Captures screenshots at configurable intervals during page load
- 🔍 **Visual Analysis**: Detects blank screens, loading indicators, and error messages
- 📱 **Device Emulation**: Test responsive designs with built-in device profiles
- 🌐 **Network Throttling**: Simulate different network conditions (3G, 4G, etc.)
- 📊 **Performance Metrics**: Captures Web Vitals (FCP, LCP, CLS) and resource loading times
- 🎯 **Key Frame Detection**: Identifies significant visual changes during loading
- 🔄 **Visual Regression Testing**: Compare screenshots against baselines
- 🚀 **CI/CD Integration**: GitHub Actions workflow support

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Screenshot Capture

```bash
# Capture screenshots of a URL
npm run capture -- https://example.com

# With options
npm run capture -- https://example.com --duration 10000 --interval 500
```

### Analyze Captured Screenshots

```bash
# Analyze a capture session
npm run analyze -- .claude-screenshots/project-name/capture-id
```

### Test Local Development Server

```bash
# Start app and capture screenshots
npm run test -- --start-command "npm run dev" --url http://localhost:3000
```

### Device Emulation

```bash
# Emulate iPhone 12
npm run capture -- https://example.com --device "iPhone 12"

# Emulate iPad with custom viewport
npm run capture -- https://example.com --device "iPad" --viewport 1024x768
```

### Network Throttling

```bash
# Simulate slow 3G
npm run capture -- https://example.com --throttle slow-3g
```

## Screenshot Storage

Screenshots are stored in `.claude-screenshots/<project-name>/<timestamp>/` with:
- PNG images numbered sequentially (000-0ms.png, 001-500ms.png, etc.)
- `manifest.json` containing metadata and analysis results
- Performance metrics for each capture

## Configuration

Create a `claude-screenshot.json` file for project-specific settings:

```json
{
  "capture": {
    "url": "http://localhost:3000",
    "duration": 10000,
    "interval": 1000,
    "viewport": {
      "width": 1280,
      "height": 720
    }
  },
  "comparison": {
    "threshold": 0.1,
    "pixelThreshold": 10
  }
}
```

## API

### CaptureResult Structure

```typescript
interface CaptureResult {
  captureId: string;
  metadata: {
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
    timestamp: string;
  };
  screenshots: Screenshot[];
  analysis: {
    loadingDuration: number;
    keyFrames: string[];
    issues: string[];
    recommendations: string[];
  };
  performance: PerformanceData;
}
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.