import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger.js';
import { CaptureConfig } from '../types/index.js';

export interface ScreenshotTestConfig {
  // Global settings
  outputDir?: string;
  baselineDir?: string;
  
  // Default capture settings
  defaults?: {
    duration?: number;
    interval?: number;
    viewport?: { width: number; height: number };
    threshold?: number;
    pixelThreshold?: number;
  };
  
  // Predefined test scenarios
  scenarios?: Array<{
    name: string;
    url: string;
    startCommand?: string;
    waitBeforeCapture?: number;
    duration?: number;
    interval?: number;
    viewport?: { width: number; height: number };
    waitFor?: string;
    baseline?: string;
  }>;
  
  // CI/CD settings
  ci?: {
    failOnRegression?: boolean;
    uploadArtifacts?: boolean;
    commentOnPR?: boolean;
    thresholdOverride?: number;
  };
  
  // Performance thresholds
  performance?: {
    maxLoadTime?: number;
    maxDomContentLoaded?: number;
    maxLCP?: number;
    maxCLS?: number;
    maxResourceSize?: number;
    maxRequests?: number;
  };
}

export class ConfigManager {
  private static readonly CONFIG_NAMES = [
    'claude-screenshot.json',
    'screenshot-test.json',
    '.screenshot-test.json',
  ];

  static async loadConfig(configPath?: string): Promise<ScreenshotTestConfig> {
    if (configPath) {
      return this.loadConfigFile(configPath);
    }

    // Try to find config file in current directory
    for (const configName of this.CONFIG_NAMES) {
      try {
        const config = await this.loadConfigFile(configName);
        Logger.info('CONFIG', `Loaded configuration from ${configName}`);
        return config;
      } catch (error) {
        // Continue to next config file
      }
    }

    // No config found, return defaults
    Logger.info('CONFIG', 'No configuration file found, using defaults');
    return this.getDefaultConfig();
  }

  private static async loadConfigFile(filePath: string): Promise<ScreenshotTestConfig> {
    try {
      const configData = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Validate config
      this.validateConfig(config);
      
      return { ...this.getDefaultConfig(), ...config };
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${error}`);
    }
  }

  private static validateConfig(config: any): void {
    // Basic validation
    if (config.defaults?.viewport) {
      const { width, height } = config.defaults.viewport;
      if (!width || !height || width < 100 || height < 100) {
        throw new Error('Invalid viewport dimensions in config');
      }
    }

    if (config.defaults?.duration && config.defaults.duration < 1000) {
      throw new Error('Duration must be at least 1000ms');
    }

    if (config.defaults?.interval && config.defaults.interval < 100) {
      throw new Error('Interval must be at least 100ms');
    }

    if (config.scenarios) {
      for (const scenario of config.scenarios) {
        if (!scenario.name || !scenario.url) {
          throw new Error('Scenario must have name and url');
        }
      }
    }
  }

  private static getDefaultConfig(): ScreenshotTestConfig {
    return {
      outputDir: './screenshots',
      baselineDir: './baselines',
      defaults: {
        duration: 10000,
        interval: 500,
        viewport: { width: 1280, height: 720 },
        threshold: 0.1,
        pixelThreshold: 10,
      },
      scenarios: [],
      ci: {
        failOnRegression: true,
        uploadArtifacts: true,
        commentOnPR: true,
      },
      performance: {
        maxLoadTime: 5000,
        maxDomContentLoaded: 2000,
        maxLCP: 2500,
        maxCLS: 0.1,
        maxResourceSize: 5 * 1024 * 1024, // 5MB
        maxRequests: 50,
      },
    };
  }

  static async createSampleConfig(outputPath: string = 'claude-screenshot.json'): Promise<void> {
    const sampleConfig: ScreenshotTestConfig = {
      outputDir: './screenshots',
      baselineDir: './baselines',
      defaults: {
        duration: 10000,
        interval: 500,
        viewport: { width: 1280, height: 720 },
        threshold: 0.1,
        pixelThreshold: 10,
      },
      scenarios: [
        {
          name: 'homepage',
          url: 'http://localhost:3000',
          startCommand: 'npm run dev',
          waitBeforeCapture: 3000,
          duration: 8000,
          waitFor: '.app-loaded',
        },
        {
          name: 'mobile-homepage',
          url: 'http://localhost:3000',
          viewport: { width: 375, height: 667 },
          duration: 6000,
        },
      ],
      ci: {
        failOnRegression: true,
        uploadArtifacts: true,
        commentOnPR: true,
        thresholdOverride: 0.2,
      },
      performance: {
        maxLoadTime: 5000,
        maxDomContentLoaded: 2000,
        maxLCP: 2500,
        maxCLS: 0.1,
        maxResourceSize: 3 * 1024 * 1024, // 3MB
        maxRequests: 40,
      },
    };

    await fs.writeFile(outputPath, JSON.stringify(sampleConfig, null, 2));
    Logger.success('CONFIG', `Sample configuration created at ${outputPath}`);
  }

  static mergeWithConfig(
    baseConfig: CaptureConfig,
    appConfig: ScreenshotTestConfig,
    scenarioName?: string
  ): CaptureConfig {
    const config = { ...baseConfig };

    // Apply defaults
    if (appConfig.defaults) {
      config.duration = config.duration || appConfig.defaults.duration;
      config.interval = config.interval || appConfig.defaults.interval;
      config.viewport = config.viewport || appConfig.defaults.viewport;
      config.outputDir = config.outputDir || appConfig.outputDir;
    }

    // Apply scenario-specific settings
    if (scenarioName && appConfig.scenarios) {
      const scenario = appConfig.scenarios.find(s => s.name === scenarioName);
      if (scenario) {
        config.url = scenario.url;
        config.duration = scenario.duration || config.duration;
        config.interval = scenario.interval || config.interval;
        config.viewport = scenario.viewport || config.viewport;
        config.waitFor = scenario.waitFor || config.waitFor;
      }
    }

    return config;
  }
}