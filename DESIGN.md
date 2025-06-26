# App Screenshot Tester - Design Document

## Overview
A tool that launches web applications in a headless browser, captures screenshots during the loading process, and provides a way to review these screenshots to verify correct loading and appearance, used by agentic coding tools like Claude Code.

## Core Requirements
1. Launch web applications in a controlled environment
2. Capture screenshots at configurable intervals during loading
3. Detect when loading is "complete" using multiple strategies
4. Store screenshots in an organized manner
5. Provide a simple interface to review captured screenshots

## Architecture

### Technology Stack
- **Language**: TypeScript
- **Headless Browser**: Playwright (cross-browser support, better API than Puppeteer)
- **Screenshot Storage**: Local filesystem with organized structure
- **Review Interface**: Simple HTML report or CLI viewer

### Components

#### 1. Browser Controller
- Manages headless browser instances
- Configurable viewport sizes and device emulation
- Network throttling options
- Cookie/localStorage management

#### 2. Screenshot Capture Engine
- Takes screenshots at configurable intervals
- Supports full-page and viewport screenshots
- Can capture specific elements
- Handles multiple concurrent captures

#### 3. Loading Detection System
Multiple strategies to detect when loading is complete:
- DOM ready state
- Network idle detection
- Custom wait conditions (e.g., specific elements appearing)
- Fixed timeout fallback
- JavaScript execution completion

#### 4. Screenshot Storage Manager
- Organized folder structure: `./screenshots/{app-name}/{timestamp}/`
- Metadata files with capture details
- Optional comparison with baseline images
- Cleanup of old captures

#### 5. Review Interface
Two options:
- **HTML Report**: Static HTML file with all screenshots in a timeline
- **CLI Viewer**: Terminal-based viewer with navigation

## API Design

```typescript
interface ScreenshotTesterConfig {
  url: string;
  name?: string;
  viewport?: { width: number; height: number };
  device?: string; // Mobile device emulation
  captureInterval?: number; // ms between screenshots
  maxDuration?: number; // Maximum capture duration
  loadingStrategies?: LoadingStrategy[];
  outputDir?: string;
}

interface LoadingStrategy {
  type: 'domReady' | 'networkIdle' | 'element' | 'timeout' | 'custom';
  options?: any;
}

class AppScreenshotTester {
  constructor(config: ScreenshotTesterConfig);
  
  async capture(): Promise<CaptureResult>;
  async generateReport(): Promise<string>; // Path to HTML report
  async compare(baseline: string): Promise<ComparisonResult>;
}
```

## Usage Example

```typescript
const tester = new AppScreenshotTester({
  url: 'http://localhost:3000',
  name: 'my-app',
  captureInterval: 500, // Every 500ms
  maxDuration: 10000, // 10 seconds max
  loadingStrategies: [
    { type: 'networkIdle', options: { timeout: 2000 } },
    { type: 'element', options: { selector: '.app-loaded' } }
  ]
});

const result = await tester.capture();
const reportPath = await tester.generateReport();
```

## Implementation Phases

### Phase 1: Core Functionality
- Basic browser control with Playwright
- Simple interval-based screenshot capture
- Basic loading detection (DOM ready + timeout)
- Filesystem storage

### Phase 2: Enhanced Features
- Multiple loading strategies
- HTML report generation
- Device emulation
- Network throttling

### Phase 3: Advanced Features
- Visual regression testing
- Parallel captures
- CI/CD integration
- Performance metrics

## Considerations

### Performance
- Efficient screenshot capture (avoid blocking)
- Parallel processing where possible
- Cleanup old captures automatically

### Error Handling
- Graceful handling of page errors
- Timeout management
- Browser crash recovery

### Extensibility
- Plugin system for custom loading strategies
- Custom report templates
- Integration with existing test frameworks

## Claude Code Integration

### How Claude Code Will Use This Tool

Since I (Claude Code) operate through a CLI interface with access to file reading and bash commands, the tool needs to be designed with these constraints in mind:

#### 1. CLI-First Interface
```bash
# Simple command to capture screenshots
npx app-screenshot-tester capture --url http://localhost:3000 --duration 10s

# With custom options
npx app-screenshot-tester capture \
  --url http://localhost:3000 \
  --name "my-react-app" \
  --interval 500 \
  --wait-for ".app-loaded"
```

#### 2. Screenshot Access Pattern
Since I can use the Read tool to view images, screenshots should be:
- Saved as individual PNG files with descriptive names
- Include a manifest JSON file listing all screenshots with metadata
- Organized in a predictable directory structure

```
screenshots/
├── my-app-2024-01-20-143022/
│   ├── manifest.json
│   ├── 000-initial.png
│   ├── 001-500ms.png
│   ├── 002-1000ms.png
│   ├── 003-1500ms.png
│   └── 004-final.png
```

#### 3. Manifest Format for Easy Analysis
```json
{
  "captureId": "my-app-2024-01-20-143022",
  "url": "http://localhost:3000",
  "duration": 2000,
  "screenshots": [
    {
      "filename": "000-initial.png",
      "timestamp": 0,
      "description": "Initial page load"
    },
    {
      "filename": "004-final.png",
      "timestamp": 2000,
      "description": "Final state - network idle"
    }
  ],
  "loadingComplete": {
    "timestamp": 1800,
    "strategy": "networkIdle"
  }
}
```

#### 4. Analysis Commands
```bash
# Quick summary of capture
npx app-screenshot-tester analyze ./screenshots/my-app-2024-01-20-143022

# Output:
# Capture Summary:
# - Total duration: 2.0s
# - Screenshots: 5
# - Loading completed at: 1.8s (network idle)
# - Final screenshot: 004-final.png
```

#### 5. Simplified Review Process
Instead of an HTML report, provide:
1. A JSON summary file I can read
2. Clear naming conventions for screenshots
3. A `--key-frames` option that only saves important screenshots:
   - Initial load
   - Major visual changes
   - Final stable state

#### 6. Integration with Development Workflow
```bash
# Start app and capture in one command
npx app-screenshot-tester test \
  --start-command "npm run dev" \
  --url "http://localhost:3000" \
  --wait-before-capture 2s
```

### Usage Workflow for Claude Code

1. **Launch and Capture**:
   ```bash
   # I'll run this command
   npx app-screenshot-tester capture --url http://localhost:3000 --name test-run
   ```

2. **Read Manifest**:
   ```bash
   # I'll use Read tool on the manifest
   Read screenshots/test-run-*/manifest.json
   ```

3. **View Key Screenshots**:
   ```bash
   # I'll use Read tool to view specific screenshots
   Read screenshots/test-run-*/000-initial.png
   Read screenshots/test-run-*/004-final.png
   ```

4. **Analyze Results**:
   - Check if loading completed successfully
   - Review screenshots for visual correctness
   - Identify any loading issues or errors

### Special Considerations

1. **Headless Operation**: Must work in headless mode by default
2. **Fast Feedback**: Quick capture mode for rapid iteration
3. **Error Screenshots**: Capture screenshot on any errors
4. **Console Output**: Log important events to stdout for immediate feedback
5. **Exit Codes**: Meaningful exit codes for success/failure detection

## Next Steps
1. Set up TypeScript project with Playwright
2. Implement basic browser controller with CLI interface
3. Create screenshot capture engine with manifest generation
4. Build Claude Code-friendly analysis commands
5. Add integration helpers for common dev workflows
