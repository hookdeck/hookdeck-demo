import { TmuxController } from './TmuxController';
import { Layout, PaneConfig } from '../models/PaneConfig';

/**
 * Pane represents a managed tmux pane with its metadata
 */
class Pane {
  constructor(
    public id: string,
    public index: number,
    public title: string
  ) {}

  getTarget(sessionName: string): string {
    return `${sessionName}:0.${this.index}`;
  }
}

/**
 * PaneManager handles pane lifecycle and layout management
 */
export class PaneManager {
  private panes: Map<string, Pane> = new Map();
  private tmux: TmuxController;
  private sessionName: string;

  constructor(tmux: TmuxController) {
    this.tmux = tmux;
    this.sessionName = tmux.getSessionName();
  }

  /**
   * Create the entire pane layout from configuration
   */
  async createLayout(config: Layout, workDir: string): Promise<void> {
    // Kill existing session if it exists
    if (this.tmux.sessionExists()) {
      this.tmux.killSession();
    }

    // Create new session
    this.tmux.createSession(workDir);

    // Wait for session to be ready
    await this.sleep(500);

    // Create additional panes (first pane already exists)
    for (let i = 1; i < config.panes.length; i++) {
      const target = `${this.sessionName}:0.${i - 1}`;
      this.tmux.splitPane(target, true);
    }

    // Apply even-horizontal layout for automatic resizing
    this.tmux.setLayout(`${this.sessionName}:0`, 'even-horizontal');

    // Set hook to automatically reapply layout on window resize
    this.tmux.setHook(
      'after-resize-pane',
      `select-layout -t '${this.sessionName}:0' even-horizontal`
    );

    // Initialize each pane
    for (const [index, paneConfig] of config.panes.entries()) {
      const pane = new Pane(paneConfig.id, index, paneConfig.title);
      this.panes.set(paneConfig.id, pane);

      // Set pane title
      this.tmux.setPaneTitle(pane.getTarget(this.sessionName), paneConfig.title);

      // Navigate to working directory
      this.executeCommand(paneConfig.id, `cd '${workDir}'`);

      // Run initial command if specified
      if (paneConfig.initialCommand) {
        this.executeCommand(paneConfig.id, paneConfig.initialCommand);
      }
    }

    // Focus the default pane
    const defaultPane = config.panes.find((p) => p.defaultFocus);
    if (defaultPane) {
      this.focusPane(defaultPane.id);
    }
  }

  /**
   * Execute a command in a specific pane
   */
  executeCommand(paneId: string, command: string, execute: boolean = true): void {
    const pane = this.getPaneOrThrow(paneId);
    this.tmux.sendKeys(pane.getTarget(this.sessionName), command, execute);
  }

  /**
   * Send a signal to a specific pane
   */
  sendSignal(paneId: string, signal: string): void {
    const pane = this.getPaneOrThrow(paneId);
    this.tmux.sendSignal(pane.getTarget(this.sessionName), signal);
  }

  /**
   * Focus a specific pane
   */
  focusPane(paneId: string): void {
    const pane = this.getPaneOrThrow(paneId);
    this.tmux.selectPane(pane.getTarget(this.sessionName));
  }

  /**
   * Get a pane by ID or throw error
   */
  private getPaneOrThrow(paneId: string): Pane {
    const pane = this.panes.get(paneId);
    if (!pane) {
      throw new Error(`Pane '${paneId}' not found`);
    }
    return pane;
  }

  /**
   * Check if a pane exists
   */
  hasPane(paneId: string): boolean {
    return this.panes.has(paneId);
  }

  /**
   * Get all pane IDs
   */
  getPaneIds(): string[] {
    return Array.from(this.panes.keys());
  }

  /**
   * Clean up - kill the session
   */
  cleanup(): void {
    this.tmux.killSession();
    this.panes.clear();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}