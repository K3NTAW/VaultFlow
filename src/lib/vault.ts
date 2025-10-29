import { readDir, readTextFile, writeTextFile, remove, mkdir, copyFile } from '@tauri-apps/plugin-fs'

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
 * Creates parent directories if they don't exist
 */
export async function writeFileToVault(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = await getFullPath(vaultPath, relativePath)
  console.log('Writing file:', { vaultPath, relativePath, fullPath })
  
  try {
    // Get the directory path (parent of the file)
    const pathParts = fullPath.split(/[/\\]/)
    const fileName = pathParts.pop()
    const dirPath = pathParts.join(pathParts[0]?.includes('\\') ? '\\' : '/')
    
    // Try to create parent directories if they don't exist
    // Note: Tauri v2 mkdir might not support recursive option the same way
    if (dirPath && dirPath !== vaultPath) {
      try {
        // Try recursive first (if supported)
        await mkdir(dirPath, { recursive: true }).catch(async (err) => {
          // If recursive doesn't work, create directories one by one
          console.log('Recursive mkdir failed, trying manual creation:', err)
          const parts = dirPath.replace(vaultPath, '').split(/[/\\]/).filter(Boolean)
          let currentPath = vaultPath
          for (const part of parts) {
            currentPath = currentPath + (currentPath.includes('\\') ? '\\' : '/') + part
            try {
              await mkdir(currentPath)
            } catch (e) {
              // Ignore if already exists
              if (!(e instanceof Error && (e.message.includes('exists') || e.message.includes('EEXIST')))) {
                throw e
              }
            }
          }
        })
      } catch (mkdirError) {
        // Ignore error if directory already exists
        if (!(mkdirError instanceof Error && (mkdirError.message.includes('exists') || mkdirError.message.includes('EEXIST')))) {
          console.warn('Could not create directory:', mkdirError)
        }
      }
    }
    
    console.log('Calling writeTextFile...')
    await writeTextFile(fullPath, content)
    console.log('File written successfully')
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

/**
 * Export a file to a user-selected location
 */
export async function exportFile(
  vaultPath: string,
  relativePath: string
): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const fullPath = await getFullPath(vaultPath, relativePath)
  
  // Determine default filename
  const fileName = relativePath.split('/').pop() || 'export'
  
  try {
    const destination = await save({
      defaultPath: fileName,
      title: 'Export File',
    })
    
    if (destination && typeof destination === 'string') {
      await copyFile(fullPath, destination)
    }
  } catch (error) {
    console.error('Error exporting file:', error)
    throw error
  }
}

