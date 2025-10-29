import { readDir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
}

/**
 * Get the full path by joining vault path with relative path
 */
export async function getFullPath(vaultPath: string, relativePath: string = ''): Promise<string> {
  if (!relativePath || relativePath === '/') {
    return vaultPath
  }
  // Remove leading slash if present
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  // Handle path joining manually (cross-platform)
  const separator = vaultPath.includes('\\') ? '\\' : '/'
  return vaultPath + separator + cleanPath.replace(/\//g, separator)
}

/**
 * Read directory contents recursively
 */
export async function readDirectory(vaultPath: string, relativePath: string = ''): Promise<FileEntry[]> {
  const fullPath = await getFullPath(vaultPath, relativePath)
  
  try {
    const entries = await readDir(fullPath)
    const result: FileEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/folders that start with . (like .obsidian, .git, etc.)
      if (entry.name.startsWith('.')) {
        continue
      }

      const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
      const fileEntry: FileEntry = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory ?? false,
      }

      // Recursively read directories, but catch errors to continue reading other entries
      if (entry.isDirectory) {
        try {
          fileEntry.children = await readDirectory(vaultPath, entryPath)
        } catch (error) {
          // If we can't read a subdirectory, just skip it and continue
          console.warn(`Skipping directory ${entryPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Continue without children
        }
      }

      result.push(fileEntry)
    }

    // Sort: directories first, then files, both alphabetically
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return result
  } catch (error) {
    console.error('Error reading directory:', error)
    return []
  }
}

/**
 * Read a text file from the vault
 */
export async function readFile(vaultPath: string, relativePath: string): Promise<string> {
  const fullPath = await getFullPath(vaultPath, relativePath)
  try {
    return await readTextFile(fullPath)
  } catch (error) {
    console.error('Error reading file:', error)
    throw error
  }
}

/**
 * Write a text file to the vault
 */
export async function writeFileToVault(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = await getFullPath(vaultPath, relativePath)
  try {
    await writeTextFile(fullPath, content)
  } catch (error) {
    console.error('Error writing file:', error)
    throw error
  }
}

/**
 * Delete a file from the vault
 */
export async function deleteFile(vaultPath: string, relativePath: string): Promise<void> {
  const fullPath = await getFullPath(vaultPath, relativePath)
  try {
    await remove(fullPath)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Check if a path exists and is a directory
 */
export async function isDirectory(vaultPath: string, relativePath: string): Promise<boolean> {
  try {
    const fullPath = await getFullPath(vaultPath, relativePath)
    const entries = await readDir(fullPath)
    return true // If we can read it as directory, it's a directory
  } catch {
    return false
  }
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Check if file is a note (markdown)
 */
export function isNote(filename: string): boolean {
  return filename.endsWith('.md')
}

/**
 * Check if file is a canvas (Excalidraw JSON)
 */
export function isCanvas(filename: string): boolean {
  return filename.endsWith('.excalidraw.json')
}

