import { useEffect, useRef } from 'react'

/**
 * Subscribe to a shared 30s tick. The callback runs once on subscribe and
 * every 30 seconds thereafter while the component is mounted. `enabled=false`
 * pauses the subscription without unmounting the caller.
 *
 * Why a hook instead of a module-level timer: each subscriber decides
 * independently whether to fetch (based on its own auth/role), and React
 * cleanup tears down the interval when the last subscriber unmounts.
 */
const POLL_INTERVAL_MS = 30_000

export function useGlobalPoll(callback: () => void, enabled: boolean = true) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    // Fire once immediately so the subscriber has data without waiting 30s.
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled])
}
