import { Action } from '../models/Step';
import { PaneManager } from './PaneManager';
import { PresenterUI } from './PresenterUI';

/**
 * CommandExecutor handles execution of different action types
 */
export class CommandExecutor {
  private paneManager: PaneManager;
  private ui: PresenterUI;
  private env: Record<string, string>;

  constructor(paneManager: PaneManager, ui: PresenterUI, env: Record<string, string> = {}) {
    this.paneManager = paneManager;
    this.ui = ui;
    this.env = env;
  }

  /**
   * Execute a single action
   */
  async executeAction(action: Action): Promise<void> {
    switch (action.type) {
      case 'command':
        await this.executeCommand(action);
        break;
      case 'signal':
        await this.executeSignal(action);
        break;
      case 'pause':
        await this.executePause(action);
        break;
      case 'prompt':
        await this.executePrompt(action);
        break;
      case 'focus':
        await this.executeFocus(action);
        break;
      default:
        throw new Error(`Unknown action type: ${(action as Action).type}`);
    }
  }

  /**
   * Execute a command action
   */
  private async executeCommand(action: Action): Promise<void> {
    if (!action.pane) {
      throw new Error('Command action requires a pane');
    }
    if (!action.command) {
      throw new Error('Command action requires a command');
    }

    // Substitute environment variables
    const command = this.substituteEnvVars(action.command);

    if (action.wait && action.prompt) {
      // Type the command without executing, wait for user, then execute
      this.paneManager.executeCommand(action.pane, command, false);
      await this.ui.waitForUser(action.prompt);
      this.paneManager.executeCommand(action.pane, '', true); // Press Enter
    } else if (action.wait) {
      // Wait before executing
      this.paneManager.executeCommand(action.pane, command, false);
      await this.ui.waitForUser();
      this.paneManager.executeCommand(action.pane, '', true);
    } else {
      // Execute immediately
      this.paneManager.executeCommand(action.pane, command, true);
    }
  }

  /**
   * Execute a signal action (e.g., Ctrl+C)
   */
  private async executeSignal(action: Action): Promise<void> {
    if (!action.pane) {
      throw new Error('Signal action requires a pane');
    }
    if (!action.signal) {
      throw new Error('Signal action requires a signal');
    }

    if (action.wait && action.prompt) {
      await this.ui.waitForUser(action.prompt);
    }

    this.paneManager.sendSignal(action.pane, action.signal);
  }

  /**
   * Execute a pause action
   */
  private async executePause(action: Action): Promise<void> {
    if (!action.duration) {
      throw new Error('Pause action requires a duration');
    }

    await this.sleep(action.duration);
  }

  /**
   * Execute a prompt action
   */
  private async executePrompt(action: Action): Promise<void> {
    if (!action.message) {
      throw new Error('Prompt action requires a message');
    }

    this.ui.showMessage(action.message);
    await this.ui.waitForUser();
  }

  /**
   * Execute a focus action
   */
  private async executeFocus(action: Action): Promise<void> {
    if (!action.pane) {
      throw new Error('Focus action requires a pane');
    }

    this.paneManager.focusPane(action.pane);
  }

  /**
   * Substitute environment variables in a string
   */
  private substituteEnvVars(str: string): string {
    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = this.env[varName] || process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not defined`);
      }
      return value;
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}