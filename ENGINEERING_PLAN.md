# App Screenshot Tester - Engineering Plan

## Project Setup & Architecture

### Phase 1: Foundation (Day 1)
1. **Initialize TypeScript Project**
   ```bash
   npm init -y
   npm install typescript @types/node tsx playwright commander chalk
   npm install -D @types/commander jest @types/jest ts-jest
   ```

2. **Project Structure**
   ```
   app-screenshot-tester/
   ├── src/
   │   ├── cli/
   │   │   ├── index.ts           # CLI entry point
   │   │   └── commands/
   │   │       ├── capture.ts      # Capture command
   │   │       └── analyze.ts      # Analyze command
   │   ├── core/
   │   │   ├── browser.ts          # Browser controller
   │   │   ├── capturer.ts         # Screenshot capture engine
   │   │   ├── detector.ts         # Loading detection
   │   │   └── storage.ts          # File management
   │   ├── types/
   │   │   └── index.ts            # TypeScript interfaces
   │   └── utils/
   │       ├── logger.ts           # Console output formatting
   │       └── manifest.ts         # Manifest generation
   ├── tests/
   ├── package.json
   └── tsconfig.json
   ```

### Phase 2: Core Implementation (Day 2-3)

#### 1. Browser Controller (`browser.ts`)
```typescript
class BrowserController {
  private browser: Browser;
  private page: Page;
  
  async launch(options: BrowserOptions): Promise<void>;
  async navigate(url: string): Promise<void>;
  async screenshot(path: string): Promise<void>;
  async close(): Promise<void>;
}
```

#### 2. Screenshot Capturer (`capturer.ts`)
```typescript
class ScreenshotCapturer {
  async captureSequence(config: CaptureConfig): Promise<CaptureResult> {
    // Key logic:
    // 1. Take initial screenshot immediately
    // 2. Set up interval captures
    // 3. Monitor for loading completion
    // 4. Take final screenshot when stable
    // 5. Generate manifest with all metadata
  }
}
```

#### 3. Loading Detector (`detector.ts`)
```typescript
interface LoadingStrategy {
  name: string;
  detect(page: Page): Promise<boolean>;
}

class NetworkIdleStrategy implements LoadingStrategy;
class DOMReadyStrategy implements LoadingStrategy;
class ElementPresentStrategy implements LoadingStrategy;
class CompositeStrategy implements LoadingStrategy;
```

### Phase 3: CLI Interface (Day 4)

#### Command Structure
```bash
# Main capture command
app-screenshot-tester capture \
  --url <url> \
  --name <name> \
  --duration <ms> \
  --interval <ms> \
  --wait-for <selector> \
  --viewport <width>x<height> \
  --key-frames-only

# Analysis command  
app-screenshot-tester analyze <capture-dir>

# Test command (starts app + captures)
app-screenshot-tester test \
  --start-command <cmd> \
  --url <url> \
  --wait-before-capture <ms>
```

### Phase 4: Claude Code Optimizations (Day 5)

#### 1. Enhanced Manifest for Multimodal Analysis
```json
{
  "captureId": "app-123456",
  "metadata": {
    "url": "http://localhost:3000",
    "viewport": { "width": 1280, "height": 720 },
    "userAgent": "...",
    "timestamp": "2024-01-20T14:30:22Z"
  },
  "screenshots": [
    {
      "filename": "000-initial.png",
      "timestamp": 0,
      "phase": "initial",
      "annotations": {
        "blankScreen": true,
        "hasContent": false
      }
    },
    {
      "filename": "003-content-visible.png",
      "timestamp": 1500,
      "phase": "loading",
      "annotations": {
        "blankScreen": false,
        "hasContent": true,
        "loadingIndicators": ["spinner"]
      }
    }
  ],
  "analysis": {
    "loadingDuration": 2300,
    "keyFrames": ["000-initial.png", "003-content-visible.png", "005-final.png"],
    "issues": [],
    "recommendations": []
  }
}
```

#### 2. Visual Diff Detection
Since I can view images, implement visual change detection:
- Compare consecutive screenshots
- Mark significant visual changes as key frames
- Annotate what changed (e.g., "content appeared", "spinner removed")

#### 3. Smart Screenshot Selection
```typescript
class KeyFrameDetector {
  // Detect and save only important screenshots:
  // - Initial blank state
  // - First content appearance  
  // - Major layout shifts
  // - Loading indicator changes
  // - Final stable state
}
```

### Implementation Timeline

**Week 1:**
- Day 1: Project setup, TypeScript config, dependencies
- Day 2: Browser controller and basic screenshot capture
- Day 3: Loading detection strategies
- Day 4: CLI interface with commander.js
- Day 5: Manifest generation and storage organization

**Week 2:**
- Day 6: Key frame detection and visual analysis
- Day 7: Test command with app launching
- Day 8: Error handling and edge cases
- Day 9: Testing suite
- Day 10: Documentation and examples

### Testing Strategy

1. **Unit Tests**
   - Loading detection strategies
   - Manifest generation
   - File organization

2. **Integration Tests**
   - Full capture flow with test app
   - CLI command parsing
   - Error scenarios

3. **Example Test Apps**
   - Simple static HTML
   - React SPA with loading states
   - Next.js with SSR
   - App with intentional errors

### Key Technical Decisions

1. **Playwright over Puppeteer**
   - Better cross-browser support
   - More reliable wait strategies
   - Built-in network monitoring

2. **TypeScript with ESM**
   - Type safety for CLI arguments
   - Modern module system
   - Better IDE support

3. **Commander.js for CLI**
   - Robust option parsing
   - Automatic help generation
   - Subcommand support

4. **Structured Logging**
   ```
   [CAPTURE] Starting capture for http://localhost:3000
   [BROWSER] Launching Chromium headless
   [SCREENSHOT] 000-initial.png captured at 0ms
   [DETECT] Network idle detected at 1800ms
   [SCREENSHOT] 004-final.png captured at 2000ms
   [COMPLETE] Capture saved to ./screenshots/app-123456/
   ```

### Leveraging Multimodal Capabilities

Since I can view images directly:

1. **Visual Validation Pipeline**
   - After capture, I can immediately view key screenshots
   - Detect common issues: blank screens, error states, broken layouts
   - Provide immediate feedback without external tools

2. **Intelligent Analysis**
   ```typescript
   // In analyze command, generate insights
   interface VisualAnalysis {
     hasContent: boolean;
     errorMessages: string[];
     loadingComplete: boolean;
     layoutIssues: string[];
   }
   ```

3. **Capture Optimization**
   - Only save screenshots with visual changes
   - Annotate what changed between frames
   - Highlight areas of interest

### Error Handling & Edge Cases

1. **App doesn't start**: Timeout with helpful error
2. **Page crashes**: Capture error screenshot
3. **Infinite loading**: Max duration limit
4. **Network errors**: Retry logic with backoff
5. **File system issues**: Graceful degradation

### Success Metrics

1. **Capture Speed**: < 3s overhead beyond actual loading time
2. **Storage Efficiency**: ~5-10 screenshots for typical 10s capture
3. **Analysis Accuracy**: Correctly identify loading completion 95%+ of time
4. **CLI Usability**: Single command for common use cases