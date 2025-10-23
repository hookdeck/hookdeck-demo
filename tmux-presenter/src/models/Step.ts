/**
 * Action types that can be performed during a presentation step
 */
export type ActionType = 'command' | 'signal' | 'pause' | 'prompt' | 'focus' | 'capture' | 'keypress';

/**
 * Action to be performed during a step
 */
export interface Action {
  type: ActionType;
  pane?: string;
  command?: string;
  signal?: string;
  duration?: number;
  message?: string;
  prompt?: string;
  wait?: boolean;
  // Command action properties
  captureOutput?: boolean;  // Start pipe-pane before executing command
  typeSpeed?: number;
  // Capture action properties
  pattern?: string;
  variable?: string;
  timeout?: number;
  // Keypress action properties
  key?: string;
  pause?: number;
}

/**
 * A step in the presentation
 */
export interface Step {
  id: string;
  title: string;
  duration?: string;
  speakerNotes?: string;
  actions: Action[];
}