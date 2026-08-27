import type { SpeciesDefinition } from '../domain/types'

const aqIon = (id: string, formula: string, machineFormula: string, nameZh: string, composition: Record<string, number>, charge: number): SpeciesDefinition => ({
  id, formula, machineFormula, nameZh, kind: 'ion', composition, charge, defaultPhase: 'aq',
})

const substance = (id: string, formula: string, nameZh: string, composition: Record<string, number>, defaultPhase: SpeciesDefinition['defaultPhase'], kind: SpeciesDefinition['kind'] = 'compound', safetyNote?: string): SpeciesDefinition => ({
  id, formula, machineFormula: formula.replaceAll(/[₀-₉]/g, (digit) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit))), nameZh, kind, composition, charge: 0, defaultPhase, safetyNote,
})

export const species: SpeciesDefinition[] = [
  aqIon('species.hydrogen-ion', 'H⁺', 'H+', '氢离子', { H: 1 }, 1),
  aqIon('species.hydroxide-ion', 'OH⁻', 'OH-', '氢氧根离子', { O: 1, H: 1 }, -1),
  aqIon('species.silver-ion', 'Ag⁺', 'Ag+', '银离子', { Ag: 1 }, 1),
  aqIon('species.chloride-ion', 'Cl⁻', 'Cl-', '氯离子', { Cl: 1 }, -1),
  aqIon('species.copper-ii-ion', 'Cu²⁺', 'Cu2+', '铜离子', { Cu: 1 }, 2),
  substance('species.water', 'H₂O', '水', { H: 2, O: 1 }, 'l'),
  substance('species.silver-chloride', 'AgCl', '氯化银', { Ag: 1, Cl: 1 }, 's'),
  substance('species.copper-ii-hydroxide', 'Cu(OH)₂', '氢氧化铜', { Cu: 1, O: 2, H: 2 }, 's'),
  substance('species.carbon-dioxide', 'CO₂', '二氧化碳', { C: 1, O: 2 }, 'g'),
  substance('species.calcium-hydroxide', 'Ca(OH)₂', '氢氧化钙', { Ca: 1, O: 2, H: 2 }, 'aq'),
  substance('species.calcium-carbonate', 'CaCO₃', '碳酸钙', { Ca: 1, C: 1, O: 3 }, 's'),
  substance('species.hydrochloric-acid', 'HCl', '盐酸', { H: 1, Cl: 1 }, 'aq'),
  substance('species.calcium-chloride', 'CaCl₂', '氯化钙', { Ca: 1, Cl: 2 }, 'aq'),
  substance('species.sodium-carbonate', 'Na₂CO₃', '碳酸钠', { Na: 2, C: 1, O: 3 }, 'aq'),
  substance('species.sodium-chloride', 'NaCl', '氯化钠', { Na: 1, Cl: 1 }, 'aq'),
  substance('species.iron', 'Fe', '铁', { Fe: 1 }, 's', 'element'),
  substance('species.iron-ii-chloride', 'FeCl₂', '氯化亚铁', { Fe: 1, Cl: 2 }, 'aq'),
  substance('species.hydrogen', 'H₂', '氢气', { H: 2 }, 'g', 'element', '氢气与氧气混合并点燃具有危险性；游戏不提供实验操作步骤。'),
  substance('species.copper', 'Cu', '铜', { Cu: 1 }, 's', 'element'),
  substance('species.zinc', 'Zn', '锌', { Zn: 1 }, 's', 'element'),
  substance('species.copper-ii-sulfate', 'CuSO₄', '硫酸铜', { Cu: 1, S: 1, O: 4 }, 'aq'),
  substance('species.zinc-sulfate', 'ZnSO₄', '硫酸锌', { Zn: 1, S: 1, O: 4 }, 'aq'),
  substance('species.oxygen', 'O₂', '氧气', { O: 2 }, 'g', 'element'),
  substance('species.magnesium', 'Mg', '镁', { Mg: 1 }, 's', 'element', '燃烧的镁发出强光；游戏不提供实验操作步骤。'),
  substance('species.magnesium-oxide', 'MgO', '氧化镁', { Mg: 1, O: 1 }, 's'),
  substance('species.hydrogen-peroxide', 'H₂O₂', '过氧化氢', { H: 2, O: 2 }, 'aq'),
  substance('species.silver', 'Ag', '银', { Ag: 1 }, 's', 'element'),
  substance('species.chlorine', 'Cl₂', '氯气', { Cl: 2 }, 'g', 'element', '氯气有毒；游戏只呈现反应关系，不提供制备步骤。'),
  substance('species.sodium-bicarbonate', 'NaHCO₃', '碳酸氢钠', { Na: 1, H: 1, C: 1, O: 3 }, 's'),
  substance('species.copper-ii-oxide', 'CuO', '氧化铜', { Cu: 1, O: 1 }, 's'),
  substance('species.copper-ii-chloride', 'CuCl₂', '氯化铜', { Cu: 1, Cl: 2 }, 'aq'),
  substance('species.sodium-hydroxide', 'NaOH', '氢氧化钠', { Na: 1, O: 1, H: 1 }, 'aq'),
  substance('species.sodium-sulfate', 'Na₂SO₄', '硫酸钠', { Na: 2, S: 1, O: 4 }, 'aq'),
  substance('species.barium-chloride', 'BaCl₂', '氯化钡', { Ba: 1, Cl: 2 }, 'aq', 'compound', '可溶性钡盐有毒；游戏不提供实验操作步骤。'),
  substance('species.barium-sulfate', 'BaSO₄', '硫酸钡', { Ba: 1, S: 1, O: 4 }, 's'),
  substance('species.iron-iii-oxide', 'Fe₂O₃', '氧化铁', { Fe: 2, O: 3 }, 's'),
  substance('species.carbon-monoxide', 'CO', '一氧化碳', { C: 1, O: 1 }, 'g', 'compound', '一氧化碳有毒；游戏不提供实验操作步骤。'),
]
