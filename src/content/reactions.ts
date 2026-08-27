import type { ReactionDefinition, ReactionTerm } from '../domain/types'

const term = (speciesId: string, coefficient: number, phase: ReactionTerm['phase']): ReactionTerm => ({ speciesId, coefficient, phase })
const review = { status: 'pending' as const, version: '1.1.0' }

export const reactions: ReactionDefinition[] = [
  {
    id: 'reaction.hydrogen-hydroxide', equationDisplay: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactants: [term('species.hydrogen-ion', 1, 'aq'), term('species.hydroxide-ion', 1, 'aq')], products: [term('species.water', 1, 'l')],
    requiredConditionIds: [], reactionType: 'neutralization', observableCue: 'water', explanationZh: '氢离子与氢氧根离子按 1:1 结合生成水。', review,
  },
  {
    id: 'reaction.silver-chloride-precipitation', equationDisplay: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    reactants: [term('species.silver-ion', 1, 'aq'), term('species.chloride-ion', 1, 'aq')], products: [term('species.silver-chloride', 1, 's')],
    requiredConditionIds: [], reactionType: 'precipitation', observableCue: 'precipitate', explanationZh: '银离子与氯离子生成氯化银沉淀。', review,
  },
  {
    id: 'reaction.copper-hydroxide-ionic', equationDisplay: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    reactants: [term('species.copper-ii-ion', 1, 'aq'), term('species.hydroxide-ion', 2, 'aq')], products: [term('species.copper-ii-hydroxide', 1, 's')],
    requiredConditionIds: [], reactionType: 'precipitation', observableCue: 'precipitate', explanationZh: '一个铜离子需要两个氢氧根离子，生成蓝色氢氧化铜沉淀。', review,
  },
  {
    id: 'reaction.limewater-carbon-dioxide', equationDisplay: 'CO₂(g) + Ca(OH)₂(aq) → CaCO₃(s)↓ + H₂O(l)',
    reactants: [term('species.carbon-dioxide', 1, 'g'), term('species.calcium-hydroxide', 1, 'aq')], products: [term('species.calcium-carbonate', 1, 's'), term('species.water', 1, 'l')],
    requiredConditionIds: [], reactionType: 'precipitation', observableCue: 'precipitate', explanationZh: '二氧化碳使石灰水生成碳酸钙沉淀；本关采用适量二氧化碳条件。', review,
  },
  {
    id: 'reaction.calcium-carbonate-hcl', equationDisplay: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)↑',
    reactants: [term('species.calcium-carbonate', 1, 's'), term('species.hydrochloric-acid', 2, 'aq')], products: [term('species.calcium-chloride', 1, 'aq'), term('species.water', 1, 'l'), term('species.carbon-dioxide', 1, 'g')],
    requiredConditionIds: [], reactionType: 'other', observableCue: 'gas', explanationZh: '碳酸钙与盐酸反应放出二氧化碳。', review,
  },
  {
    id: 'reaction.sodium-carbonate-hcl', equationDisplay: 'Na₂CO₃(aq) + 2HCl(aq) → 2NaCl(aq) + H₂O(l) + CO₂(g)↑',
    reactants: [term('species.sodium-carbonate', 1, 'aq'), term('species.hydrochloric-acid', 2, 'aq')], products: [term('species.sodium-chloride', 2, 'aq'), term('species.water', 1, 'l'), term('species.carbon-dioxide', 1, 'g')],
    requiredConditionIds: [], reactionType: 'other', observableCue: 'gas', explanationZh: '碳酸钠与盐酸反应放出二氧化碳。', review,
  },
  {
    id: 'reaction.iron-hcl', equationDisplay: 'Fe(s) + 2HCl(aq) → FeCl₂(aq) + H₂(g)↑',
    reactants: [term('species.iron', 1, 's'), term('species.hydrochloric-acid', 2, 'aq')], products: [term('species.iron-ii-chloride', 1, 'aq'), term('species.hydrogen', 1, 'g')],
    requiredConditionIds: [], reactionType: 'displacement', observableCue: 'gas', explanationZh: '铁与稀盐酸反应放出氢气。', review,
  },
  {
    id: 'reaction.zinc-copper-sulfate', equationDisplay: 'Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)',
    reactants: [term('species.zinc', 1, 's'), term('species.copper-ii-sulfate', 1, 'aq')], products: [term('species.zinc-sulfate', 1, 'aq'), term('species.copper', 1, 's')],
    requiredConditionIds: [], reactionType: 'displacement', observableCue: 'metal', explanationZh: '锌置换出硫酸铜中的铜。', review,
  },
  {
    id: 'reaction.hydrogen-combustion', equationDisplay: '2H₂(g) + O₂(g) → 2H₂O(l)',
    reactants: [term('species.hydrogen', 2, 'g'), term('species.oxygen', 1, 'g')], products: [term('species.water', 2, 'l')],
    requiredConditionIds: ['ignite'], reactionType: 'combustion', observableCue: 'water', explanationZh: '氢气与氧气在点燃条件下反应生成水。', safetyNote: '不展示混合气体点燃的实验操作。', review,
  },
  {
    id: 'reaction.magnesium-combustion', equationDisplay: '2Mg(s) + O₂(g) → 2MgO(s)',
    reactants: [term('species.magnesium', 2, 's'), term('species.oxygen', 1, 'g')], products: [term('species.magnesium-oxide', 2, 's')],
    requiredConditionIds: ['ignite'], reactionType: 'combustion', observableCue: 'light', explanationZh: '镁在氧气中燃烧生成氧化镁。', safetyNote: '不展示点燃步骤；强光反馈必须支持减少动态效果。', review,
  },
  {
    id: 'reaction.hydrogen-peroxide-decomposition', equationDisplay: '2H₂O₂(aq) → 2H₂O(l) + O₂(g)↑',
    reactants: [term('species.hydrogen-peroxide', 2, 'aq')], products: [term('species.water', 2, 'l'), term('species.oxygen', 1, 'g')],
    requiredConditionIds: ['mno2'], reactionType: 'decomposition', observableCue: 'gas', explanationZh: '二氧化锰催化过氧化氢分解，催化剂不被消耗。', review,
  },
  {
    id: 'reaction.silver-chloride-photolysis', equationDisplay: '2AgCl(s) → 2Ag(s) + Cl₂(g)↑',
    reactants: [term('species.silver-chloride', 2, 's')], products: [term('species.silver', 2, 's'), term('species.chlorine', 1, 'g')],
    requiredConditionIds: ['light'], reactionType: 'decomposition', observableCue: 'color-change', explanationZh: '氯化银在光照下分解并逐渐变暗。', safetyNote: '氯气有毒；不展示制备步骤。', review,
  },
  {
    id: 'reaction.sodium-bicarbonate-decomposition', equationDisplay: '2NaHCO₃(s) → Na₂CO₃(s) + H₂O(l) + CO₂(g)↑',
    reactants: [term('species.sodium-bicarbonate', 2, 's')], products: [term('species.sodium-carbonate', 1, 's'), term('species.water', 1, 'l'), term('species.carbon-dioxide', 1, 'g')],
    requiredConditionIds: ['heat'], reactionType: 'decomposition', observableCue: 'gas', explanationZh: '碳酸氢钠受热分解。', review,
  },
  {
    id: 'reaction.copper-oxide-hcl', equationDisplay: 'CuO(s) + 2HCl(aq) → CuCl₂(aq) + H₂O(l)',
    reactants: [term('species.copper-ii-oxide', 1, 's'), term('species.hydrochloric-acid', 2, 'aq')], products: [term('species.copper-ii-chloride', 1, 'aq'), term('species.water', 1, 'l')],
    requiredConditionIds: [], reactionType: 'other', observableCue: 'color-change', explanationZh: '氧化铜与盐酸反应生成氯化铜和水。', review,
  },
  {
    id: 'reaction.copper-sulfate-sodium-hydroxide', equationDisplay: 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ + Na₂SO₄(aq)',
    reactants: [term('species.copper-ii-sulfate', 1, 'aq'), term('species.sodium-hydroxide', 2, 'aq')], products: [term('species.copper-ii-hydroxide', 1, 's'), term('species.sodium-sulfate', 1, 'aq')],
    requiredConditionIds: [], reactionType: 'precipitation', observableCue: 'precipitate', explanationZh: '完整分子式表达与净离子式 Cu²⁺ + 2OH⁻ 的关系必须在教学反馈中说明。', review,
  },
  {
    id: 'reaction.barium-sulfate-precipitation', equationDisplay: 'BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s)↓ + 2NaCl(aq)',
    reactants: [term('species.barium-chloride', 1, 'aq'), term('species.sodium-sulfate', 1, 'aq')], products: [term('species.barium-sulfate', 1, 's'), term('species.sodium-chloride', 2, 'aq')],
    requiredConditionIds: [], reactionType: 'precipitation', observableCue: 'precipitate', explanationZh: '钡离子与硫酸根离子形成硫酸钡沉淀。', safetyNote: '可溶性钡盐有毒；不展示实验操作步骤。', review,
  },
  {
    id: 'reaction.iron-oxide-carbon-monoxide', equationDisplay: 'Fe₂O₃(s) + 3CO(g) → 2Fe(s) + 3CO₂(g)',
    reactants: [term('species.iron-iii-oxide', 1, 's'), term('species.carbon-monoxide', 3, 'g')], products: [term('species.iron', 2, 's'), term('species.carbon-dioxide', 3, 'g')],
    requiredConditionIds: ['heat'], reactionType: 'other', observableCue: 'metal', explanationZh: '一氧化碳在高温下还原氧化铁。', safetyNote: '一氧化碳有毒；只展示工业反应关系。', review,
  },
]
