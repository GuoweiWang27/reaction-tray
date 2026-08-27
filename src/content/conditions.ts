import type { ConditionDefinition } from '../domain/types'

export const conditions: ConditionDefinition[] = [
  { id: 'ignite', nameZh: '点燃', category: 'energy', lifecycle: 'one-shot' },
  { id: 'heat', nameZh: '加热', category: 'energy', lifecycle: 'one-shot' },
  { id: 'light', nameZh: '光照', category: 'energy', lifecycle: 'one-shot' },
  { id: 'mno2', nameZh: '二氧化锰催化', category: 'catalyst', lifecycle: 'persistent' },
]
