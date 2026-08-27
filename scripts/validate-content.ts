import { conditions } from '../src/content/conditions'
import { verticalSliceLevels } from '../src/content/levels/vertical-slice'
import { reactions } from '../src/content/reactions'
import { species } from '../src/content/species'
import { validateAllContent } from '../src/content/validateContent'

const errors = validateAllContent(species, reactions, conditions, verticalSliceLevels)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`content validation passed: ${species.length} species, ${reactions.length} reactions, ${verticalSliceLevels.length} levels`)
}
