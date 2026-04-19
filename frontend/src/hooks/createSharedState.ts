import { useEffect, useState } from 'react'

// Tiny pub/sub store so multiple components using the same hook share state
// without a full React Context. Needed for notif badges: the Header and the
// page that clears the badge are separate components; without sharing,
// clearing on one wouldn't reflect in the other until the next poll.
export function createSharedState<T>(initial: T) {
  let value = initial
  const listeners = new Set<(v: T) => void>()

  const get = () => value
  const set = (next: T) => {
    if (next === value) return
    value = next
    listeners.forEach(l => l(value))
  }

  const subscribe = (listener: (v: T) => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  const useValue = (): T => {
    const [v, setV] = useState<T>(value)
    useEffect(() => subscribe(setV), [])
    return v
  }

  return { get, set, subscribe, useValue }
}
