# tmux-presenter

A framework for creating automated, interactive tmux-based presentations with speaker notes. Perfect for live demos, technical talks, and interactive tutorials.

## Features

- **Declarative Configuration**: Define presentations in YAML with steps, actions, and speaker notes
- **Tmux Integration**: Automatic multi-pane terminal layouts for complex demos
- **Speaker Notes**: Built-in presenter view with markdown-formatted notes
- **Interactive Control**: Step-by-step execution with user prompts
- **Environment Management**: Load environment variables and validate prerequisites
- **Reusable**: Write once, present many times with consistent results

## Installation

### Local Development

```bash
npm install
npm run build
```

### As a Dependency (Future)

```bash
npm install tmux-presenter
```

## Quick Start

1. Create a presentation configuration file (see `docs/presentation-config-sample.md`)
2. Run the presenter:

```bash
tmux-presenter present ./presentation.yaml
```

## Project Structure

```
tmux-presenter/
├── src/
│   ├── core/              # Core framework components
│   │   ├── TmuxController.ts
│   │   ├── PaneManager.ts
│   │   ├── CommandExecutor.ts
│   │   └── PresenterUI.ts
│   ├── models/            # Data models
│   │   ├── Presentation.ts
│   │   ├── Step.ts
│   │   └── PaneConfig.ts
│   ├── parsers/           # Configuration parsers
│   │   └── ConfigParser.ts
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Library exports
├── docs/                  # Documentation
│   ├── tmux-presenter-plan.md
│   └── presentation-config-sample.md
└── examples/              # Example presentations
```

## Documentation

- [Refactoring Plan](./docs/tmux-presenter-plan.md) - Detailed architecture and implementation plan
- [Configuration Sample](./docs/presentation-config-sample.md) - Complete YAML configuration example

## Configuration Format

Presentations are defined in YAML with the following sections:

- **metadata**: Name, duration, description
- **environment**: Environment variables and prerequisites
- **layout**: Tmux session and pane configuration
- **steps**: Presentation steps with actions and speaker notes
- **navigation**: Keyboard shortcuts and auto-advance settings
- **settings**: Display and behavior options

See `docs/presentation-config-sample.md` for a complete example.

## Usage

### Basic Example

```typescript
import { TmuxPresenter } from '@hookdeck/tmux-presenter';

const presenter = new TmuxPresenter();
await presenter.load('./presentation.yaml');
await presenter.start();
```

### Programmatic API

```typescript
import { PresentationBuilder } from '@hookdeck/tmux-presenter';

const presentation = new PresentationBuilder()
  .setTitle('My Demo')
  .addPane({ id: 'main', title: 'Main', position: 'left' })
  .addPane({ id: 'logs', title: 'Logs', position: 'right' })
  .addStep({
    title: 'Step 1',
    speakerNotes: 'Start the demo...',
    actions: [
      { type: 'command', pane: 'main', command: 'echo "Hello"' }
    ]
  })
  .build();

const presenter = new TmuxPresenter();
await presenter.run(presentation);
```

## Action Types

- **command**: Execute a command in a specific pane
- **signal**: Send keyboard signals (e.g., Ctrl+C)
- **pause**: Wait for a specified duration
- **prompt**: Display a message and wait for user input
- **focus**: Switch focus to a specific pane

## Development Status

🚧 **This project is currently in development**

Current status:
- ✅ Architecture designed
- ✅ Configuration schema defined
- ✅ Documentation created
- ⏳ Core components implementation
- ⏳ YAML parser
- ⏳ CLI tool
- ⏳ Testing

## Roadmap

- [ ] Core framework implementation
- [ ] YAML configuration parser
- [ ] CLI tool
- [ ] Example presentations
- [ ] Unit tests
- [ ] NPM publication
- [ ] Recording mode
- [ ] Template library
- [ ] Plugin system

## Contributing

This project is part of the Hookdeck demo repository. Contributions are welcome!

## License

MIT

## Related Projects

- **session-filters**: Hookdeck CLI demo using tmux-presenter
- **deduplication**: Event deduplication demo