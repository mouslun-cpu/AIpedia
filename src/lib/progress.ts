// 學習進度：整個平台唯一的「狀態系統」，全部存在瀏覽器 localStorage，沒有任何後台。
// 記錄兩件事：學生探索過哪些知識點、完成了哪些挑戰。
// 用 module 層級的小 store + useSyncExternalStore，讓首頁、護照、各模組即時同步。

import { useSyncExternalStore } from 'react'

const KEY = 'aipedia:progress:v1'

export interface ProgressState {
  /** 探索過的知識點 slug */
  explored: string[]
  /** 完成的挑戰，格式 "slug::challengeId" */
  challenges: string[]
}

const EMPTY: ProgressState = { explored: [], challenges: [] }

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw)
    return {
      explored: Array.isArray(p.explored) ? p.explored : [],
      challenges: Array.isArray(p.challenges) ? p.challenges : [],
    }
  } catch {
    return EMPTY
  }
}

let state = read()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* localStorage 滿了或被停用就靜默忽略 */
  }
  emit()
}

// 跨分頁同步（學生同時開兩個分頁時）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = read()
      emit()
    }
  })
}

export function challengeKey(slug: string, id: string) {
  return `${slug}::${id}`
}

export function markExplored(slug: string) {
  if (state.explored.includes(slug)) return
  state = { ...state, explored: [...state.explored, slug] }
  persist()
}

export function completeChallenge(slug: string, id: string) {
  const key = challengeKey(slug, id)
  if (state.challenges.includes(key)) return
  state = { ...state, challenges: [...state.challenges, key] }
  persist()
}

export function resetProgress() {
  state = { explored: [], challenges: [] }
  persist()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function getSnapshot() {
  return state
}

/** React hook：回傳目前進度，任何地方 markExplored / completeChallenge 都會即時重繪。 */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
