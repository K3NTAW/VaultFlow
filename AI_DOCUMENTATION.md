# AI Chat System Documentation

## Overview

VaultFlow includes a local-first AI assistant that helps you query and understand information in your vault notes. The AI system uses semantic search to find relevant notes and generates conversational responses based on your vault content.

**Key Features:**
- **100% Local** - Runs entirely in your browser using WebAssembly
- **Semantic Search** - Finds relevant notes based on meaning, not just keywords
- **Conversational** - Provides natural, helpful responses to your questions
- **Vault-Contextual** - Only answers based on content in your vault
- **Markdown Support** - Renders markdown in AI responses

## Architecture

### Core Components

1. **`src/lib/ai.ts`** - Main AI logic and API
2. **`src/components/AIPanel.tsx`** - Chat UI component
3. **Embedding Model** - `Xenova/all-MiniLM-L6-v2` (~23MB, runs in browser)
4. **Transformers.js** - Runs models using WebAssembly in the browser

### System Flow

```
User Query
    ↓
Semantic Search (embeddings)
    ↓
Find Relevant Files (similarity scoring)
    ↓
Extract Context (top 5 files)
    ↓
Generate Response (conversational extraction)
    ↓
Display Answer with Citations
```

## Modes

### Local Mode (Default)

**How it works:**
1. Uses `@xenova/transformers` library
2. Loads embedding model (`all-MiniLM-L6-v2`) in browser
3. Generates embeddings for queries and files
4. Uses cosine similarity to find relevant notes
5. Creates conversational responses through intelligent content extraction

**Advantages:**
- ✅ Completely private - no data leaves your device
- ✅ No API keys required
- ✅ Free to use
- ✅ Works offline after initial model download

**Limitations:**
- ⚠️ No text generation (extraction-based responses)
- ⚠️ Smaller model = less sophisticated than GPT-4
- ⚠️ First load downloads ~23MB model

### OpenAI Mode (Optional)

**Status:** Available but not actively used in UI (defaults to local)

If enabled:
- Uses GPT-4 Turbo for text generation
- Requires OpenAI API key
- Sends vault content to OpenAI servers
- More sophisticated responses

## Semantic Search

### How Embeddings Work

1. **Query Embedding**: Converts your question into a 384-dimensional vector
2. **File Embeddings**: Converts file names + content preview into vectors
3. **Similarity**: Computes cosine similarity between query and files
4. **Ranking**: Returns top 5 most relevant files (similarity > 0.3)

### Example

```
Query: "what is the todo system?"
    ↓
Embedding: [0.12, -0.45, 0.89, ...] (384 numbers)
    ↓
Compare with all files:
- "Note taking tool needs.md" → similarity: 0.85 ✅
- "Random note.md" → similarity: 0.15 ❌
    ↓
Select top matches
```

## Response Generation

### Smart Extraction System

Since text generation models have compatibility issues in browser, the system uses intelligent content extraction:

#### 1. Question Type Detection

The system recognizes different question patterns:

**Summarization** (`/summarize|summary|overview|what is|tell me about/`)
- Extracts structured sections
- Organizes by headers and lists
- Limits content to keep responses concise

**Lists/Enumeration** (`/list|what are|which|name|show me/`)
- Extracts bullet points and numbered lists
- Shows structured information clearly

**"What is in X"** (`/what is in|what does.*contain|what's in/`)
- Extracts key points from specified files
- Shows headers, lists, and important lines
- Provides concise overview

**General Questions**
- Analyzes question for relevant keywords
- Matches content based on word overlap
- Provides contextual answers with citations

#### 2. Content Processing

```typescript
// Extracts structured information:
- Headers (# Title)
- Lists (- item, * item, 1. item)
- Short meaningful lines (< 100 chars)
- Limits to 8-10 key points per file
```

#### 3. Response Formatting

- Conversational tone
- Organized by sections
- File citations at bottom
- Markdown rendering support

## UI/UX

### AIPanel Component

Located at: `src/components/AIPanel.tsx`

**Features:**
- Right-side vertical panel (~400-500px wide)
- Full height chat interface
- Message area with scroll
- Input bar at bottom (sticky)
- Markdown rendering with `marked` library
- Fade-in animations for new messages
- Auto-scroll to bottom

**Message Types:**
- User messages (right-aligned, subtle styling)
- Assistant messages (left-aligned, with markdown)
- Citations shown below assistant messages
- Error messages (styled appropriately)

**States:**
- Loading state during queries
- Empty state with helpful message
- Processing indicator

## Configuration

### HuggingFace Token (Optional)

A free HuggingFace token can improve model loading:

1. Get token: https://huggingface.co/settings/tokens
2. Set via: `setHuggingFaceToken(token)` in code
3. Stored in `localStorage` as `hf_token`

**Benefits:**
- Faster model downloads
- Access to more models
- Better error handling

### Model Loading

Models are loaded on first use:
- **Progress tracking**: `getModelLoadingProgress()` returns 0-100
- **Loading state**: `isModelBeingLoaded()` returns boolean
- **Caching**: Models cached in browser after first load

## API Reference

### Core Functions

#### `initializeLocalAI()`
Initializes local AI mode. Called automatically on app start.

```typescript
await initializeLocalAI()
```

#### `queryVault(vaultPath, query, maxContextFiles?)`
Main query function. Finds relevant notes and generates answer.

```typescript
const result = await queryVault(
  '/path/to/vault',
  'what is in my notes about todos?',
  5 // max files to include
)

// Returns:
{
  answer: "Based on your notes...",
  citations: ["file1.md", "file2.md"]
}
```

#### `getEmbedding(text)`
Generates embedding vector for text.

```typescript
const embedding = await getEmbedding("my query text")
// Returns: [0.12, -0.45, 0.89, ...] (384 numbers)
```

#### `getModelLoadingProgress()`
Returns model loading progress (0-100).

```typescript
const progress = getModelLoadingProgress() // 0-100
```

### Utility Functions

#### `setHuggingFaceToken(token)`
Sets HuggingFace token for better model access.

#### `getAIMode()` / `setAIMode(mode)`
Get/set current AI mode (`'local'` or `'openai'`).

## Example Queries

### Good Queries
```
"what is in the new note?"
→ Extracts key points from files matching "new note"

"summarize my todo requirements"
→ Finds notes about todos, extracts structured summary

"what apps are mentioned in my notes?"
→ Extracts list items and app names

"tell me about note taking tools"
→ Finds relevant notes, provides overview
```

### Less Effective Queries
```
"what is this?"
→ Too vague, no context reference

"hey"
→ Returns friendly greeting (by design)

"everything"
→ Too broad, needs specificity
```

## Performance Considerations

### Model Loading
- First load: ~23MB embedding model download
- Subsequent loads: Cached, instant
- Load progress tracked for UI feedback

### Search Performance
- Limits to first 30 files for embedding comparison
- Similarity threshold: 0.3 (filters irrelevant matches)
- Max 5 context files per query
- Content preview limited to 1000 chars for embeddings

### Response Generation
- No heavy text generation (uses extraction)
- Fast response times (< 1s after model loaded)
- Content limited to prevent overwhelming responses

## Limitations & Known Issues

### Current Limitations

1. **No Text Generation**
   - Uses intelligent extraction instead
   - Cannot generate novel content
   - Limited to organizing existing notes

2. **Model Compatibility**
   - Text generation models (TinyLlama) have tokenization errors
   - "Offset should not be negative" errors
   - Disabled until better solution found

3. **Browser Constraints**
   - WebAssembly limitations
   - Memory constraints for large vaults
   - Limited to ~30 files for semantic search

4. **Query Limitations**
   - Needs specific queries (doesn't handle vague "this" references well)
   - Best with 3+ word queries
   - Greetings handled specially (return welcome message)

### Future Improvements

**Potential Enhancements:**
1. ✅ Working text generation model (when compatibility fixed)
2. ✅ Batch processing for larger vaults
3. ✅ Conversation history/memory
4. ✅ Multi-turn questions with context
5. ✅ Better vague query handling
6. ✅ Streaming responses
7. ✅ Better summarization model integration

## Troubleshooting

### "Model loading failed"
- Check internet connection (needed for first download)
- Try setting HuggingFace token
- Check browser console for specific errors

### "No relevant information found"
- Query may be too vague
- Try more specific keywords
- Ensure vault has markdown files
- Check similarity threshold (maybe files exist but score < 0.3)

### "Offset should not be negative"
- This is a known issue with text generation models
- Currently disabled - using extraction instead
- Not a critical error (extraction still works)

### Slow responses
- First query slower (model loading)
- Large vaults may be slower (embedding computation)
- Check browser console for errors

## Technical Details

### Dependencies

```json
{
  "@xenova/transformers": "^2.17.2",
  "marked": "^16.4.1",
  "framer-motion": "^11.0.5"
}
```

### Browser Requirements

- Modern browser with WebAssembly support
- ~50MB storage for model cache
- JavaScript enabled
- LocalStorage support

### Model Specifications

**Embedding Model**: `Xenova/all-MiniLM-L6-v2`
- Size: ~23MB
- Dimensions: 384
- Type: Sentence transformers
- Backend: WebAssembly (WASM)

## Security & Privacy

### Data Privacy

- ✅ All processing happens in browser
- ✅ No data sent to external servers (local mode)
- ✅ Models downloaded from HuggingFace CDN (public models)
- ✅ Vault content never leaves device

### Security Considerations

- HuggingFace token stored in localStorage (plaintext)
- Model files cached in browser cache
- No authentication required for local mode

## Code Structure

```
src/
├── lib/
│   └── ai.ts                 # Core AI logic
│       ├── Embeddings
│       ├── Semantic Search
│       ├── Response Generation
│       └── Vault Querying
│
└── components/
    └── AIPanel.tsx           # Chat UI
        ├── Message Display
        ├── Input Handling
        ├── Markdown Rendering
        └── State Management
```

## Contributing

When modifying the AI system:

1. **Test with various queries** - Ensure extraction works well
2. **Check model compatibility** - Browser constraints are real
3. **Maintain privacy** - Keep local-first approach
4. **Document changes** - Update this file with modifications
5. **Performance matters** - Keep responses fast

---

**Last Updated:** Generated automatically
**Version:** 1.0 (Local-first implementation)

