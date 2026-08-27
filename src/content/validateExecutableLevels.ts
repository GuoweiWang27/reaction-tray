import type { ConditionDefinition, LevelDefinition, ReactionDefinition } from '../domain/types'
import { applyCommand, createGame } from '../game/engine'

export function validateExecutableLevels(
  levels: LevelDefinition[],
  reactions: ReactionDefinition[],
  conditions: ConditionDefinition[],
): string[] {
  const errors: string[] = []
  for (const level of levels) {
    const context = { level, reactions, conditions }
    let state = createGame(level)
    for (const [index, command] of level.standardSolutionSteps.entries()) {
      try {
        const result = applyCommand(state, command, context)
        if (result.state === state) {
          errors.push(`${level.id}: standard solution step ${index + 1} made no state change`)
          continue
        }
        state = result.state
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${level.id}: standard solution step ${index + 1} failed: ${message}`)
        break
      }
    }
    if (state.status !== 'won') errors.push(`${level.id}: standard solution ended with status ${state.status}, expected won`)
  }
  return errors
}
