import { openDB, type IDBPDatabase } from 'idb'
import type { TranslationRecord } from '../types'

const DB_NAME = 'online-translator'
const DB_VERSION = 1
const STORE = 'translations'
const FAV_KEY = 'favorites'
const HIST_KEY = 'history'
const MAX_HISTORY = 100

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
          store.createIndex('favorite', 'favorite')
        }
      },
    })
  }
  return dbPromise
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Fallback to localStorage if IndexedDB fails */
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota
  }
}

export async function addToHistory(
  data: Omit<TranslationRecord, 'id' | 'createdAt' | 'favorite'>,
): Promise<TranslationRecord> {
  const record: TranslationRecord = {
    ...data,
    id: uid(),
    createdAt: Date.now(),
    favorite: false,
  }

  try {
    const db = await getDb()
    await db.put(STORE, record)
    const all = await db.getAllFromIndex(STORE, 'createdAt')
    if (all.length > MAX_HISTORY) {
      const sorted = all.sort((a, b) => a.createdAt - b.createdAt)
      const toDelete = sorted.slice(0, all.length - MAX_HISTORY)
      for (const item of toDelete) {
        if (!item.favorite) await db.delete(STORE, item.id)
      }
    }
  } catch {
    const hist = lsGet<TranslationRecord[]>(HIST_KEY, [])
    hist.unshift(record)
    lsSet(HIST_KEY, hist.slice(0, MAX_HISTORY))
  }

  return record
}

export async function getHistory(): Promise<TranslationRecord[]> {
  try {
    const db = await getDb()
    const all = await db.getAll(STORE)
    return all.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return lsGet<TranslationRecord[]>(HIST_KEY, [])
  }
}

export async function deleteRecord(id: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(STORE, id)
  } catch {
    const hist = lsGet<TranslationRecord[]>(HIST_KEY, []).filter((r) => r.id !== id)
    lsSet(HIST_KEY, hist)
    const favs = lsGet<TranslationRecord[]>(FAV_KEY, []).filter((r) => r.id !== id)
    lsSet(FAV_KEY, favs)
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const db = await getDb()
    const all = await db.getAll(STORE)
    for (const item of all) {
      if (!item.favorite) await db.delete(STORE, item.id)
    }
  } catch {
    const favs = lsGet<TranslationRecord[]>(FAV_KEY, [])
    lsSet(HIST_KEY, favs)
  }
}

export async function toggleFavorite(id: string): Promise<TranslationRecord | null> {
  try {
    const db = await getDb()
    const record = await db.get(STORE, id)
    if (!record) return null
    record.favorite = !record.favorite
    await db.put(STORE, record)
    return record
  } catch {
    const hist = lsGet<TranslationRecord[]>(HIST_KEY, [])
    const idx = hist.findIndex((r) => r.id === id)
    if (idx === -1) return null
    hist[idx] = { ...hist[idx], favorite: !hist[idx].favorite }
    lsSet(HIST_KEY, hist)
    const favs = hist.filter((r) => r.favorite)
    lsSet(FAV_KEY, favs)
    return hist[idx]
  }
}

export async function getFavorites(): Promise<TranslationRecord[]> {
  try {
    const db = await getDb()
    const all = await db.getAll(STORE)
    return all.filter((r) => r.favorite).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return lsGet<TranslationRecord[]>(FAV_KEY, [])
  }
}

export async function addFavorite(
  data: Omit<TranslationRecord, 'id' | 'createdAt'>,
): Promise<TranslationRecord> {
  const record: TranslationRecord = {
    ...data,
    id: uid(),
    createdAt: Date.now(),
    favorite: true,
  }

  try {
    const db = await getDb()
    await db.put(STORE, record)
  } catch {
    const favs = lsGet<TranslationRecord[]>(FAV_KEY, [])
    favs.unshift(record)
    lsSet(FAV_KEY, favs)
    const hist = lsGet<TranslationRecord[]>(HIST_KEY, [])
    hist.unshift(record)
    lsSet(HIST_KEY, hist.slice(0, MAX_HISTORY))
  }

  return record
}
