import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

describe('Visual Regression and Key Frame Detection Tests', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-visual-regression');

  beforeEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  it('should detect key frames on pages with dynamic content changes', async () => {
    // Create HTML with staged content changes
    const dynamicHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dynamic Content Test</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .content { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
          .loading { color: blue; }
          .loaded { color: green; font-size: 24px; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <h1>Dynamic Content Test</h1>
        
        <div id="stage1" class="content">
          <p class="loading">Loading initial content...</p>
        </div>
        
        <div id="stage2" class="content hidden">
          <p class="loaded">Content loaded!</p>
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect width='200' height='100' fill='%23ff0000'/%3E%3C/svg%3E" alt="Red box">
        </div>
        
        <div id="stage3" class="content hidden">
          <h2>Additional Content</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect width='300' height='150' fill='%2300ff00'/%3E%3C/svg%3E" alt="Green box">
        </div>
        
        <script>
          // Stage 1 to 2: Major visual change
          setTimeout(() => {
            document.getElementById('stage1').classList.add('hidden');
            document.getElementById('stage2').classList.remove('hidden');
          }, 1500);
          
          // Stage 2 to 3: Another major change
          setTimeout(() => {
            document.getElementById('stage3').classList.remove('hidden');
          }, 3000);
          
          // Minor change: Update text
          setTimeout(() => {
            document.querySelector('.loaded').textContent = 'Content fully loaded!';
          }, 4500);
        </script>
      </body>
      </html>
    `;

    const testPagePath = path.join(testOutputDir, 'dynamic-test.html');
    await fs.mkdir(testOutputDir, { recursive: true });
    await fs.writeFile(testPagePath, dynamicHtml);

    // Capture with short intervals to catch all changes
    const output = execSync(
      `npx tsx ${cliPath} capture --url file://${testPagePath} --name dynamic-test --duration 6000 --interval 500 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    // Read and analyze results
    const captures = await fs.readdir(testOutputDir);
    const captureDir = captures.find(dir => dir.startsWith('dynamic-test-'));
    const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Should detect multiple key frames for major visual changes
    const keyFrames = manifest.analysis.keyFrames;
    expect(keyFrames.length).toBeGreaterThanOrEqual(3); // Initial + 2 major changes

    // Verify key frames correspond to visual changes
    const keyFrameScreenshots = manifest.screenshots.filter(
      (s: any) => s.annotations?.isKeyFrame
    );

    console.log(`Detected ${keyFrameScreenshots.length} key frames out of ${manifest.screenshots.length} total screenshots`);

    // Check that key frames have different visual characteristics
    const keyFrameTimestamps = keyFrameScreenshots.map((s: any) => s.timestamp);
    
    // Should have key frames around the transition times
    const hasEarlyKeyFrame = keyFrameTimestamps.some((t: number) => t < 1000);
    const hasMidKeyFrame = keyFrameTimestamps.some((t: number) => t > 1000 && t < 2500);
    const hasLateKeyFrame = keyFrameTimestamps.some((t: number) => t > 2500);

    expect(hasEarlyKeyFrame).toBe(true); // Initial state
    expect(hasMidKeyFrame).toBe(true);   // After first change
    expect(hasLateKeyFrame).toBe(true);  // After second change
  }, 30000);

  it('should not mark minor changes as key frames', async () => {
    // Create HTML with only minor changes
    const minorChangesHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Minor Changes Test</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .counter { font-size: 48px; margin: 20px; }
        </style>
      </head>
      <body>
        <h1>Minor Changes Test</h1>
        <div class="counter" id="counter">0</div>
        <p>This counter updates every second but shouldn't trigger key frames.</p>
        
        <script>
          let count = 0;
          setInterval(() => {
            count++;
            document.getElementById('counter').textContent = count;
          }, 1000);
        </script>
      </body>
      </html>
    `;

    const testPagePath = path.join(testOutputDir, 'minor-test.html');
    await fs.mkdir(testOutputDir, { recursive: true });
    await fs.writeFile(testPagePath, minorChangesHtml);

    const output = execSync(
      `npx tsx ${cliPath} capture --url file://${testPagePath} --name minor-test --duration 5000 --interval 1000 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    const captures = await fs.readdir(testOutputDir);
    const captureDir = captures.find(dir => dir.startsWith('minor-test-'));
    const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Should have fewer key frames since changes are minor
    const keyFrames = manifest.analysis.keyFrames;
    const keyFrameRatio = keyFrames.length / manifest.screenshots.length;
    
    console.log(`Key frame ratio: ${keyFrameRatio} (${keyFrames.length}/${manifest.screenshots.length})`);
    
    // Most screenshots should NOT be key frames
    expect(keyFrameRatio).toBeLessThan(0.5);
  }, 30000);

  it('should detect loading state transitions as key frames', async () => {
    // Create HTML that simulates app loading states
    const loadingStatesHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loading States Test</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f0f0f0; }
          .app-container { background: white; padding: 30px; border-radius: 8px; }
          .spinner { 
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .skeleton {
            background: #e0e0e0;
            border-radius: 4px;
            height: 20px;
            margin: 10px 0;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .content { display: none; }
          .loaded .content { display: block; }
          .loaded .loading { display: none; }
        </style>
      </head>
      <body>
        <div class="app-container" id="app">
          <h1>My Application</h1>
          
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading application...</p>
            <div class="skeleton" style="width: 80%"></div>
            <div class="skeleton" style="width: 60%"></div>
            <div class="skeleton" style="width: 70%"></div>
          </div>
          
          <div class="content">
            <h2>Welcome!</h2>
            <p>Application loaded successfully.</p>
            <button>Get Started</button>
          </div>
        </div>
        
        <script>
          // Simulate loading completion
          setTimeout(() => {
            document.getElementById('app').classList.add('loaded');
          }, 2500);
        </script>
      </body>
      </html>
    `;

    const testPagePath = path.join(testOutputDir, 'loading-test.html');
    await fs.mkdir(testOutputDir, { recursive: true });
    await fs.writeFile(testPagePath, loadingStatesHtml);

    const output = execSync(
      `npx tsx ${cliPath} capture --url file://${testPagePath} --name loading-test --duration 4000 --interval 500 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    const captures = await fs.readdir(testOutputDir);
    const captureDir = captures.find(dir => dir.startsWith('loading-test-'));
    const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Find screenshots with loading indicators
    const loadingScreenshots = manifest.screenshots.filter(
      (s: any) => s.annotations?.loadingIndicators?.length > 0
    );
    const loadedScreenshots = manifest.screenshots.filter(
      (s: any) => !s.annotations?.loadingIndicators?.length && s.annotations?.hasContent
    );

    console.log(`Loading screenshots: ${loadingScreenshots.length}, Loaded screenshots: ${loadedScreenshots.length}`);

    // The transition from loading to loaded should be a key frame
    const transitionScreenshots = manifest.screenshots.filter((s: any, index: number) => {
      if (index === 0) return false;
      const prev = manifest.screenshots[index - 1];
      const hasTransitioned = 
        prev.annotations?.loadingIndicators?.length > 0 && 
        (!s.annotations?.loadingIndicators?.length || s.annotations.loadingIndicators.length === 0);
      return hasTransitioned;
    });

    expect(transitionScreenshots.length).toBeGreaterThan(0);
    
    // Check that at least one transition screenshot is marked as key frame
    const transitionKeyFrames = transitionScreenshots.filter((s: any) => s.annotations?.isKeyFrame);
    expect(transitionKeyFrames.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle pages with no visual changes', async () => {
    // Static HTML with no changes
    const staticHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Static Page</title></head>
      <body>
        <h1>Static Content</h1>
        <p>This page has no dynamic content or changes.</p>
      </body>
      </html>
    `;

    const testPagePath = path.join(testOutputDir, 'static-test.html');
    await fs.mkdir(testOutputDir, { recursive: true });
    await fs.writeFile(testPagePath, staticHtml);

    const output = execSync(
      `npx tsx ${cliPath} capture --url file://${testPagePath} --name static-test --duration 3000 --interval 1000 --output-dir ${testOutputDir}`,
      { encoding: 'utf-8' }
    );

    const captures = await fs.readdir(testOutputDir);
    const captureDir = captures.find(dir => dir.startsWith('static-test-'));
    const manifestPath = path.join(testOutputDir, captureDir!, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Should only have initial and final as key frames
    const keyFrames = manifest.analysis.keyFrames;
    expect(keyFrames.length).toBe(2); // First and last only

    // No intermediate screenshots should be key frames
    const middleKeyFrames = manifest.screenshots
      .slice(1, -1)
      .filter((s: any) => s.annotations?.isKeyFrame);
    expect(middleKeyFrames.length).toBe(0);
  }, 30000);
});