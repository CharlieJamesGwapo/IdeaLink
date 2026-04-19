import { useCallback, useEffect, useState } from 'react'
import { getHighlights, reactHighlight } from '../api/highlights'
import type { Highlight } from '../types'

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getHighlights()
      setHighlights(res.data ?? [])
    } catch (e) {
      setError('Failed to load highlights')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const toggleReact = useCallback(async (id: number) => {
    // Optimistic update
    setHighlights(prev => prev.map(h =>
      h.id === id
        ? { ...h, viewer_reacted: !h.viewer_reacted, react_count: h.react_count + (h.viewer_reacted ? -1 : 1) }
        : h
    ))
    try {
      const res = await reactHighlight(id)
      setHighlights(prev => {
        const next = prev.map(h =>
          h.id === id ? { ...h, react_count: res.data.react_count, viewer_reacted: res.data.viewer_reacted } : h
        )
        // Re-sort by react_count desc, ties by created_at desc.
        return [...next].sort((a, b) => {
          if (b.react_count !== a.react_count) return b.react_count - a.react_count
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      })
    } catch {
      // Roll back on failure
      void refetch()
    }
  }, [refetch])

  return { highlights, isLoading, error, refetch, toggleReact }
}
