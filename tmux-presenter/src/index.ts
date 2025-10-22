import * as path from 'path';
import { TmuxController } from './core/TmuxController';
import { PaneManager } from './core/PaneManager';
import { CommandExecutor } from './core/CommandExecutor';
import { PresenterUI } from './core/PresenterUI';
import { ConfigParser } from './parsers/ConfigParser';
import { Presentation } from './models/Presentation';
import { Step } from './models/Step';

/**
 * TmuxPresenter - Main class for running tmux-based presentations
 */
export class TmuxPresenter {
  private presentation?: Presentation;
  private tmuxController?: TmuxController;
  private paneManager?: PaneManager;
  private commandExecutor?: CommandExecutor;
  private ui?: PresenterUI;
  private env: Record<string, string> = {};
  private workDir: string = process.cwd();
  private currentStepIndex: number = 0;

  /**
   * Load a presentation from a YAML configuration file
   */
  async load(configPath: string): Promise<void> {
    // Parse configuration
    this.presentation = ConfigParser.parseYaml(configPath);

    // Get base directory from config file location
    const baseDir = path.dirname(path.resolve(configPath));

    // Load environment variables
    this.env = ConfigParser.loadEnvironment(this.presentation, baseDir);

    // Get working directory
    this.workDir = ConfigParser.getWorkingDirectory(this.presentation, baseDir);

    // Initialize UI
    this.ui = new PresenterUI(this.presentation.steps.length);

    // Initialize tmux controller
    this.tmuxController = new TmuxController(this.presentation.layout.sessionName);

    // Initialize pane manager
    this.paneManager = new PaneManager(this.tmuxController);

    // Initialize command executor
    this.commandExecutor = new CommandExecutor(this.paneManager, this.ui, this.env);
  }

  /**
   * Start the presentation
   */
  async start(): Promise<void> {
    if (!this.presentation || !this.ui || !this.paneManager || !this.commandExecutor) {
      throw new Error('Presentation not loaded. Call load() first.');
    }

    // Check tmux is installed
    if (!TmuxController.checkTmuxInstalled()) {
      throw new Error('tmux is not installed. Please install it first.');
    }

    // Show welcome screen
    this.ui.showWelcome(
      this.presentation.metadata.name,
      this.presentation.metadata.description
    );
    await this.ui.waitForUser('Press ENTER to begin the presentation...');

    // Create pane layout first (creates the tmux session)
    await this.paneManager.createLayout(this.presentation.layout, this.workDir);

    // Additional setup time for session to be ready
    await this.sleep(1000);

    // Spawn terminal if configured (attaches to existing session)
    if (this.presentation.layout.terminal?.spawn && this.tmuxController) {
      this.ui.showMessage('Opening presentation terminal window...');
      this.tmuxController.spawnTerminalWithTmux(this.workDir);
      await this.sleep(2000);
    }

    // Execute steps
    for (let i = 0; i < this.presentation.steps.length; i++) {
      this.currentStepIndex = i;
      await this.executeStep(this.presentation.steps[i], i + 1);
    }

    // Show completion
    this.ui.showCompletion(this.presentation.layout.sessionName);
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: Step, stepNumber: number): Promise<void> {
    if (!this.ui || !this.commandExecutor) {
      throw new Error('Presenter not initialized');
    }

    // Show step title and speaker notes
    this.ui.clear();
    this.ui.showStepTitle(stepNumber, step.title);

    if (step.speakerNotes) {
      this.ui.showSpeakerNotes(step.speakerNotes);
    }

    // Show progress
    this.ui.showProgress(stepNumber, this.presentation!.steps.length);

    // Execute all actions in the step
    for (const action of step.actions) {
      try {
        await this.commandExecutor.executeAction(action);
      } catch (error) {
        this.ui.showError(`Error executing action: ${error}`);
        await this.ui.waitForUser('Press ENTER to continue despite error...');
      }
    }
  }

  /**
   * Get the current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /**
   * Get the presentation
   */
  getPresentation(): Presentation | undefined {
    return this.presentation;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.paneManager) {
      this.paneManager.cleanup();
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export all public interfaces and classes
export { Presentation, PresentationMetadata, Environment } from './models/Presentation';
export { Step, Action, ActionType } from './models/Step';
export { PaneConfig, Layout, TerminalConfig } from './models/PaneConfig';
export { ConfigParser } from './parsers/ConfigParser';
export { TmuxController } from './core/TmuxController';
export { PaneManager } from './core/PaneManager';
export { CommandExecutor } from './core/CommandExecutor';
export { PresenterUI } from './core/PresenterUI';