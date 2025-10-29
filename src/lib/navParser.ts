import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, isDirectory, isNote, isCanvas, getFullPath } from './vault'

export interface CommandResult {
  output: string
  error?: boolean
}

/**
 * Parse and execute terminal-like commands
 */
export async function parseCommand(
  input: string,
  vaultPath: string | null
): Promise<CommandResult> {
  if (!vaultPath) {
    return { output: 'No vault selected. Please select a vault first.', error: true }
  }

  const parts = input.trim().split(/\s+/)
  const command = parts[0]?.toLowerCase()
  const args = parts.slice(1)

  switch (command) {
    case 'ls':
    case 'list':
      return await handleLs(vaultPath, args)
    
    case 'cd':
      return await handleCd(args)
    
    case 'open':
      return await handleOpen(vaultPath, args)
    
    case 'clear':
      return { output: '' }
    
    case 'pwd':
      return { output: useNavStore.getState().currentPath }
    
    case 'help':
      return {
        output: `Available commands:
ls [path]        - List files and directories
cd <path>        - Change directory (use ".." to go up, "/" for root)
open <file>      - Open a note or canvas
clear            - Clear terminal output
pwd              - Show current path
help             - Show this help message`,
      }
    
    default:
      return {
        output: `Unknown command: ${command}. Type "help" for available commands.`,
        error: true,
      }
  }
}

async function handleLs(vaultPath: string, args: string[]): Promise<CommandResult> {
  const { currentPath } = useNavStore.getState()
  const targetPath = args[0] || currentPath

  try {
    const entries = await readDirectory(vaultPath, targetPath)
    if (entries.length === 0) {
      return { output: 'Directory is empty.' }
    }

    const output = entries
      .map((entry) => {
        const icon = entry.isDirectory ? '📁' : isNote(entry.name) ? '📄' : isCanvas(entry.name) ? '🎨' : '📎'
        return `${icon} ${entry.name}${entry.isDirectory ? '/' : ''}`
      })
      .join('\n')

    return { output }
  } catch (error) {
    return {
      output: `Error reading directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: true,
    }
  }
}

async function handleCd(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { output: 'Usage: cd <path>', error: true }
  }

  const { currentPath, setCurrentPath } = useNavStore.getState()
  const targetPath = args[0]

  if (targetPath === '/') {
    setCurrentPath('/')
    return { output: 'Changed to vault root.' }
  }

  if (targetPath === '..') {
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length > 0) {
      parts.pop()
      setCurrentPath(parts.length > 0 ? '/' + parts.join('/') : '/')
      return { output: 'Moved up one directory.' }
    }
    return { output: 'Already at root.' }
  }

  // Resolve path
  let newPath: string
  if (targetPath.startsWith('/')) {
    newPath = targetPath
  } else {
    const currentParts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean)
    const targetParts = targetPath.split('/').filter(Boolean)
    
    for (const part of targetParts) {
      if (part === '..') {
        if (currentParts.length > 0) {
          currentParts.pop()
        }
      } else if (part !== '.' && part !== '') {
        currentParts.push(part)
      }
    }
    
    newPath = currentParts.length > 0 ? '/' + currentParts.join('/') : '/'
  }

  setCurrentPath(newPath)
  return { output: `Changed to: ${newPath}` }
}

async function handleOpen(vaultPath: string, args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { output: 'Usage: open <filename>', error: true }
  }

  const { currentPath } = useNavStore.getState()
  const filename = args[0]
  
  // Resolve full relative path
  const relativePath = currentPath === '/' 
    ? filename 
    : `${currentPath}/${filename}`.replace(/\/+/g, '/')

  try {
    // Check if it's a directory
    const isDir = await isDirectory(vaultPath, relativePath)
    if (isDir) {
      useNavStore.getState().setCurrentPath(relativePath)
      return { output: `Opened directory: ${relativePath}` }
    }

    // Check if it's a note or canvas
    if (isNote(filename) || isCanvas(filename)) {
      useVaultStore.getState().setCurrentFile(relativePath)
      return { output: `Opened: ${filename}` }
    }

    return {
      output: `Cannot open ${filename}. Only .md files and .excalidraw.json files are supported.`,
      error: true,
    }
  } catch (error) {
    return {
      output: `Error opening ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: true,
    }
  }
}

