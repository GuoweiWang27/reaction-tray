import { chapter1Levels } from './chapter-1'
import { chapter2Levels } from './chapter-2'
import { chapter3Levels } from './chapter-3'
import { chapter4Levels } from './chapter-4'

export { chapter1Levels } from './chapter-1'
export { chapter2Levels } from './chapter-2'
export { chapter3Levels } from './chapter-3'
export { chapter4Levels } from './chapter-4'

export const levels = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels, ...chapter4Levels]

export const chapters = [
  { id: 1, titleZh: '比例与沉淀', levelOrders: [1, 2, 3, 4, 5] },
  { id: 2, titleZh: '气体与置换', levelOrders: [6, 7, 8, 9, 10] },
  { id: 3, titleZh: '条件控制', levelOrders: [11, 12, 13, 14, 15] },
  { id: 4, titleZh: '链式综合', levelOrders: [16, 17, 18, 19, 20] },
]
