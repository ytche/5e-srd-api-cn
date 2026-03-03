import { describe, expect, it } from 'vitest'

import { mapSubraceForContract } from '@/util/contractMapper'

describe('contractMapper', () => {
  it('maps subrace.racial_traits to traits', () => {
    const input = {
      index: 'high-elf',
      racial_traits: [{ index: 'keen-senses' }]
    }

    const mapped = mapSubraceForContract(input)
    expect(mapped.traits).toEqual([{ index: 'keen-senses' }])
    expect((mapped as any).racial_traits).toBeUndefined()
  })

  it('keeps existing traits unchanged', () => {
    const input = {
      index: 'high-elf',
      traits: [{ index: 'darkvision' }],
      racial_traits: [{ index: 'keen-senses' }]
    }

    const mapped = mapSubraceForContract(input)
    expect(mapped.traits).toEqual([{ index: 'darkvision' }])
  })
})
