import { chromium, Browser, Page, BrowserContext, devices } from 'playwright';
import { BrowserOptions } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
    this.options = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      ...options
    };
  }

  async launch(): Promise<void> {
    try {
      Logger.info('BROWSER', 'Launching Chromium headless browser');
      
      this.browser = await chromium.launch({
        headless: this.options.headless,
      });

      // Configure context options
      let contextOptions: any = {
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
      };

      // Apply device emulation if specified
      if (this.options.deviceName) {
        const device = devices[this.options.deviceName];
        if (device) {
          contextOptions = { ...contextOptions, ...device };
          Logger.info('BROWSER', `Emulating device: ${this.options.deviceName}`);
        } else {
          Logger.warn('BROWSER', `Unknown device: ${this.options.deviceName}`);
        }
      }

      this.context = await this.browser.newContext(contextOptions);

      // Apply network throttling if specified
      if (this.options.throttling) {
        await this.applyThrottling();
      }

      this.page = await this.context.newPage();
      
      Logger.success('BROWSER', 'Browser launched successfully');
    } catch (error) {
      Logger.error('BROWSER', `Failed to launch: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    try {
      Logger.info('BROWSER', `Navigating to ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      Logger.success('BROWSER', 'Navigation successful');
    } catch (error) {
      Logger.error('BROWSER', `Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async screenshot(path: string, fullPage: boolean = false): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    try {
      await this.page.screenshot({ path, fullPage });
      Logger.info('BROWSER', `Screenshot saved to ${path}`);
    } catch (error) {
      Logger.error('BROWSER', `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    await this.page.waitForLoadState(state);
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    return await this.page.evaluate(fn);
  }

  async waitForSelector(selector: string, timeout: number = 30000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    try {
      await this.page.waitForSelector(selector, { timeout });
      Logger.info('BROWSER', `Element found: ${selector}`);
    } catch (error) {
      Logger.warn('BROWSER', `Element not found within timeout: ${selector}`);
      throw error;
    }
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  async close(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      
      this.page = null;
      this.context = null;
      this.browser = null;
      
      Logger.info('BROWSER', 'Browser closed');
    } catch (error) {
      Logger.error('BROWSER', `Error closing browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async applyThrottling(): Promise<void> {
    if (!this.page || !this.options.throttling) return;

    try {
      const { downloadSpeed = 1.5 * 1024 * 1024, uploadSpeed = 750 * 1024, latency = 40 } = this.options.throttling;
      
      // Use CDP session for network throttling
      const client = await this.context!.newCDPSession(this.page);
      
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: downloadSpeed / 8, // Convert to bytes/sec
        uploadThroughput: uploadSpeed / 8,
        latency: latency,
      });
      
      Logger.info('BROWSER', `Applied network throttling: ${downloadSpeed / 1024 / 1024}Mbps down, ${uploadSpeed / 1024}Kbps up, ${latency}ms latency`);
    } catch (error) {
      Logger.warn('BROWSER', `Failed to apply throttling: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static getAvailableDevices(): string[] {
    return Object.keys(devices);
  }
}