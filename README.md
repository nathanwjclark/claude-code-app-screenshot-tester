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

### Step 1: Install the Tool

#### Option A: Add as a Subfolder (Recommended)
```bash
# From your project root where Claude Code is working
git clone https://github.com/nathanwjclark/claude-code-app-screenshot-tester.git app-screenshot-tester
cd app-screenshot-tester
npm install
npm run build
cd ..
```

#### Option B: Install Globally
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

### Step 2: Add to CLAUDE.md (Required)
**Important:** Always add these instructions to your project's CLAUDE.md file so Claude knows the tool is available:

```markdown
## Screenshot Testing Tool
When debugging web apps, use the screenshot tool at ./app-screenshot-tester/:
- Capture: `cd app-screenshot-tester && npm run capture -- <URL>`
- Analyze: `npm run analyze -- ../.claude-screenshots/<project>/<capture-id>`
- Test with auto-start: `npm run test-app -- --start-command "npm run dev" --url <URL>`
- View screenshots: Use Read tool on PNG files in .claude-screenshots/

Example: `npm run capture -- http://localhost:3000 --duration 3000`
```

Note: Adjust the path (`./app-screenshot-tester/`) if you installed globally or in a different location.

## Quick Start Example

Here's how Claude Code would use this tool in a typical frontend debugging session:

```bash
# 1. Make a CSS change to your app
# 2. Capture screenshots to see the result (both syntaxes work)
cd app-screenshot-tester && npm run capture -- http://localhost:3000 --duration 3000
# OR: npm run capture -- --url http://localhost:3000 --duration 3000

# 3. Claude can now view the screenshots using the Read tool
# Read: ../.claude-screenshots/your-project/capture-id/000-0ms.png

# 4. If something looks wrong, Claude can analyze the capture
npm run analyze -- ../.claude-screenshots/your-project/capture-id

# 5. Make fixes and capture again to verify
```

## Usage

### Basic Screenshot Capture

```bash
# Capture screenshots of a URL (both syntaxes work)
npm run capture -- --url https://example.com
npm run capture -- https://example.com

# With options
npm run capture -- --url https://example.com --duration 10000 --interval 500
npm run capture -- https://example.com --duration 10000 --interval 500

# With custom name
npm run capture -- --url https://example.com --name "homepage-test"
```

### Analyze Captured Screenshots

```bash
# Analyze a capture session
npm run analyze -- .claude-screenshots/project-name/capture-id
```

### Test Local Development Server

```bash
# Start app and capture screenshots
npm run test-app -- --start-command "npm run dev" --url http://localhost:3000

# With custom wait time before capture
npm run test-app -- --start-command "npm run dev" --url http://localhost:3000 --wait-before-capture 5000
```

### Device Emulation

```bash
# Emulate iPhone 12
npm run capture -- --url https://example.com --device "iPhone 12"

# Emulate iPad with custom viewport
npm run capture -- --url https://example.com --device "iPad" --viewport 1024x768
```

### Network Throttling

```bash
# Simulate slow 3G
npm run capture -- --url https://example.com --throttle slow-3g
```

## Screenshot Storage

Screenshots are stored in `.claude-screenshots/<project-name>/<timestamp>/` with:
- PNG images numbered sequentially (000-0ms.png, 001-500ms.png, etc.)
- `manifest.json` containing metadata and analysis results
- Performance metrics for each capture

Example output structure:
```
.claude-screenshots/
└── my-project/
    └── homepage-test-2025-06-26T00-14-48-217Z/
        ├── 000-0ms.png          # Initial page load
        ├── 001-500ms.png        # After 500ms
        ├── 002-1000ms.png       # After 1 second
        ├── 003-1500ms.png       # After 1.5 seconds
        └── manifest.json        # Capture metadata & analysis
```

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