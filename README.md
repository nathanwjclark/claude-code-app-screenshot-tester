# App Screenshot Tester for Claude Code

A command-line tool that gives Claude Code "eyes" to see your web applications, enabling visual debugging and frontend development with a tighter feedback loop.

## Why This Tool Exists

Claude Code normally can't "see" the applications it's developing - it can only work with code and text output. This tool bridges that gap by capturing screenshots during app loading and runtime, allowing Claude to:
- **See what users see**: Verify that UI changes actually render correctly
- **Debug visual issues**: Identify blank screens, layout problems, or missing elements
- **Test responsiveness**: Ensure designs work across different devices and viewports
- **Catch loading errors**: Detect JavaScript errors or failed resource loads visually
- **Expedite frontend development**: Get immediate visual feedback on CSS and layout changes

This creates a much tighter development loop where Claude can make a change, capture screenshots, analyze the visual output, and iterate - just like a human developer would.

## Features

- 📸 **Sequential Screenshot Capture**: Captures screenshots at configurable intervals during page load
- 🔍 **Visual Analysis**: Detects blank screens, loading indicators, and error messages
- 📱 **Device Emulation**: Test responsive designs with built-in device profiles
- 🌐 **Network Throttling**: Simulate different network conditions (3G, 4G, etc.)
- 📊 **Performance Metrics**: Captures Web Vitals (FCP, LCP, CLS) and resource loading times
- 🎯 **Key Frame Detection**: Identifies significant visual changes during loading
- 🔄 **Visual Regression Testing**: Compare screenshots against baselines
- 🚀 **CI/CD Integration**: GitHub Actions workflow support

## Installation for Claude Code Projects

### Method 1: Add as a Subfolder (Recommended)
```bash
# From your project root where Claude Code is working
git clone https://github.com/nathanwjclark/claude-code-app-screenshot-tester.git app-screenshot-tester
cd app-screenshot-tester
npm install
npm run build
cd ..
```

### Method 2: Install Globally
```bash
# Clone and build
git clone https://github.com/nathanwjclark/claude-code-app-screenshot-tester.git
cd claude-code-app-screenshot-tester
npm install
npm run build
npm link  # Creates global symlink

# Now use from any project
claude-screenshot capture http://localhost:3000
```

### Method 3: Add to CLAUDE.md
Add these instructions to your project's CLAUDE.md file so Claude knows to use it:

```markdown
## Screenshot Testing Tool
When debugging web apps, use the screenshot tool at ./app-screenshot-tester/:
- Capture: `cd app-screenshot-tester && npm run capture -- <URL>`
- Analyze: `npm run analyze -- ../.claude-screenshots/<project>/<capture-id>`
- View screenshots: Use Read tool on PNG files in .claude-screenshots/
```

## Quick Start Example

Here's how Claude Code would use this tool in a typical frontend debugging session:

```bash
# 1. Make a CSS change to your app
# 2. Capture screenshots to see the result
cd app-screenshot-tester && npm run capture -- http://localhost:3000 --duration 3000

# 3. Claude can now view the screenshots using the Read tool
# Read: ../.claude-screenshots/your-project/capture-id/000-0ms.png

# 4. If something looks wrong, Claude can analyze the capture
npm run analyze -- ../.claude-screenshots/your-project/capture-id

# 5. Make fixes and capture again to verify
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