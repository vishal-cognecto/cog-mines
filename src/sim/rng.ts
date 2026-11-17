/** Small seeded PRNG (mulberry32) so simulated runs are repeatable. */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    id: (prefix: string, len = 8) => {
      let s = ''
      for (let i = 0; i < len; i++) s += '0123456789abcdefghjkmnpqrstvwxyz'[Math.floor(next() * 32)]
      return `${prefix}_${s}`
    },
  }
}

export type Rng = ReturnType<typeof createRng>
