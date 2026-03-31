/**
 * Python Bridge
 * 
 * Handles spawning the Python agent process and communicating with it
 * via stdin/stdout JSON messages.
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { app } from 'electron';

export class PythonBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer: string = '';

  constructor() {
    super();
  }

  /**
   * Get the path to the Python executable (prefer venv)
   */
  private getPythonPath(): string {
    const agentPath = this.getAgentPath();
    
    // Check for virtual environment first
    const venvPaths = [
      path.join(agentPath, 'venv', 'bin', 'python'),      // Mac/Linux
      path.join(agentPath, 'venv', 'Scripts', 'python.exe'), // Windows
      path.join(agentPath, '.venv', 'bin', 'python'),     // Alternative name
      path.join(agentPath, '.venv', 'Scripts', 'python.exe'),
    ];
    
    for (const venvPython of venvPaths) {
      if (fs.existsSync(venvPython)) {
        console.log(`Found Python venv: ${venvPython}`);
        return venvPython;
      }
    }
    
    // Fall back to system Python
    const pythonCommands = ['python3', 'python'];
    
    for (const cmd of pythonCommands) {
      try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        console.log(`Using system Python: ${cmd}`);
        return cmd;
      } catch {
        continue;
      }
    }
    
    return 'python3';
  }

  /**
   * Get the path to the agent directory
   */
  private getAgentPath(): string {
    if (app.isPackaged) {
      // In production, agent is in resources
      return path.join(process.resourcesPath, 'agent');
    } else {
      // In development, agent is sibling to electron folder
      return path.join(__dirname, '../../agent');
    }
  }

  /**
   * Start the Python agent process
   */
  start(): void {
    if (this.process) {
      console.log('Python agent is already running');
      return;
    }

    const pythonPath = this.getPythonPath();
    const agentPath = this.getAgentPath();
    const mainScript = path.join(agentPath, 'main.py');

    // Check if agent exists
    if (!fs.existsSync(mainScript)) {
      this.emit('error', `Agent script not found: ${mainScript}`);
      return;
    }

    console.log(`Starting Python agent: ${pythonPath} ${mainScript}`);
    console.log(`Agent directory: ${agentPath}`);

    this.process = spawn(pythonPath, [mainScript], {
      cwd: agentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Disable Python output buffering
      },
    });

    // Handle stdin errors (EPIPE when Python exits while we're writing).
    this.process.stdin?.on('error', (err: any) => {
      console.warn('Python stdin error (process may be shutting down):', err?.code || err?.message);
    });

    // Handle stdout (JSON messages from Python)
    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleOutput(data.toString());
    });

    // Handle stderr (logs from Python)
    this.process.stderr?.on('data', (data: Buffer) => {
      console.log('[Python]', data.toString().trim());
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      console.log(`Python agent exited with code ${code}`);
      this.process = null;
      this.emit('exit', code);
    });

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('Failed to start Python agent:', error);
      this.emit('error', error.message);
    });
  }

  /**
   * Stop the Python agent process
   */
  stop(): void {
    if (!this.process) {
      return;
    }

    // Send stop command
    this.send({ type: 'stop' });

    // Give it a moment to clean up, then force kill
    setTimeout(() => {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
    }, 2000);
  }

  /**
   * Check if the agent is running
   */
  isRunning(): boolean {
    return this.process !== null;
  }

  /**
   * Send a message to the Python agent
   */
  send(message: object): void {
    if (!this.process?.stdin || this.process.killed) {
      console.error('Cannot send message: Python agent not running');
      return;
    }

    const json = JSON.stringify(message);
    try {
      this.process.stdin.write(json + '\n');
    } catch (err: any) {
      // The Python process may have exited between the check and the write.
      // EPIPE / ERR_STREAM_DESTROYED are expected during shutdown — log and move on.
      console.warn('Failed to write to Python stdin (process may be shutting down):', err?.code || err?.message);
    }
  }

  /**
   * Handle output from Python (may be partial JSON lines)
   */
  private handleOutput(data: string): void {
    this.buffer += data;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        // Not JSON, might be a log message
        console.log('[Python stdout]', line);
      }
    }
  }

  /**
   * Handle a parsed message from Python
   */
  private handleMessage(message: any): void {
    const { type, data } = message;

    switch (type) {
      case 'ready':
        this.emit('ready');
        break;
      case 'alert':
        this.emit('alert', data);
        break;
      case 'status':
        this.emit('status', data);
        break;
      case 'login_success':
        this.emit('login-success', data);
        break;
      case 'login_error':
        this.emit('login-error', message.error || 'Login failed');
        break;
      case 'auth_synced':
        this.emit('auth-synced', data);
        break;
      case 'preferences_applied':
        this.emit('preferences-applied', data);
        break;
      case 'device_registered':
        this.emit('device-registered', data);
        break;
      case 'local-events':
        this.emit('local-events', data);
        break;
      case 'local-alerts':
        this.emit('local-alerts', data);
        break;
      case 'local-stats':
        this.emit('local-stats', data);
        break;
      case 'email-config-result':
        this.emit('email-config-result', data);
        break;
      default:
        console.log('Unknown message type from Python:', type);
    }
  }
}