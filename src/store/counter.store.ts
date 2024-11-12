import { createStore } from '@/utils'

interface ICounterStore {
  count: number
}

export const counterStore = createStore<ICounterStore>(() => ({ count: 0 }))
export const counterActions = {
  increment: () => counterStore.set(state => ({ count: state.count + 1 })),
  decrement: () => counterStore.set(state => ({ count: state.count - 1 })),
  reset: () => counterStore.set({ count: 0 }, true),
}
