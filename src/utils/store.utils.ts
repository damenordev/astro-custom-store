export type TStorePartialState<T> = T | Partial<T> | ((state: T) => T | Partial<T>)

export interface IStoreApi<T> {
  set: (partial: TStorePartialState<T>, replace?: boolean) => void
  get: () => T
  getInitial: () => T
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
}

export type TStoreStateCreator<T> = (set: IStoreApi<T>['set'], get: IStoreApi<T>['get'], store: IStoreApi<T>) => T

export interface IStorePersistOptions {
  key?: string
  storage?: Storage | null
  serialize?: (state: unknown) => string
  deserialize?: (str: string) => unknown
}

const globalStores = new Map<string, IStoreApi<any>>()

const DEFAULT_STORAGE = typeof window !== 'undefined' ? window.sessionStorage : null
const defaultSerialize = (state: unknown): string => JSON.stringify(state)
const defaultDeserialize = (str: string): unknown => JSON.parse(str)

export const createStore = <T>(initializer: TStoreStateCreator<T>, options: IStorePersistOptions = {}): IStoreApi<T> => {
  const { key = 'default_store', storage = DEFAULT_STORAGE, serialize = defaultSerialize, deserialize = defaultDeserialize } = options

  if (globalStores.has(key)) return globalStores.get(key) as IStoreApi<T>

  let state: T
  const listeners = new Set<(state: T, prevState: T) => void>()

  const persistState = (newState: T): void => {
    if (!storage) return
    try {
      const serializedState = serialize(newState)
      storage.setItem(key, serializedState)
    } catch (error) {
      console.warn('Failed to persist state:', error)
    }
  }

  const loadPersistedState = (): T | null => {
    if (!storage) return null
    try {
      const savedState = storage.getItem(key)
      return savedState ? (deserialize(savedState) as T) : null
    } catch (error) {
      console.warn('Failed to load persisted state:', error)
      return null
    }
  }

  const getNextState = (partial: TStorePartialState<T>, currentState: T): T => {
    const nextState = typeof partial === 'function' ? (partial as (state: T) => T | Partial<T>)(currentState) : partial

    if (!nextState || typeof nextState !== 'object') return nextState as T
    return { ...currentState, ...nextState }
  }

  const set: IStoreApi<T>['set'] = (partial, replace = false) => {
    const nextState = replace ? ((typeof partial === 'function' ? (partial as (state: T) => T)(state) : partial) as T) : getNextState(partial, state)

    if (!Object.is(nextState, state)) {
      const prevState = state
      state = nextState
      persistState(state)
      listeners.forEach(listener => {
        try {
          listener(state, prevState)
        } catch (error) {
          console.error('Error in listener:', error)
        }
      })
    }
  }

  const get: IStoreApi<T>['get'] = () => state
  const getInitial: IStoreApi<T>['getInitial'] = () => initialState

  const subscribe: IStoreApi<T>['subscribe'] = listener => {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }

  const api: IStoreApi<T> = { set, get, getInitial, subscribe }
  const initialState = (state = loadPersistedState() ?? initializer(set, get, api))

  if (storage) persistState(state)

  globalStores.set(key, api)

  return api
}
