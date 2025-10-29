# VaultFlow — Feature List & Development Plan

## 📋 Feature List

### ✅ Implemented Features (MVP)

#### Core Vault System
- [x] **Vault Selection** - Native folder picker on first launch
- [x] **Vault Persistence** - Saves selected vault path using Tauri store
- [x] **File System Integration** - Full CRUD operations via Tauri FS APIs
  - [x] Read directory contents (recursive)
  - [x] Read text files
  - [x] Write files (auto-save)
  - [x] Delete files
  - [x] Path resolution and navigation

#### Navigation System
- [x] **Sidebar Navigation** - Recursive folder tree with expand/collapse
  - [x] Visual indicators for files (📄 notes, 🎨 canvases)
  - [x] Click to navigate/open files
  - [x] Auto-refresh on vault changes
- [x] **Breadcrumb Navigation** - Clickable path segments
  - [x] Shows current file or directory
  - [x] Quick navigation to parent directories
- [x] **Terminal-Style Commands** - Keyboard-driven navigation
  - [x] `ls` / `list` - List directory contents
  - [x] `cd <path>` - Change directory
  - [x] `cd ..` - Go up one level
  - [x] `cd /` - Go to vault root
  - [x] `open <filename>` - Open notes/canvases
  - [x] `clear` - Clear terminal output
  - [x] `pwd` - Show current path
  - [x] `help` - Show command help
  - [x] Command history (arrow keys)
  - [x] Toggle terminal with `Ctrl+~`
- [x] **Command Palette** - Quick actions via `Ctrl/Cmd + K`
  - [x] New Note creation
  - [x] New Canvas creation
  - [x] AI Summarize command
  - [x] Switch Vault
  - [x] Search Notes (placeholder)
  - [x] Toggle Terminal
  - [x] Fuzzy search with Kbar
  - [x] Keyboard shortcuts

#### Editor System
- [x] **Tiptap Rich Text Editor** - Notion-style block editor
  - [x] StarterKit extensions (headings, lists, bold, italic, etc.)
  - [x] Auto-save on content change (debounced)
  - [x] Markdown file support (.md)
  - [x] Visual file indicator in header
  - [x] Save status indicator

#### Canvas System
- [x] **Excalidraw Integration** - Full drawing canvas
  - [x] Native Excalidraw component
  - [x] Auto-save on changes (debounced)
  - [x] JSON file format (.excalidraw.json)
  - [x] Canvas state persistence
  - [x] Visual file indicator in header

#### AI Assistant
- [x] **AI Panel** - Right sidebar assistant
  - [x] OpenAI API integration
  - [x] RAG (Retrieval Augmented Generation) pipeline
  - [x] Context-aware responses from vault content
  - [x] Citation display with source files
  - [x] Chat interface with message history
  - [x] API key management (localStorage)
  - [x] Processing state indicators

#### UI/UX
- [x] **Shadcn/UI Components** - Modern, accessible components
- [x] **TailwindCSS Styling** - Responsive, themeable design
- [x] **Dark Mode Support** - CSS variables for theming
- [x] **Responsive Layout** - Sidebar + Main + AI Panel
- [x] **Loading States** - Visual feedback for async operations
- [x] **Error Handling** - User-friendly error messages

#### State Management
- [x] **Zustand Stores**
  - [x] Vault store (path, current file, refresh trigger)
  - [x] Navigation store (current path, terminal visibility)
  - [x] AI store (messages, processing state)

---

### 🚧 Planned Features (Phase 2)

#### Enhanced Vault System
- [ ] **Multi-Vault Support** - Switch between multiple vaults
- [ ] **Vault Management UI** - List, add, remove vaults
- [ ] **File Watching** - Real-time updates via FS events
- [ ] **Vault Settings** - Per-vault configuration
- [ ] **Cloud Sync** - Optional Supabase/Dropbox sync
- [ ] **Backup & Restore** - Vault backup functionality

#### Advanced Navigation
- [ ] **Fuzzy File Search** - Fuse.js integration for fast searching
- [ ] **Recent Files** - Quick access to recently opened files
- [ ] **Bookmarks/Favorites** - Pin important files
- [ ] **File Tags** - Tag system for organization
- [ ] **Search in Content** - Full-text search across notes
- [ ] **Terminal Autocomplete** - Tab completion for commands

#### Editor Enhancements
- [ ] **Markdown Export** - Export to clean markdown
- [ ] **Slash Commands** - `/ai`, `/canvas`, `/todo`, etc.
- [ ] **Custom Blocks**
  - [ ] AI Response blocks (embeddable in notes)
  - [ ] Canvas embed blocks
  - [ ] Code blocks with syntax highlighting
  - [ ] Todo/Checkbox blocks
- [ ] **Collaborative Editing** - Real-time sync (Y.js)
- [ ] **Version History** - Track changes over time
- [ ] **Backlinks** - Wiki-style linking between notes

#### Canvas Features
- [ ] **Canvas-to-Note Linking** - Bi-directional links
- [ ] **Canvas Templates** - Pre-built templates
- [ ] **Export Options** - PNG, SVG, PDF export
- [ ] **Canvas Embedding** - Embed in notes as blocks
- [ ] **Multi-Canvas Support** - Tabs or split view

#### AI Assistant Improvements
- [ ] **Vector Embeddings** - Proper vector DB integration (Supabase Vector, Pinecone)
- [ ] **Source Library** - NotebookLM-style source management
- [ ] **Document Upload** - PDF, web pages, etc.
- [ ] **Auto-Summarization** - Summarize notes automatically
- [ ] **AI Suggestions** - Smart file organization suggestions
- [ ] **Conversation Persistence** - Save AI conversations
- [ ] **Multiple AI Providers** - Anthropic, local models, etc.

#### Advanced Features
- [ ] **Graph View** - Visualize note relationships (like Obsidian)
- [ ] **Daily Notes** - Quick daily note creation
- [ ] **Templates** - Note and canvas templates
- [ ] **Plugins System** - Extensible plugin architecture
- [ ] **Keyboard Shortcuts** - Comprehensive shortcut system
- [ ] **Workspace Settings** - Customize UI layout
- [ ] **Export/Import** - Backup entire vault

---

### 🌟 Future Enhancements (Phase 3+)

#### Collaboration
- [ ] **Real-time Collaboration** - Multi-user editing
- [ ] **Shared Vaults** - Team vaults via Supabase
- [ ] **Comments & Annotations** - Collaborative feedback
- [ ] **Access Control** - Permissions and roles

#### Advanced AI
- [ ] **Multimodal AI** - Image-to-text, diagram understanding
- [ ] **Voice Input** - Speech-to-text for notes
- [ ] **AI-Generated Summaries** - Auto-summarize on save
- [ ] **Smart Tagging** - AI-suggested tags
- [ ] **Content Recommendations** - Suggest related notes

#### Integration
- [ ] **Calendar Integration** - Link notes to dates
- [ ] **Task Management** - Built-in todo system
- [ ] **API Access** - REST/GraphQL API for vault
- [ ] **Browser Extension** - Quick capture from web
- [ ] **Mobile App** - React Native or Tauri mobile
- [ ] **Desktop Widgets** - Quick note widget

---

## 🗺️ Development Plan

### Phase 1: MVP (✅ Completed)

**Goal:** Functional desktop app with core features

**Deliverables:**
- ✅ Vault selection and persistence
- ✅ Basic file CRUD operations
- ✅ Sidebar navigation tree
- ✅ Breadcrumb navigation
- ✅ Terminal-style commands
- ✅ Command palette
- ✅ Tiptap editor for notes
- ✅ Excalidraw canvas
- ✅ Basic AI assistant with RAG

**Timeline:** Initial implementation complete

**Key Technologies:**
- Next.js 14 + TypeScript
- Tauri v2 with plugins
- Tiptap + StarterKit
- Excalidraw
- OpenAI API (simple RAG)
- Zustand state management

---

### Phase 2: Enhanced Features (Next Steps)

**Goal:** Improve UX, add search, multi-vault, advanced AI

**Priority Features:**
1. **File Search (Fuzzy)**
   - Integrate Fuse.js for fast file search
   - Add search UI in command palette
   - Search by filename and content preview
   - Estimated: 1-2 days

2. **File Watching**
   - Implement Tauri FS events or polling
   - Auto-refresh sidebar on external changes
   - Show file change notifications
   - Estimated: 1-2 days

3. **Multi-Vault Support**
   - Vault list in settings
   - Quick vault switcher
   - Per-vault state persistence
   - Estimated: 2-3 days

4. **Vector Embeddings for AI**
   - Set up Supabase Vector or Pinecone
   - Generate embeddings for notes on save
   - Improve RAG retrieval quality
   - Estimated: 3-5 days

5. **Editor Enhancements**
   - Add Tiptap markdown extension
   - Implement slash commands (`/ai`, `/canvas`)
   - Custom AI block extension
   - Estimated: 3-4 days

6. **Canvas Linking**
   - Link canvases to notes
   - Click nodes to open linked notes
   - Bi-directional link visualization
   - Estimated: 2-3 days

**Timeline:** 2-3 weeks

---

### Phase 3: Advanced Features

**Goal:** Collaboration, plugins, advanced AI features

**Priority Features:**
1. **Backlinks & Graph View**
   - Parse markdown links
   - Build relationship graph
   - Visual graph view (D3.js/Cytoscape)
   - Estimated: 4-5 days

2. **Version History**
   - Track file changes (simple Git or custom)
   - Diff viewer
   - Restore previous versions
   - Estimated: 3-4 days

3. **Real-time Collaboration**
   - Integrate Y.js for collaborative editing
   - Supabase Realtime for presence
   - Multi-user canvas editing
   - Estimated: 5-7 days

4. **Plugin System**
   - Plugin architecture design
   - Plugin API and SDK
   - Example plugins (themes, custom commands)
   - Estimated: 7-10 days

5. **Advanced AI Features**
   - Source library UI (NotebookLM-style)
   - Document upload (PDF parsing)
   - Multi-provider support
   - Estimated: 5-7 days

**Timeline:** 6-8 weeks

---

### Phase 4: Polish & Scale

**Goal:** Production readiness, performance, accessibility

**Priorities:**
- Performance optimization
- Comprehensive testing (unit, integration, E2E)
- Accessibility audit (WCAG AA compliance)
- Documentation (user guide, API docs)
- Internationalization (i18n)
- Mobile companion app research

**Timeline:** 4-6 weeks

---

## 🔧 Technical Debt & Improvements

### Immediate Improvements Needed

1. **Error Handling**
   - [ ] Add error boundaries for React components
   - [ ] Improve error messages for Tauri API failures
   - [ ] Retry logic for network requests

2. **Performance**
   - [ ] Virtualize large folder trees in sidebar
   - [ ] Optimize file reading for large directories
   - [ ] Add loading skeletons

3. **Type Safety**
   - [ ] Add stricter TypeScript config
   - [ ] Type Tauri plugin APIs properly
   - [ ] Add Zod schemas for API responses

4. **Testing**
   - [ ] Unit tests for utility functions
   - [ ] Integration tests for vault operations
   - [ ] E2E tests for critical flows

5. **Documentation**
   - [ ] Code comments for complex logic
   - [ ] Component documentation
   - [ ] API documentation

### Code Quality Improvements

- [ ] Refactor vault.ts for better error handling
- [ ] Add input validation for terminal commands
- [ ] Implement proper file type detection
- [ ] Add loading states for all async operations
- [ ] Optimize Zustand store subscriptions

---

## 📊 Development Metrics

### Current Status
- **MVP Completion:** ✅ 100%
- **Core Features:** ✅ Complete
- **Tests:** ⚠️ Not implemented
- **Documentation:** ⚠️ Basic

### Next Milestone
- **Phase 2 Start:** Search & File Watching
- **Target Date:** TBD
- **Est. Completion:** 2-3 weeks

---

## 🎯 Success Criteria

### MVP Success Criteria (✅ Met)
- [x] App launches and allows vault selection
- [x] Users can navigate vault structure
- [x] Users can create and edit notes
- [x] Users can create and edit canvases
- [x] AI assistant provides contextual answers
- [x] All navigation methods work correctly

### Phase 2 Success Criteria
- [ ] Fast file search (<100ms for 1000 files)
- [ ] Multi-vault switching works seamlessly
- [ ] Vector embeddings improve AI answer quality
- [ ] Editor supports markdown and slash commands
- [ ] Canvas-note linking functional

### Phase 3 Success Criteria
- [ ] Graph view renders 100+ notes efficiently
- [ ] Collaboration supports 5+ concurrent users
- [ ] Plugin system extensible and documented
- [ ] Advanced AI features match NotebookLM capabilities

---

## 📝 Notes for Developers

### Getting Started
1. Install dependencies: `npm install`
2. Set up Rust (if needed): Install from rustup.rs
3. Run dev: `npm run tauri:dev`
4. Build: `npm run tauri:build`

### Key Files
- `src/lib/vault.ts` - All file system operations
- `src/lib/ai.ts` - AI/RAG implementation
- `src/lib/navParser.ts` - Terminal command parsing
- `src/store/*` - Zustand stores
- `src/components/*` - UI components

### Architecture Decisions
- **Offline-first:** All data stored locally in vault folder
- **No backend required:** Pure desktop app
- **Extensible:** Designed for plugins and customizations
- **Performance:** Optimized for large vaults (1000+ files)

---

## 🔄 Ongoing Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and fix security vulnerabilities
- Monitor performance metrics
- Gather user feedback

### Future Considerations
- Mobile app feasibility study
- Cloud sync implementation research
- Plugin marketplace
- Community contributions

---

*Last Updated: [Current Date]*
*Version: 0.1.0 (MVP)*

