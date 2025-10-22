import { execSync } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// ANSI colors
const colors = {
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

// Load environment variables from .env file
function loadEnv(): void {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

// Check if tmux is installed
function checkTmux(): boolean {
  try {
    execSync('which tmux', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute tmux command
function tmux(command: string): void {
  try {
    execSync(`tmux ${command}`, { stdio: 'inherit' });
  } catch (error) {
    // Ignore errors for kill-session when session doesn't exist
    if (!command.includes('kill-session')) {
      throw error;
    }
  }
}

// Send keys to a specific pane in the tmux session
function sendToPane(pane: number, keys: string, execute: boolean = true): void {
  const sessionName = 'hookdeck-demo';
  const command = execute ? `${keys}\n` : keys;
  execSync(`tmux set-buffer -- "${command}"; tmux paste-buffer -t "${sessionName}:0.${pane}"`, {
    stdio: 'inherit',
  });
}

// Spawn a new terminal window with tmux session
function spawnTerminalWithTmux(sessionName: string, projectDir: string): void {
  const script = `
    tell application "Terminal"
      do script "cd '${projectDir}' && tmux new-session -s ${sessionName}"
      activate
    end tell
  `;
  execSync(`osascript -e '${script}'`, { stdio: 'inherit' });
}

// Wait for user to press Enter
async function waitForUser(message: string): Promise<void> {
  console.log(`\n${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}${message}${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Press ENTER to continue...', () => {
      rl.close();
      resolve();
    });
  });
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const runWalkthroughController = async () => {
  loadEnv();
  const hookdeckUrl = process.env.HOOKDECK_URL;
  const sessionName = 'hookdeck-demo';

  // Controller logic runs in the current terminal window
  // Pane mapping for the 3-way split in the new terminal:
  // Pane 0: WEBHOOK SENDER (left)
  // Pane 1: HOOKDECK CLI (middle)
  // Pane 2: SERVER (right)
  
  const runCommand = async (pane: number, command: string) => {
    sendToPane(pane, command, false); // Type the command without executing
    await waitForUser(`Press ENTER to execute the command in pane ${pane}...`);
    sendToPane(pane, '', true); // Press Enter to execute
  };

  await waitForUser('Scene 1 - Setup and show the noise (40s)\nStarting the server...');
  await runCommand(2, 'npm run server');
  await sleep(2000);

  await waitForUser('Starting hookdeck listen (without filters)...');
  await runCommand(1, 'hookdeck listen 3000 github --path /webhooks/github');
  await sleep(3000);

  await waitForUser('Triggering webhook noise (2 loops)...\nThis will send multiple event types.');
  await runCommand(0, `npm run webhooks -- --url ${hookdeckUrl} --verbose --loops 2`);
  await waitForUser('Scene 1 complete.\nNotice all the different event types coming through.');

  await waitForUser('Scene 2 - Apply session filters (35s)\nStopping hookdeck listen...');
  execSync(`tmux send-keys -t "${sessionName}:0.1" C-c`, { stdio: 'inherit' });
  await sleep(1000);

  await waitForUser('Restarting hookdeck listen WITH session filter...\nFiltering for pull_request events only.');
  await runCommand(1, 'hookdeck listen 3000 github --path /webhooks/github --filter-headers \'{\\"x-github-event\\":\\"pull_request\\"}\'');
  await sleep(3000);

  await waitForUser('Triggering webhooks again (1 loop)...\nOnly pull_request events should come through.');
  await runCommand(0, `npm run webhooks -- --url ${hookdeckUrl} --verbose --loops 1`);
  await waitForUser('Scene 2 complete.\nNotice only pull_request events were received!');

  await waitForUser(
    'Scene 3 - Explore with interactive mode (30s)\n\n' +
      'In the Hookdeck CLI pane, you can:\n' +
      '  ↑↓ - Navigate events\n' +
      '  d  - View details\n' +
      '  r  - Retry delivery\n' +
      '  o  - Open in dashboard\n' +
      '  q  - Quit\n\n' +
      'Try interacting with the events now.'
  );

  await waitForUser(
    'Scene 4 - Wrap-up (10-15s)\n\n' +
      'Demo complete!\n\n' +
      'To stop all processes:\n' +
      '- Ctrl+C in each pane\n' +
      `- Or exit tmux session: 'tmux kill-session -t ${sessionName}'`
  );
  
  console.log(`\n${colors.green}Walkthrough complete!${colors.reset}`);
  console.log(`${colors.yellow}The tmux session is still running in the other terminal window.${colors.reset}`);
  console.log(`${colors.yellow}To close it: tmux kill-session -t ${sessionName}${colors.reset}\n`);
};

// Main walkthrough setup - spawns new terminal and runs controller in current window
const setupTmux = async (): Promise<void> => {
  loadEnv();

  if (!process.env.HOOKDECK_URL) {
    console.error(`${colors.yellow}Warning: HOOKDECK_URL not set in .env file${colors.reset}`);
    process.exit(1);
  }
  if (!checkTmux()) {
    console.error(`${colors.yellow}tmux is not installed. Please install it first.${colors.reset}`);
    process.exit(1);
  }

  const sessionName = 'hookdeck-demo';
  const projectDir = path.join(__dirname, '..');

  console.log(`${colors.green}Starting Hookdeck CLI Demo Walkthrough...${colors.reset}`);
  console.log(`${colors.blue}Opening new terminal window with 3-way split...${colors.reset}\n`);

  // Kill existing session if it exists
  tmux(`kill-session -t ${sessionName}`);
  
  // Spawn a new terminal window with initial tmux session
  spawnTerminalWithTmux(sessionName, projectDir);
  
  // Wait for the terminal and tmux session to be ready
  await sleep(2000);
  
  // Create 3-way horizontal split (side-by-side layout)
  // Pane 0: WEBHOOK SENDER (left)
  // Pane 1: HOOKDECK CLI (middle) - created by first split
  // Pane 2: SERVER (right) - created by second split
  tmux(`split-window -h -t "${sessionName}:0.0"`);
  tmux(`split-window -h -t "${sessionName}:0.1"`);

  // Apply even-horizontal layout for automatic resizing
  // This ensures panes resize evenly when the terminal window is resized
  tmux(`select-layout -t "${sessionName}:0" even-horizontal`);
  
  // Set hook to automatically reapply even-horizontal layout on window resize
  // This enables automatic pane resizing when the terminal window is resized
  tmux(`set-hook -t "${sessionName}" after-resize-pane "select-layout -t '${sessionName}:0' even-horizontal"`);

  const panes = [
    { id: 0, title: 'WEBHOOK SENDER' },
    { id: 1, title: 'HOOKDECK CLI' },
    { id: 2, title: 'SERVER' },
  ];

  // Set up each pane with title and navigate to project directory
  for (const pane of panes) {
    tmux(`select-pane -t "${sessionName}:0.${pane.id}" -T "${pane.title}"`);
    sendToPane(pane.id, `cd '${projectDir}'`);
    sendToPane(pane.id, 'clear');
  }

  // Select the middle pane (Hookdeck CLI) as the initial focus
  tmux(`select-pane -t "${sessionName}:0.1"`);

  console.log(`${colors.green}Terminal window opened with 3-way split:${colors.reset}`);
  console.log(`  ${colors.blue}Left:   WEBHOOK SENDER${colors.reset}`);
  console.log(`  ${colors.blue}Middle: HOOKDECK CLI${colors.reset}`);
  console.log(`  ${colors.blue}Right:  SERVER${colors.reset}\n`);
  
  // Allow presenter to resize window before proceeding
  await waitForUser(
    'Resize the terminal window to your preferred size.\n' +
    'Press ENTER to adjust panes evenly and continue...'
  );
  
  // Reapply even-horizontal layout after user has resized window
  tmux(`select-layout -t "${sessionName}:0" even-horizontal`);
  
  // Run the controller in the current terminal
  console.log(`${colors.green}Controller starting in this window...${colors.reset}\n`);
  await sleep(1000);
  
  // Start the controller directly (no need to spawn it in a pane)
  await runWalkthroughController();
};

// Entry point
setupTmux();