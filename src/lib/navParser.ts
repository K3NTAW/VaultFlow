import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, isDirectory, isNote, isCanvas, getFullPath } from './vault'
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs'

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

  // Parse command and args, handling quoted strings for paths with spaces
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < input.trim().length; i++) {
    const char = input[i]
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) {
    parts.push(current)
  }
  
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
    
    case 'mkdir':
      return await handleMkdir(vaultPath, args)
    
    case 'touch':
      return await handleTouch(vaultPath, args)
    
    case 'help':
      return {
        output: `Available commands:
ls [path]        - List files and directories
cd <path>        - Change directory (use ".." to go up, "/" for root)
mkdir <name>     - Create a new directory
touch <file>     - Create a new file
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

    // Format like terminal ls: directories first with /, files after
    const directories = entries.filter(e => e.isDirectory).map(e => e.name + '/')
    const files = entries.filter(e => !e.isDirectory).map(e => e.name)
    
    const allItems = [...directories, ...files]
    const output = allItems.join('  ')

    return { output: output || 'Directory is empty.' }
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
  // Join args in case path has spaces (or was quoted)
  const targetPath = args.join(' ')

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
  // Join args in case filename has spaces (or was quoted)
  const filename = args.join(' ')
  
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
      // Refresh sidebar to show the file
      useVaultStore.getState().refresh()
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

async function handleMkdir(vaultPath: string, args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { output: 'Usage: mkdir <foldername>', error: true }
  }

  const { currentPath } = useNavStore.getState()
  // Join args in case folder name has spaces (or was quoted)
  const folderName = args.join(' ')
  
  // Resolve full relative path
  const relativePath = currentPath === '/' 
    ? folderName 
    : `${currentPath}/${folderName}`.replace(/\/+/g, '/')

  try {
    const fullPath = await getFullPath(vaultPath, relativePath)
    console.log('Creating directory at:', fullPath)
    await mkdir(fullPath, { recursive: true })
    // Refresh sidebar
    useVaultStore.getState().refresh()
    return { output: `Created directory: ${relativePath}` }
  } catch (error) {
    console.error('Mkdir error:', error)
    return {
      output: `Error creating directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: true,
    }
  }
}

async function handleTouch(vaultPath: string, args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { output: 'Usage: touch <filename>', error: true }
  }

  const { currentPath } = useNavStore.getState()
  // Join args in case filename has spaces (or was quoted)
  const fileName = args.join(' ')
  
  // Resolve full relative path
  const relativePath = currentPath === '/' 
    ? fileName 
    : `${currentPath}/${fileName}`.replace(/\/+/g, '/')

  try {
    const fullPath = await getFullPath(vaultPath, relativePath)
    console.log('Creating file at:', fullPath)
    // Create empty file (touch creates file if it doesn't exist)
    await writeTextFile(fullPath, '')
    // Refresh sidebar
    useVaultStore.getState().refresh()
    return { output: `Created file: ${relativePath}` }
  } catch (error) {
    console.error('Touch error:', error)
    return {
      output: `Error creating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: true,
    }
  }
}

