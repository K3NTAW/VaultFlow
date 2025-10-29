'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface FileNameInputProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  placeholder: string
  defaultName: string
  title: string
}

export function FileNameInput({
  isOpen,
  onClose,
  onConfirm,
  placeholder,
  defaultName,
  title,
}: FileNameInputProps) {
  const [inputValue, setInputValue] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultName)
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, defaultName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onConfirm(inputValue.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!inputValue.trim()}
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

