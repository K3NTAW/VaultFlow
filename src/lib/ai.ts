import { OpenAI } from 'openai'
import { readFile, readDirectory } from './vault'

// Dynamic import for transformers.js - only load in browser
let pipeline: any = null

async function getPipeline() {
  if (typeof window === 'undefined') {
    throw new Error('Transformers.js can only run in the browser')
  }
  
  // Ensure process.env is available (webpack ProvidePlugin handles this, but ensure it exists)
  if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
    (window as any).process = { env: {} }
  }
  
  if (!pipeline) {
    // Import with browser backend only
    const transformers = await import('@xenova/transformers')
    // Configure to use WASM backend (not Node.js)
    transformers.env.allowLocalModels = false
    transformers.env.useBrowserCache = true
    // Explicitly disable Node.js backend to force WASM
    if (transformers.env.setBackend) {
      transformers.env.setBackend('wasm')
    }
    // Set HuggingFace token if available
    const savedToken = localStorage.getItem('hf_token')
    if (savedToken) {
      hfToken = savedToken
      transformers.env.useAuthToken = savedToken
    }
    // Don't override remoteURL - use transformers.js defaults
    pipeline = transformers.pipeline
  }
  
  return pipeline
}

// Initialize OpenAI client (for OpenAI mode)
let openaiClient: OpenAI | null = null

// Transformers.js models (for local/browser mode)
let embeddingPipeline: any = null
let textGeneratorPipeline: any = null
let isModelLoading = false
let modelLoadProgress = 0

export type AIMode = 'openai' | 'local'
let currentMode: AIMode = 'local' // Default to local

// Model configuration - using smaller, definitely public models
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2' // Small, fast embedding model (~23MB)
// Note: Local text generation models are limited. Using context extraction instead for better results.
const TEXT_MODEL = null // Disabled - small local models don't work well for instruction-following

// HuggingFace token (optional - user can set it, free at huggingface.co/settings/tokens)
let hfToken: string | null = null

export function setHuggingFaceToken(token: string) {
  hfToken = token
  localStorage.setItem('hf_token', token)
}

export function getHuggingFaceToken(): string | null {
  return hfToken
}

export function initializeAI(apiKey: string, mode: AIMode = 'openai') {
  openaiClient = new OpenAI({
    apiKey,
  })
  currentMode = mode
}

export async function initializeLocalAI() {
  currentMode = 'local'
  // Load saved HuggingFace token if available
  const savedToken = localStorage.getItem('hf_token')
  if (savedToken) {
    hfToken = savedToken
  }
  // Models will be loaded on first use
}

export function setAIMode(mode: AIMode) {
  currentMode = mode
}

export function getAIMode(): AIMode {
  return currentMode
}

export function getModelLoadingProgress(): number {
  return modelLoadProgress
}

export function isModelBeingLoaded(): boolean {
  return isModelLoading
}

// Load embedding model
async function loadEmbeddingModel(): Promise<any> {
  if (embeddingPipeline) return embeddingPipeline
  
  isModelLoading = true
  try {
    const pipelineFn = await getPipeline()
    embeddingPipeline = await pipelineFn('feature-extraction', EMBEDDING_MODEL, {
      progress_callback: (progress: any) => {
        if (progress.progress !== undefined) {
          modelLoadProgress = progress.progress * 50 // 0-50% for embedding model
        }
      },
    })
    isModelLoading = false
    modelLoadProgress = 50
    return embeddingPipeline
  } catch (error) {
    isModelLoading = false
    throw error
  }
}

// Load text generation model (currently disabled - using context extraction instead)
async function loadTextModel(): Promise<any> {
  // Text generation models are disabled - we use context extraction instead
  throw new Error('Text generation model disabled - using context extraction')
}

async function getEmbedding(text: string): Promise<number[]> {
  if (currentMode === 'openai') {
    // Use OpenAI embeddings
    if (!openaiClient) throw new Error('OpenAI client not initialized')
    try {
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      return response.data[0].embedding
    } catch {
      return []
    }
  } else {
    // Use local embedding model
    try {
      const model = await loadEmbeddingModel()
      const output = await model(text, { pooling: 'mean', normalize: true })
      // Convert tensor to array
      const embedding = Array.from(output.data)
      return embedding as number[]
    } catch {
      return []
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function generateText(prompt: string, maxTokens: number = 500): Promise<string> {
  if (currentMode === 'openai') {
    if (!openaiClient) throw new Error('OpenAI client not initialized')
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    })
    return completion.choices[0]?.message?.content || 'No response generated.'
  } else {
    // Local mode: Instead of generating text (small models don't work well),
    // extract and format relevant context from the prompt
    // This provides a NotebookLM-like experience by showing relevant snippets
    
    // Extract the question and context from the prompt
    const lines = prompt.split('\n')
    const questionMatch = prompt.match(/User question:\s*(.+)/i)
    const question = questionMatch ? questionMatch[1].trim() : 'the query'
    
    // Find context sections
    const contextMatch = prompt.match(/Context from vault:([\s\S]*?)(?:User question:|$)/i)
    const contextText = contextMatch ? contextMatch[1].trim() : prompt
    
    // Extract file citations
    const fileMatches = contextText.matchAll(/\[File: ([^\]]+)\]/g)
    const files = Array.from(fileMatches, m => m[1])
    
    // Create a helpful response by extracting key information
    // Split context into relevant chunks
    const contextChunks = contextText.split('\n\n---\n\n')
    
    let response = `Based on your vault notes about "${question}":\n\n`
    
    // Add relevant context snippets
    for (const chunk of contextChunks.slice(0, 3)) { // Limit to top 3 chunks
      if (chunk.trim().length > 0) {
        const fileMatch = chunk.match(/\[File: ([^\]]+)\]/)
        const fileName = fileMatch ? fileMatch[1] : 'your notes'
        
        // Extract a relevant snippet (first 300 chars or until newline after that)
        const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
        const snippet = content.length > 300 
          ? content.substring(0, 300) + '...'
          : content
        
        response += `**From ${fileName}:**\n${snippet}\n\n`
      }
    }
    
    // Add citation list
    if (files.length > 0) {
      response += `\n**Sources:** ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' and more...' : ''}`
    } else {
      response += `\n*Note: This is a context-based response. The local AI extracts relevant information from your notes rather than generating new text.*`
    }
    
    return response
  }
}

export async function queryVault(
  vaultPath: string,
  query: string,
  maxContextFiles: number = 5
): Promise<{ answer: string; citations: string[] }> {
  if (currentMode === 'openai' && !openaiClient) {
    throw new Error('OpenAI client not initialized. Please set your API key.')
  }

  // Get all markdown files from vault
  const allFiles = await getAllMarkdownFiles(vaultPath)
  
  // Try semantic search with embeddings, fallback to keyword matching
  let relevantFiles: string[] = []
  try {
    const queryEmbedding = await getEmbedding(query)
    if (queryEmbedding.length > 0) {
      // Semantic search: get embeddings for files and compute similarity
      const fileScores: { file: string; score: number }[] = []
      for (const file of allFiles.slice(0, 30)) { // Limit to first 30 for performance
        try {
          const content = await readFile(vaultPath, file)
          const contentPreview = content.slice(0, 1000) // Use first 1000 chars for embedding
          const fileEmbedding = await getEmbedding(`${file}\n${contentPreview}`)
          if (fileEmbedding.length > 0) {
            const similarity = cosineSimilarity(queryEmbedding, fileEmbedding)
            fileScores.push({ file, score: similarity })
          }
        } catch {
          // Skip if embedding fails for this file
        }
      }
      relevantFiles = fileScores
        .sort((a, b) => b.score - a.score)
        .slice(0, maxContextFiles)
        .map((item) => item.file)
    }
  } catch (error) {
    console.warn('Semantic search failed, falling back to keyword matching:', error)
  }

  // Fallback to keyword matching if semantic search didn't work
  if (relevantFiles.length === 0) {
    relevantFiles = findRelevantFiles(allFiles, query).slice(0, maxContextFiles)
  }
  
  // Read relevant files
  const contexts: { file: string; content: string }[] = []
  for (const file of relevantFiles) {
    try {
      const content = await readFile(vaultPath, file)
      contexts.push({ file, content })
    } catch (error) {
      console.error(`Error reading ${file}:`, error)
    }
  }

  // Build context prompt
  const contextText = contexts
    .map((ctx) => `[File: ${ctx.file}]\n${ctx.content.slice(0, 2000)}`)
    .join('\n\n---\n\n')

  const userPrompt = currentMode === 'local'
    ? `Context from vault:
${contextText}

User question: ${query}

Please provide a helpful answer based ONLY on the context above. Include citations in the format [File: filename.md] when referencing specific files.`
    : `Context from vault:
${contextText}

User question: ${query}

Please provide a helpful answer based on the context above. Include citations in the format [File: filename.md] when referencing specific files.`

  try {
    const maxTokens = currentMode === 'local' ? 500 : 1000
    const answer = await generateText(userPrompt, maxTokens)
    
    // Extract citations from answer
    const citationRegex = /\[File: ([^\]]+)\]/g
    const citations: string[] = []
    let match
    while ((match = citationRegex.exec(answer)) !== null) {
      citations.push(match[1])
    }

    return { answer, citations: [...new Set(citations)] }
  } catch (error) {
    console.error('AI generation error:', error)
    throw new Error(`Failed to query AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function getAllMarkdownFiles(vaultPath: string): Promise<string[]> {
  const files: string[] = []
  
  async function traverse(dir: string) {
    const entries = await readDirectory(vaultPath, dir)
    for (const entry of entries) {
      if (entry.isDirectory) {
        await traverse(entry.path)
      } else if (entry.name.endsWith('.md')) {
        files.push(entry.path)
      }
    }
  }
  
  await traverse('')
  return files
}

function findRelevantFiles(files: string[], query: string): string[] {
  const queryLower = query.toLowerCase()
  const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2)
  
  // Simple scoring based on filename and path matching
  const scored = files.map((file) => {
    const fileLower = file.toLowerCase()
    let score = 0
    
    for (const keyword of keywords) {
      if (fileLower.includes(keyword)) {
        score += 10
      }
      // Additional scoring for multiple matches
      score += (fileLower.match(new RegExp(keyword, 'g'))?.length || 0) * 2
    }
    
    return { file, score }
  })
  
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .map((item) => item.file)
}
