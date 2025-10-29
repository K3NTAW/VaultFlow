import { OpenAI } from 'openai'
import { readFile, readDirectory } from './vault'

// Initialize OpenAI client
let openaiClient: OpenAI | null = null

export function initializeAI(apiKey: string) {
  openaiClient = new OpenAI({
    apiKey,
  })
}

export async function queryVault(
  vaultPath: string,
  query: string,
  maxContextFiles: number = 5
): Promise<{ answer: string; citations: string[] }> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please set your API key.')
  }

  // Get all markdown files from vault
  const allFiles = await getAllMarkdownFiles(vaultPath)
  
  // Simple keyword matching for context (in production, use embeddings + vector search)
  const relevantFiles = findRelevantFiles(allFiles, query).slice(0, maxContextFiles)
  
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

  const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided vault context. 
Cite specific files when referencing information. Format citations as [File: filename.md] inline in your response.`

  const userPrompt = `Context from vault:
${contextText}

User question: ${query}

Please provide a helpful answer based on the context above. Include citations in the format [File: filename.md] when referencing specific files.`

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const answer = completion.choices[0]?.message?.content || 'No response generated.'
    
    // Extract citations from answer
    const citationRegex = /\[File: ([^\]]+)\]/g
    const citations: string[] = []
    let match
    while ((match = citationRegex.exec(answer)) !== null) {
      citations.push(match[1])
    }

    return { answer, citations: [...new Set(citations)] }
  } catch (error) {
    console.error('OpenAI API error:', error)
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

