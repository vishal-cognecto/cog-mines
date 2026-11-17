import { describe, expect, it } from 'vitest'
import { chain, controls } from '../../src/config/content'
import { DROP_D, bypassAmount, road, shotFor, stationD } from '../../src/scenes/chain/layout'
import { Traffic, rolesFor } from '../../src/scenes/chain/sim'

describe('chain layout', () => {
  it('places the six stations in order along the road', () => {
    for (let k = 2; k <= 6; k++) expect(stationD[k]).toBeGreaterThan(stationD[k - 1])
    expect(stationD[1]).toBe(0)
    expect(stationD[6]).toBeLessThan(road.length)
  })

  it('puts the load drop between the weighbridge and the crusher', () => {
    expect(DROP_D).toBeGreaterThan(stationD[3])
    expect(DROP_D).toBeLessThan(stationD[4])
  })

  it('moves bypassing trucks off the road only round the weighbridge', () => {
    expect(bypassAmount(stationD[3])).toBeCloseTo(1)
    expect(bypassAmount(stationD[2])).toBe(0)
    expect(bypassAmount(stationD[4])).toBe(0)
  })

  it('has a camera shot for the overview and every station', () => {
    for (let s = 0; s <= 6; s++) {
      const shot = shotFor(s as 0)
      expect(shot.position[1]).toBeGreaterThan(shot.target[1])
    }
  })
})

describe('truck traffic', () => {
  it('gives every truck the same cycle length so trucks never bunch up', () => {
    for (const mode of ['before', 'after'] as const) {
      const t = new Traffic(mode)
      const cycles = t.tables.map((tt) => tt.cycle)
      for (const c of cycles) expect(c).toBeCloseTo(cycles[0], 6)
    }
  })

  it('shows the bypass and the drop only before Cognecto', () => {
    expect(rolesFor('before')).toContain('bypass')
    expect(rolesFor('before')).toContain('drop')
    expect(rolesFor('after').every((r) => r === 'normal')).toBe(true)
  })

  it('stops every truck at each station, except the bypass truck at the weighbridge', () => {
    const t = new Traffic('before')
    const seen: Map<number, Set<number | 'drop'>> = new Map(t.roles.map((_, i) => [i, new Set()]))
    const cycle = t.tables[0].cycle
    for (let time = 0; time < cycle * 2; time += 0.05) t.tick(0.05, (truck, stop) => seen.get(truck)!.add(stop))
    t.roles.forEach((role, i) => {
      const stops = seen.get(i)!
      for (const k of [1, 2, 4, 5, 6]) expect(stops.has(k)).toBe(true)
      expect(stops.has(3)).toBe(role !== 'bypass')
      expect(stops.has('drop')).toBe(role === 'drop')
    })
  })
})

describe('content', () => {
  it('maps every control to steps that exist', () => {
    const ids = new Set(chain.map((c) => c.id))
    for (const c of controls) for (const s of c.steps) expect(ids.has(s)).toBe(true)
  })

  it('gives every step at least one control with Cognecto', () => {
    for (const step of chain) expect(controls.some((c) => c.steps.includes(step.id))).toBe(true)
  })
})
