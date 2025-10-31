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
let summarizationPipeline: any = null
let isModelLoading = false
let modelLoadProgress = 0

export type AIMode = 'openai' | 'local'
let currentMode: AIMode = 'local' // Default to local

// Model configuration - using smaller, definitely public models
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2' // Small, fast embedding model (~23MB)
// Disabling text generation model - having tokenization issues
// Using smart conversational extraction instead
const TEXT_MODEL = null
const SUMMARIZATION_MODEL = 'Xenova/distilbart-cnn-12-6' // Small summarization model

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

// Text generation disabled - using smart conversational extraction
async function loadTextModel(): Promise<any> {
  throw new Error('Text generation temporarily disabled due to model compatibility issues')
}

// Load summarization model
async function loadSummarizationModel(): Promise<any> {
  if (summarizationPipeline) return summarizationPipeline
  
  try {
    const pipelineFn = await getPipeline()
    summarizationPipeline = await pipelineFn('summarization', SUMMARIZATION_MODEL, {
      progress_callback: (progress: any) => {
        if (progress.progress !== undefined) {
          modelLoadProgress = 50 + progress.progress * 50 // 50-100% for summarization model
        }
      },
    })
    return summarizationPipeline
  } catch (error) {
    console.warn('Summarization model failed to load:', error)
    return null
  }
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

async function generateText(
  prompt: string, 
  maxTokens: number = 500,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
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
    // Local mode: Create conversational, intelligent responses from context extraction
    // (Text generation models have compatibility issues, so we use smart extraction)
    const questionMatch = prompt.match(/User question:\s*(.+)/i)
    const question = questionMatch ? questionMatch[1].trim() : 'the query'
    
    const contextMatch = prompt.match(/Context from vault:([\s\S]*?)(?:User question:|$)/i)
    const contextText = contextMatch ? contextMatch[1].trim() : prompt
    
    const fileMatches = contextText.matchAll(/\[File: ([^\]]+)\]/g)
    const files = Array.from(fileMatches, m => m[1])
    const contextChunks = contextText.split('\n\n---\n\n')
    
    // Chain-of-thought: Create structured response pipeline
    // Step 1: Identify question type and approach
    const questionLower = question.toLowerCase()
    
    // Check if this is a follow-up question
    const isFollowUp = conversationHistory && conversationHistory.length > 0
    
    // Step 2: Apply thinking/processing style
    let thinkingPrefix = ''
    if (isFollowUp) {
      thinkingPrefix = randomPhrase(PERSONA.thinkingPhrases) + '\n\n'
    }
    
    // Step 3: Generate response based on question type (each branch returns its own response)
    // Summarization requests
    if (/summarize|summary|overview|what is|what's|tell me about/i.test(question)) {
      let response = `${thinkingPrefix}${randomPhrase(PERSONA.connectorPhrases)} about "${question}":\n\n`
      
      for (const chunk of contextChunks.slice(0, 2)) {
        if (chunk.trim().length > 0) {
          const fileMatch = chunk.match(/\[File: ([^\]]+)\]/)
          const fileName = fileMatch ? fileMatch[1] : 'your notes'
          const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
          
          // Extract and organize key information
          const sections: { title: string; content: string }[] = []
          const lines = content.split('\n')
          let currentTitle = ''
          let currentContent: string[] = []
          
          for (const line of lines) {
            const trimmed = line.trim()
            // Detect headers
            if (trimmed.match(/^#{1,6}\s/) || (trimmed.match(/^[A-Z][^:]*:$/) && !trimmed.includes('='))) {
              if (currentTitle) {
                sections.push({ title: currentTitle, content: currentContent.join('\n') })
              }
              currentTitle = trimmed.replace(/^#+\s*/, '').replace(/:$/, '')
              currentContent = []
            } else if (trimmed) {
              currentContent.push(trimmed)
            }
          }
          if (currentTitle) {
            sections.push({ title: currentTitle, content: currentContent.join('\n') })
          }
          
          if (sections.length > 0) {
            response += `**From ${fileName}:**\n\n`
            for (const section of sections) {
              if (section.title) response += `**${section.title}**\n`
              if (section.content) {
                // Limit section content to keep it concise
                const limitedContent = section.content.split('\n').slice(0, 8).join('\n')
                response += limitedContent + (section.content.split('\n').length > 8 ? '\n...' : '') + '\n\n'
              }
            }
          } else {
            // No structure found, show first 300 chars
            response += `**From ${fileName}:**\n${content.substring(0, 300)}${content.length > 300 ? '...' : ''}\n\n`
          }
        }
      }
      
      if (files.length > 0) {
        response += `\n**Sources:** ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' and more...' : ''}`
      }
      
      return response
    }
    
    // List/enumeration requests
    if (/list|what are|which|name|show me/i.test(question)) {
      let response = `${thinkingPrefix}${randomPhrase(PERSONA.connectorPhrases)}:\n\n`
      
      const allItems: string[] = []
      for (const chunk of contextChunks) {
        const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
        const items = content.split('\n').filter(l => l.trim().match(/^[-*•]\s/) || l.trim().match(/^\d+\.\s/))
        allItems.push(...items.slice(0, 10))
      }
      
      if (allItems.length > 0) {
        response += allItems.join('\n') + '\n\n'
      } else {
        // Show structured content
        for (const chunk of contextChunks.slice(0, 2)) {
          const fileMatch = chunk.match(/\[File: ([^\]]+)\]/)
          const fileName = fileMatch ? fileMatch[1] : 'your notes'
          const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
          response += `**From ${fileName}:**\n${content}\n\n`
        }
      }
      
      if (files.length > 0) {
        response += `\n**Sources:** ${files.slice(0, 5).join(', ')}`
      }
      
      return response
    }
    
    // General questions - create intelligent, concise answers
    let response = ''
    
    if (contextChunks.length > 0) {
      // For "what is in X" or "what does X contain" - provide a concise summary
      if (/what is in|what does.*contain|what's in/i.test(question)) {
        response = ''
        
        for (const chunk of contextChunks.slice(0, 2)) {
          if (chunk.trim().length > 0) {
            const fileMatch = chunk.match(/\[File: ([^\]]+)\]/)
            const fileName = fileMatch ? fileMatch[1].replace(/\.md$/, '') : 'your notes'
            const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
            
            // Extract key points for a concise answer
            const lines = content.split('\n').filter(l => l.trim())
            const keyPoints: string[] = []
            
            // Get headers and first few list items or lines
            for (let i = 0; i < lines.length && keyPoints.length < 8; i++) {
              const line = lines[i].trim()
              if (line.match(/^#{1,6}\s/)) {
                keyPoints.push(`**${line.replace(/^#+\s*/, '')}**`)
              } else if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
                keyPoints.push(line)
              } else if (line && line.length < 100 && !line.match(/^={2,}$/)) {
                // Short meaningful lines
                keyPoints.push(line)
              }
            }
            
            if (keyPoints.length > 0) {
              response += `**${fileName}** contains:\n\n${keyPoints.join('\n')}\n\n`
            } else {
              // Fallback: first few lines
              const preview = lines.slice(0, 5).join('\n')
              response += `**${fileName}** contains:\n\n${preview}\n\n`
            }
          }
        }
      } else {
        // For other questions, provide structured answer
        const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3)
        
        for (const chunk of contextChunks.slice(0, 2)) {
          if (chunk.trim().length > 0) {
            const fileMatch = chunk.match(/\[File: ([^\]]+)\]/)
            const fileName = fileMatch ? fileMatch[1].replace(/\.md$/, '') : 'your notes'
            const content = chunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
            const contentLower = content.toLowerCase()
            
            // Check relevance
            const relevance = questionWords.filter(word => contentLower.includes(word)).length
            
            if (relevance > 0 || contextChunks.length === 1) {
              // Extract main points instead of full dump
              const lines = content.split('\n').filter(l => l.trim())
              const summaryLines = lines.slice(0, 10)
              
              response += `**${fileName}**:\n\n${summaryLines.join('\n')}${lines.length > 10 ? '\n...' : ''}\n\n`
            }
          }
        }
        
        if (!response && contextChunks.length > 0) {
          // Show first chunk with concise format
          const firstChunk = contextChunks[0]
          const fileMatch = firstChunk.match(/\[File: ([^\]]+)\]/)
          const fileName = fileMatch ? fileMatch[1].replace(/\.md$/, '') : 'your notes'
          const content = firstChunk.replace(/\[File: [^\]]+\]\n?/g, '').trim()
          const lines = content.split('\n').filter(l => l.trim())
          response = `**${fileName}**:\n\n${lines.slice(0, 8).join('\n')}${lines.length > 8 ? '\n...' : ''}\n\n`
        }
      }
    } else {
      response = 'I couldn\'t find relevant information in your vault notes for that question.'
    }
    
    if (files.length > 0) {
      response += `\n**Sources:** ${files.slice(0, 5).join(', ')}${files.length > 5 ? ' and more...' : ''}`
    }
    
    return response || 'No relevant information found.'
  }
}

// Persona configuration for conversational tone
const PERSONA = {
  introPhrases: [
    "Sure! Based on your notes",
    "Let me check your notes on that",
    "I found some relevant information",
    "Here's what I discovered in your vault",
    "Looking at your notes",
  ],
  thinkingPhrases: [
    "Let me look at your notes on this...",
    "Checking what you've written about that...",
    "Searching through your vault...",
    "Let me find the relevant information...",
  ],
  connectorPhrases: [
    "Here's what I found",
    "Here's the information",
    "Here are the key points",
    "This is what stands out",
  ],
}

// Get random phrase from array
function randomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)]
}

export async function queryVault(
  vaultPath: string,
  query: string,
  maxContextFiles: number = 5,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ answer: string; citations: string[] }> {
  if (currentMode === 'openai' && !openaiClient) {
    throw new Error('OpenAI client not initialized. Please set your API key.')
  }

  // Handle simple greetings/conversational queries without searching
  const trimmedQuery = query.trim().toLowerCase()
  const isGreeting = /^(hey|hi|hello|hey there|what's up|sup)$/i.test(query.trim())
  
  if (isGreeting && currentMode === 'local') {
    const allFiles = await getAllMarkdownFiles(vaultPath)
    return {
      answer: `Hello! I'm your local AI assistant. I can help you find and understand information in your vault. You have ${allFiles.length} note${allFiles.length === 1 ? '' : 's'} available. What would you like to know?`,
      citations: []
    }
  }

  // Get all markdown files from vault
  const allFiles = await getAllMarkdownFiles(vaultPath)
  
  // Build enhanced query with conversation context
  let enhancedQuery = query
  if (conversationHistory && conversationHistory.length > 0) {
    // Include last 2-3 exchanges for context
    const recentContext = conversationHistory.slice(-4).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n')
    enhancedQuery = `${query}\n\nPrevious conversation:\n${recentContext}`
  }
  
  // Try semantic search with embeddings, fallback to keyword matching
  let relevantFiles: string[] = []
  
  // Only do semantic search if query is substantial (not just "hey")
  if (query.trim().length > 3) {
    try {
      // Use enhanced query for embedding if we have context
      const queryForEmbedding = conversationHistory ? query : enhancedQuery
      const queryEmbedding = await getEmbedding(queryForEmbedding)
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
        // Only use files with meaningful similarity (filter out very low scores)
        relevantFiles = fileScores
          .filter(item => item.score > 0.3) // Only files with decent similarity
          .sort((a, b) => b.score - a.score)
          .slice(0, maxContextFiles)
          .map((item) => item.file)
      }
    } catch (error) {
      console.warn('Semantic search failed, falling back to keyword matching:', error)
    }
  }

  // Fallback to keyword matching if semantic search didn't work or query is too short
  if (relevantFiles.length === 0 && query.trim().length > 3) {
    relevantFiles = findRelevantFiles(allFiles, query).slice(0, maxContextFiles)
  }
  
  // If still no relevant files and query is meaningful, return empty (don't dump all files)
  if (relevantFiles.length === 0 && query.trim().length > 3) {
    return {
      answer: `I couldn't find specific information about "${query}" in your vault notes. Try asking about specific topics, files, or content you know is in your notes.`,
      citations: []
    }
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

  // Build context prompt - use full content, don't truncate
  const contextText = contexts
    .map((ctx) => `[File: ${ctx.file}]\n${ctx.content}`)
    .join('\n\n---\n\n')

  const userPrompt = currentMode === 'local'
    ? `Context from vault:
${contextText}

User question: ${query}
${conversationHistory && conversationHistory.length > 0 ? `\nPrevious conversation context:\n${conversationHistory.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}` : ''}

Please provide a helpful answer based ONLY on the context above. Include citations in the format [File: filename.md] when referencing specific files.`
    : `Context from vault:
${contextText}

User question: ${query}

Please provide a helpful answer based on the context above. Include citations in the format [File: filename.md] when referencing specific files.`

  try {
    const maxTokens = currentMode === 'local' ? 500 : 1000
    let answer = await generateText(userPrompt, maxTokens, conversationHistory)
    
    // Extract citations from answer
    const citationRegex = /\[File: ([^\]]+)\]/g
    const citations: string[] = []
    let match
    while ((match = citationRegex.exec(answer)) !== null) {
      citations.push(match[1])
    }

    // Add conversational wrapper if in local mode
    if (currentMode === 'local' && !answer.match(/^(Sure!|Let me|Here's|I found|Looking at)/i)) {
      const intro = randomPhrase(PERSONA.introPhrases)
      answer = `${intro}, ${answer.toLowerCase()}`
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
