import { describe, expect, it } from 'vitest'

import AbilityScoreModel from '@/models/2014/abilityScore'
import ClassModel from '@/models/2014/class'
import FeatModel from '@/models/2014/feat'
import RaceModel from '@/models/2014/race'
import SpellModel from '@/models/2014/spell'
import { ChoiceModel } from '@/models/common/choice'

describe('API contract fields', () => {
  it('exposes bilingual model paths used by the contract', () => {
    expect(RaceModel.schema.path('name_en')).toBeDefined()
    expect(RaceModel.schema.path('alignment_en')).toBeDefined()
    expect(RaceModel.schema.path('language_desc_en')).toBeDefined()
    expect(RaceModel.schema.path('starting_proficiencies')).toBeDefined()
    expect(RaceModel.schema.path('starting_proficiency_options')).toBeDefined()

    expect(ClassModel.schema.path('name_en')).toBeDefined()
    expect(SpellModel.schema.path('name_en')).toBeDefined()
    expect(SpellModel.schema.path('desc_en')).toBeDefined()
    expect(FeatModel.schema.path('name_en')).toBeDefined()
    expect(FeatModel.schema.path('desc_en')).toBeDefined()
    expect(AbilityScoreModel.schema.path('name_en')).toBeDefined()

    expect(ChoiceModel.schema.path('desc_en')).toBeDefined()
  })
})
