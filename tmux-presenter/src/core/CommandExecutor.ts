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
      case 'capture':
        await this.executeCapture(action);
        break;
      case 'keypress':
        await this.executeKeypress(action);
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
      // Wait before executing - provide default clear prompt
      this.paneManager.executeCommand(action.pane, command, false);
      await this.ui.waitForUser('⏸️  Press ENTER to execute the command...');
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
    } else if (action.wait) {
      // Provide default clear prompt when wait is true but no prompt provided
      await this.ui.waitForUser(`⏸️  Press ENTER to send signal ${action.signal}...`);
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
   * Execute a capture action
   *
   * IMPORTANT: Window Resize Workaround for TUI Applications
   *
   * This action captures text from a tmux pane using regex pattern matching.
   * For TUI applications (like Hookdeck CLI) that truncate output based on terminal width,
   * this implementation uses a temporary window resize workaround:
   *
   * 1. Saves the original terminal window size
   * 2. Temporarily resizes the window to 5000px wide (to maximize column count)
   * 3. Waits for the TUI to detect the resize and re-render with full content
   * 4. Captures the content using tmux capture-pane
   * 5. Immediately restores the original window size
   *
   * NOTE FOR PRESENTERS: You may see a brief "flash" where the terminal window
   * expands very wide during capture (~1 second). This is expected behavior and
   * necessary to capture truncated URLs or long text that doesn't fit in the
   * normal terminal width. The window returns to normal size immediately after.
   *
   * This workaround is macOS-specific and uses AppleScript to control Terminal.app.
   */
  private async executeCapture(action: Action): Promise<void> {
    if (!action.pane) {
      throw new Error('Capture action requires a pane');
    }
    if (!action.pattern) {
      throw new Error('Capture action requires a pattern');
    }
    if (!action.variable) {
      throw new Error('Capture action requires a variable');
    }

    const timeout = action.timeout || 5000;
    const startTime = Date.now();
    const pollInterval = 100;
    
    // Get the full window width
    const windowWidth = this.paneManager.getWindowWidth(action.pane);
    console.log(`🖥️  Terminal window width: ${windowWidth} columns`);
    
    try {
      // Save original terminal window size
      const originalSize = this.paneManager.getTerminalWindowSize();
      console.log(`💾 Original window size: ${originalSize.width}x${originalSize.height}px`);
      
      // Temporarily make the window MUCH wider to get more columns
      // This forces TUI applications to re-render and display full content
      console.log(`🖥️  Resizing window to 5000x${originalSize.height}px to maximize columns...`);
      this.paneManager.resizeTerminalWindow(5000, originalSize.height);
      
      // Give the terminal time to resize (this triggers TUI refresh)
      await this.sleep(1000);
      
      // Trigger TUI refresh to ensure it re-renders with new width
      this.paneManager.refreshPane(action.pane);
      await this.sleep(500);
      
      // Poll using capture-pane to get the re-rendered display
      while (Date.now() - startTime < timeout) {
        try {
          // Capture pane content using tmux capture-pane
          const content = this.paneManager.captureContent(action.pane);
          
          // Debug: show what we're capturing
          if (content.length > 0) {
            console.log(`📝 Captured ${content.length} bytes from pane ${action.pane}`);
            
            // Find and log lines containing the URL pattern
            const lines = content.split('\n');
            const urlLines = lines.filter(line => line.includes('hkdk.events'));
            if (urlLines.length > 0) {
              console.log(`   Found ${urlLines.length} lines with 'hkdk.events':`);
              urlLines.forEach((line, idx) => {
                console.log(`     Line ${idx + 1}: "${line}"`);
              });
            }
            
            // Try removing all whitespace and newlines to find the URL
            const cleanContent = content.replace(/\s+/g, ' ');
            console.log(`   Checking for URL in cleaned content (first 300 chars): ${cleanContent.substring(0, 300)}`);
          }
          
          const regex = new RegExp(action.pattern);
          const match = regex.exec(content);

          if (match) {
            const capturedValue = match[0];
            // Store in both env objects for consistency
            this.env[action.variable] = capturedValue;
            process.env[action.variable] = capturedValue;
            console.log(`✓ Captured "${capturedValue}" into ${action.variable}`);
            
            // Restore original window size
            console.log(`🖥️  Restoring window to ${originalSize.width}x${originalSize.height}px...`);
            this.paneManager.resizeTerminalWindow(originalSize.width, originalSize.height);
            await this.sleep(300);
            
            return;
          }
        } catch (error) {
          // Continue polling if capture fails
          console.warn(`⚠ Capture attempt failed: ${(error as Error).message}`);
        }

        // Wait before polling again
        await this.sleep(pollInterval);
      }

      throw new Error(
        `Pattern "${action.pattern}" not found in pane ${action.pane} within ${timeout}ms`
      );
    } finally {
      // Always restore original window size
      try {
        const originalSize = this.paneManager.getTerminalWindowSize();
        console.log(`🖥️  Restoring window to original size...`);
        // Note: originalSize might not be available in error case, so just try to restore
        this.paneManager.resizeTerminalWindow(originalSize.width, originalSize.height);
      } catch (restoreError) {
        console.warn(`⚠ Failed to restore window size: ${(restoreError as Error).message}`);
      }
    }
  }

  /**
   * Execute a keypress action
   */
  private async executeKeypress(action: Action): Promise<void> {
    if (!action.pane) {
      throw new Error('Keypress action requires a pane');
    }
    if (!action.key) {
      throw new Error('Keypress action requires a key');
    }

    try {
      const tmuxKey = this.mapKeyToTmux(action.key);
      this.paneManager.sendKeypress(action.pane, tmuxKey);

      if (action.pause && action.pause > 0) {
        await this.sleep(action.pause);
      }
    } catch (error) {
      throw new Error(
        `Failed to send keypress "${action.key}" to pane ${action.pane}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Map key names to tmux key names
   */
  private mapKeyToTmux(key: string): string {
    const keyMap: { [key: string]: string } = {
      Up: 'Up',
      Down: 'Down',
      Left: 'Left',
      Right: 'Right',
      ESC: 'Escape',
      Enter: 'Enter',
      Space: 'Space',
      Tab: 'Tab',
    };

    return keyMap[key] || key;
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