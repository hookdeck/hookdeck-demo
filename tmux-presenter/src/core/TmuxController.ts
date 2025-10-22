import { execSync } from 'child_process';

/**
 * TmuxController manages low-level tmux session and pane operations
 */
export class TmuxController {
  private sessionName: string;

  constructor(sessionName: string) {
    this.sessionName = sessionName;
  }

  /**
   * Check if tmux is installed on the system
   */
  static checkTmuxInstalled(): boolean {
    try {
      execSync('which tmux', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a tmux session exists
   */
  sessionExists(): boolean {
    try {
      execSync(`tmux has-session -t "${this.sessionName}" 2>/dev/null`, {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kill an existing tmux session
   */
  killSession(): void {
    try {
      this.exec(`kill-session -t "${this.sessionName}"`);
    } catch {
      // Session doesn't exist, ignore error
    }
  }

  /**
   * Create a new tmux session
   */
  createSession(workDir: string): void {
    this.exec(`new-session -d -s "${this.sessionName}" -c "${workDir}"`);
  }

  /**
   * Split a pane horizontally or vertically
   */
  splitPane(target: string, horizontal: boolean = true): void {
    const flag = horizontal ? '-h' : '-v';
    this.exec(`split-window ${flag} -t "${target}"`);
  }

  /**
   * Send keys to a specific pane
   */
  sendKeys(target: string, keys: string, execute: boolean = true): void {
    const command = execute ? `${keys}\n` : keys;
    // Escape the command for shell - replace " with \"
    const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    // Use set-buffer and paste-buffer for better handling of special characters
    execSync(`tmux set-buffer -- "${escapedCommand}"; tmux paste-buffer -t "${target}"`, {
      stdio: 'inherit',
    });
  }

  /**
   * Send a signal (like Ctrl+C) to a pane
   */
  sendSignal(target: string, signal: string): void {
    this.exec(`send-keys -t "${target}" ${signal}`);
  }

  /**
   * Set the layout for a window
   */
  setLayout(target: string, layout: string): void {
    this.exec(`select-layout -t "${target}" ${layout}`);
  }

  /**
   * Set pane title
   */
  setPaneTitle(target: string, title: string): void {
    this.exec(`select-pane -t "${target}" -T "${title}"`);
  }

  /**
   * Select/focus a specific pane
   */
  selectPane(target: string): void {
    this.exec(`select-pane -t "${target}"`);
  }

  /**
   * Set a hook for the session
   */
  setHook(hookName: string, command: string): void {
    this.exec(`set-hook -t "${this.sessionName}" ${hookName} "${command}"`);
  }

  /**
   * Spawn a new terminal window with tmux session (macOS specific)
   */
  spawnTerminalWithTmux(projectDir: string): void {
    const script = `
      tell application "Terminal"
        do script "cd '${projectDir}' && tmux attach-session -t ${this.sessionName}"
        activate
      end tell
    `;
    execSync(`osascript -e '${script}'`, { stdio: 'inherit' });
  }

  /**
   * Execute a tmux command
   */
  private exec(command: string): string {
    try {
      return execSync(`tmux ${command}`, { encoding: 'utf8' });
    } catch (error) {
      throw new Error(`Tmux command failed: ${command}\n${error}`);
    }
  }

  /**
   * Get the session name
   */
  getSessionName(): string {
    return this.sessionName;
  }
}