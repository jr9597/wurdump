# Wurdump 📋✨

**AI-Enhanced Clipboard Tool for macOS**

A modern, local desktop application built with Tauri 2.0 that monitors your system clipboard and provides intelligent AI transformations when pasting. Perfect for developers, writers, and power users who want to supercharge their clipboard workflow.

## 🚀 Features

### ✅ MVP Phase 1 - Core Functionality (Completed)
- **Global Hotkey**: Configurable system-wide shortcut (default: `Cmd+Shift+V`)
- **Floating Panel UI**: Beautiful 300x400px panel that appears above all windows
- **Clipboard Monitoring**: Real-time detection of clipboard changes
- **Content Type Detection**: Automatically identifies code, text, JSON, URLs, emails, etc.
- **Modern UI**: Glass-morphism design with dark mode support

### ✅ MVP Phase 2 - AI Integration (Completed)
- **Local AI Processing**: Integrates OpenAI's gpt-oss-20b model via Ollama for offline processing
- **Smart Transformations**: 
  - Code language conversion (Python → TypeScript, etc.)
  - Text formatting and cleanup
  - Email tone improvement
  - Data format switching (JSON ↔ CSV)
  - Content summarization and explanation
- **Custom AI Prompts**: Tell the AI exactly what to do with your clipboard content
- **AI Status Indicator**: Real-time status showing if Ollama/gpt-oss is available
- **Setup Guidance**: Built-in instructions for users to set up local AI

### 📚 MVP Phase 3 - History & Search (Planned)
- **SQLite Database**: Persistent storage of clipboard history
- **Searchable History**: Full-text search through past clipboard items
- **Smart Organization**: Auto-tagging and categorization
- **Favorites**: Mark important clipboard items

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Tauri 2.0 + Rust
- **Database**: SQLite (for clipboard history)
- **AI**: OpenAI gpt-oss-20b (local processing)
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📦 Installation & Setup

### Prerequisites

1. **Rust**: Install from [rustup.rs](https://rustup.rs/)
2. **Node.js**: Version 18+ recommended
3. **gpt-oss model**: Download from [OpenAI gpt-oss repository](https://github.com/openai/gpt-oss)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jerrodkim/wurdump.git
cd wurdump

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev
```

### Building for Production

```bash
# Build the application
npm run tauri:build
```

## 🎯 Usage

1. **Launch Wurdump**: The app runs in the background with a system tray icon
2. **Copy Content**: Copy any text, code, or data to your clipboard
3. **Activate Panel**: Press `Cmd+Shift+V` (or your configured hotkey)
4. **AI Transform**: Type a custom prompt or choose from suggested transformations
5. **Apply & Copy**: Click any transformation to copy it back to your clipboard

### Example Transformations

- **Code Conversion**: "Convert this Python code to TypeScript"
- **Text Formatting**: "Make this more professional for an email"
- **Data Processing**: "Convert this CSV to JSON format"
- **Language**: "Translate this to Spanish"
- **Cleanup**: "Fix grammar and spelling errors"

## 🏗 Architecture

### Project Structure

```
wurdump/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service layer
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands.rs    # Tauri command handlers
│   │   ├── database.rs    # SQLite operations
│   │   ├── clipboard_monitor.rs  # Clipboard monitoring
│   │   └── content_detection.rs # Content type detection
│   └── Cargo.toml        # Rust dependencies
└── README.md
```

### Key Components

- **ClipboardPanel**: Main floating UI panel
- **ClipboardItem**: Individual clipboard item display
- **AITransformationList**: Shows available AI transformations
- **ContentDetector**: Analyzes clipboard content type
- **Database**: SQLite storage for clipboard history

## 🔧 Configuration

### Global Hotkey
Default: `Cmd+Shift+V`
- Configurable through settings panel
- Registers system-wide shortcut
- Works across all applications

### AI Model Setup
1. Download gpt-oss-20b model from OpenAI
2. Configure model path in settings
3. Local processing ensures privacy

### Privacy Settings
- **History Storage**: Toggle clipboard history saving
- **Auto-delete**: Configure automatic cleanup
- **Excluded Apps**: Prevent monitoring specific applications
- **Sensitive Content**: Filter out passwords/keys

## 🚀 Development

### Adding New Features

1. **Frontend Components**: Add to `src/components/`
2. **Tauri Commands**: Add to `src-tauri/src/commands.rs`
3. **Database Operations**: Extend `src-tauri/src/database.rs`
4. **Type Definitions**: Update `src/types/`

### Code Style

- Follow the `.cursorrules` file for consistent formatting
- Use TypeScript for all frontend code
- Add JSDoc comments for all functions
- Implement proper error handling

### Testing

```bash
# Run frontend tests
npm test

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml
```

## 🛣 Roadmap

### Phase 1: Core MVP ✅
- [x] Tauri 2.0 setup
- [x] Global hotkey registration
- [x] Floating panel UI
- [x] Basic clipboard monitoring
- [x] Content type detection

### Phase 2: AI Integration 🔄
- [ ] gpt-oss model integration
- [ ] AI transformation engine
- [ ] Custom prompt processing
- [ ] Smart content suggestions

### Phase 3: Enhanced Features 📋
- [ ] SQLite database implementation
- [ ] Search functionality
- [ ] Settings panel
- [ ] Clipboard history management
- [ ] Export/import functionality

### Phase 4: Polish & Distribution 🚀
- [ ] App store distribution
- [ ] Auto-updater
- [ ] Performance optimizations
- [ ] Advanced AI features
- [ ] Plugin system

## 🤝 Contributing

This project was created for the OpenAI hackathon and is open for contributions!

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Areas for Contribution
- AI model integrations
- UI/UX improvements
- Performance optimizations
- Additional content type detection
- New transformation types

## 📄 License

MIT License - feel free to use this project as a starting point for your own clipboard tools!

## 🙏 Acknowledgments

- **OpenAI**: For the gpt-oss models and hackathon inspiration
- **Tauri Team**: For the amazing cross-platform framework
- **Rust Community**: For the excellent ecosystem
- **React Team**: For the solid frontend foundation

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Feature Requests**: Use GitHub Discussions
- **Questions**: Check the documentation or open a discussion

---

**Made with ❤️ for the OpenAI Hackathon**

Transform your clipboard workflow with AI-powered intelligence! 🚀