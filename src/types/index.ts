export interface BrowserOptions {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  deviceName?: string;
  throttling?: {
    downloadSpeed?: number;
    uploadSpeed?: number;
    latency?: number;
  };
}

export interface CaptureConfig {
  url: string;
  name?: string;
  duration?: number;
  interval?: number;
  outputDir?: string;
  viewport?: {
    width: number;
    height: number;
  };
  waitFor?: string;
  keyFramesOnly?: boolean;
  device?: string;
  throttling?: string;
}

export interface Screenshot {
  filename: string;
  timestamp: number;
  phase: 'initial' | 'loading' | 'final';
  annotations?: {
    blankScreen?: boolean;
    hasContent?: boolean;
    loadingIndicators?: string[];
    hasErrors?: boolean;
    errorMessages?: string[];
    isKeyFrame?: boolean;
  };
}

export interface CaptureResult {
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
  performance?: {
    metrics: any[];
    summary: any;
  };
  outputDir: string;
}

export interface LoadingStrategy {
  name: string;
  detect(page: any): Promise<boolean>;
}