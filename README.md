# Wurdump 📋✨

**AI-Enhanced Clipboard Tool for macOS**

A modern, local desktop application built with Tauri 2.0 that monitors your system clipboard and provides intelligent AI transformations when pasting. Perfect for developers, writers, and power users who want to supercharge their clipboard workflow.

## 🚀 Features

### ✅ Core Functionality (Completed)
- **Global Hotkey**: Configurable system-wide shortcut (default: `Cmd+Shift+V`)
- **Floating Panel UI**: Beautiful 300x400px panel that appears above all windows
- **Clipboard Monitoring**: Real-time detection of clipboard changes
- **Local AI Processing**: Integrates OpenAI's gpt-oss-20b model via Ollama for offline processing
- **Custom AI Prompts**: Tell the AI exactly what to do with your clipboard content


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
npm run tauri:dev
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

## 🔧 Configuration

### Global Hotkey
Default: `Cmd+Shift+V`
- Configurable through settings panel
- Registers system-wide shortcut
- Works across all applications

### AI Model Setup
1. Currently works with gpt-oss:20b run locally with Ollama at http://localhost:11434
2. Download ollama -> ollama pull gpt-oss:20b -> ollama run gpt-oss:20b -> (ollama run also automatically serves the model at localhost:11434)
3. For more info: https://cookbook.openai.com/articles/gpt-oss/run-locally-ollama

**Made with ❤️ for the OpenAI Hackathon**

Transform your clipboard workflow with AI-powered intelligence! 🚀