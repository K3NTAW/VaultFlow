# VaultFlow — AI-Powered Visual Notebook

A desktop application combining Notion-style block editing, Excalidraw canvas workspace, NotebookLM-like AI assistance, and Obsidian-style vault management.

## Features

- 🧱 **Notion-Style Block Editor** - Rich text editing with Tiptap
- 🎨 **Excalidraw Canvas** - Freeform drawing and diagramming
- 🧠 **AI Assistant** - Context-aware Q&A powered by OpenAI with RAG
- 📁 **Vault System** - Organize notes and canvases in a user-selected folder
- 🧭 **Hybrid Navigation** - Sidebar tree + breadcrumbs + terminal-style commands
- ⌨️ **Command Palette** - Quick actions with keyboard shortcuts

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Shadcn/UI
- **Desktop Shell:** Tauri (Rust backend + WebView frontend)
- **Editor:** Tiptap
- **Canvas:** Excalidraw
- **AI:** OpenAI API with simple RAG implementation
- **State Management:** Zustand
- **Command Palette:** Kbar
- **Search:** Fuse.js (ready for implementation)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Rust (for Tauri builds)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run tauri:dev
```

This will:
- Start the Next.js dev server
- Launch the Tauri desktop app

### Building for Production

```bash
npm run tauri:build
```

Builds will be in `src-tauri/target/release/`

## Project Structure

```
/src
  /app              - Next.js app router pages
  /components       - React components
    /ui             - Shadcn/UI base components
    Sidebar.tsx     - Vault folder tree
    Breadcrumbs.tsx - Path navigation
    TerminalNav.tsx - Terminal-style commands
    CommandPalette.tsx - Kbar command palette
    Editor.tsx      - Tiptap editor
    Canvas.tsx      - Excalidraw canvas
    AIPanel.tsx    - AI assistant sidebar
  /lib
    vault.ts        - Tauri FS operations
    ai.ts           - OpenAI RAG implementation
    navParser.ts    - Terminal command parser
  /store            - Zustand stores
/src-tauri          - Tauri Rust backend
```

## Usage

### First Launch

1. Select a vault folder when prompted
2. Your vault path is saved and persisted

### Creating Notes

- Use Command Palette (`Ctrl/Cmd + K`) → "New Note"
- Or use terminal: `open new-note.md` (creates if doesn't exist)

### Creating Canvases

- Use Command Palette → "New Canvas"
- Opens in Excalidraw view

### Navigation

- **Sidebar:** Click folders/files to navigate
- **Breadcrumbs:** Click path segments to go back
- **Terminal:** Type commands like `ls`, `cd folder`, `open file.md`
- **Command Palette:** `Ctrl/Cmd + K` for quick actions

### AI Assistant

1. Set your OpenAI API key (stored locally)
2. Ask questions in the AI panel on the right
3. AI searches your vault notes and provides contextual answers with citations

## Development Notes

### Tauri Plugins Used

- `tauri-plugin-dialog` - Folder/file picker
- `tauri-plugin-fs` - File system operations
- `tauri-plugin-store` - Persistent settings storage

### State Management

- `useVaultStore` - Vault path and current file
- `useNavStore` - Navigation path and terminal visibility
- `useAIStore` - AI messages and processing state

### Future Enhancements

- Vector embeddings for better RAG (Supabase Vector, Pinecone, etc.)
- File watching for live vault updates
- Multi-vault switching
- Shell autocomplete in terminal
- Markdown backlinks and graph view
- Plugin system

## License

MIT

# VaultFlow
