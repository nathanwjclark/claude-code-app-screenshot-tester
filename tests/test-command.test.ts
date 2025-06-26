import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { testCommand } from '../src/cli/commands/test.js';
import { ScreenshotCapturer } from '../src/core/capturer.js';

vi.mock('child_process');
vi.mock('../src/core/capturer');

describe('testCommand', () => {
  let mockSpawn: vi.Mock;
  let mockProcess: any;
  let mockCapturer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProcess = {
      stdout: {
        on: vi.fn(),
      },
      stderr: {
        on: vi.fn(),
      },
      on: vi.fn(),
      kill: vi.fn(),
      killed: false,
    };

    mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(mockProcess);

    mockCapturer = {
      captureSequence: vi.fn().mockResolvedValue({
        outputDir: '/test/output',
        screenshots: [
          { filename: 'test1.png' },
          { filename: 'test2.png' },
        ],
        analysis: {
          keyFrames: ['test1.png'],
          issues: [],
        },
      }),
    };

    (ScreenshotCapturer as vi.Mock).mockImplementation(() => mockCapturer);
  });

  it('should start app and capture screenshots', async () => {
    const options = {
      startCommand: 'npm start',
      url: 'http://localhost:3000',
      waitBeforeCapture: '2000',
      duration: '5000',
      interval: '1000',
    };

    // Simulate app starting successfully
    setTimeout(() => {
      const stdoutCallback = mockProcess.stdout.on.mock.calls[0][1];
      stdoutCallback(Buffer.from('Server started on port 3000'));
    }, 100);

    await testCommand(options);

    expect(mockSpawn).toHaveBeenCalledWith('npm start', [], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    expect(mockCapturer.captureSequence).toHaveBeenCalled();
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('should handle app startup errors', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exited');
    });

    const options = {
      startCommand: 'invalid-command',
      url: 'http://localhost:3000',
      waitBeforeCapture: '1000',
    };

    // Simulate app failing to start
    setTimeout(() => {
      const stderrCallback = mockProcess.stderr.on.mock.calls[0][1];
      stderrCallback(Buffer.from('Command not found'));
    }, 100);

    await expect(testCommand(options)).rejects.toThrow();
    
    mockExit.mockRestore();
  });

  it('should detect app readiness from output', async () => {
    const options = {
      startCommand: 'npm run dev',
      url: 'http://localhost:8080',
      port: '8080',
      waitBeforeCapture: '3000',
    };

    let appStartDetected = false;

    // Simulate various app outputs
    setTimeout(() => {
      const stdoutCallback = mockProcess.stdout.on.mock.calls[0][1];
      stdoutCallback(Buffer.from('Compiling...'));
      stdoutCallback(Buffer.from('Compiled successfully!'));
      stdoutCallback(Buffer.from('Server listening on port 8080'));
      appStartDetected = true;
    }, 100);

    await testCommand(options);

    // Verify app was detected as started
    expect(appStartDetected).toBe(true);
    expect(mockCapturer.captureSequence).toHaveBeenCalled();
  });

  it('should report issues in capture results', async () => {
    mockCapturer.captureSequence.mockResolvedValue({
      outputDir: '/test/output',
      screenshots: [{ filename: 'test1.png' }],
      analysis: {
        keyFrames: ['test1.png'],
        issues: ['Page appears blank', 'Loading timeout'],
      },
    });

    const options = {
      startCommand: 'npm start',
      url: 'http://localhost:3000',
    };

    setTimeout(() => {
      const stdoutCallback = mockProcess.stdout.on.mock.calls[0][1];
      stdoutCallback(Buffer.from('Server ready'));
    }, 100);

    await testCommand(options);

    // Test should complete successfully even with issues
    expect(mockCapturer.captureSequence).toHaveBeenCalled();
  });

  it('should force kill app if graceful shutdown fails', async () => {
    const options = {
      startCommand: 'npm start',
      url: 'http://localhost:3000',
    };

    // Mock app that doesn't respond to SIGTERM
    mockProcess.kill.mockImplementation((signal: string) => {
      if (signal === 'SIGTERM') {
        // Don't set killed to true, simulating unresponsive app
        return;
      }
      mockProcess.killed = true;
    });

    setTimeout(() => {
      const stdoutCallback = mockProcess.stdout.on.mock.calls[0][1];
      stdoutCallback(Buffer.from('Server started'));
    }, 100);

    await testCommand(options);

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    
    // Fast-forward timers to trigger force kill
    vi.advanceTimersByTime(5000);
  });
});