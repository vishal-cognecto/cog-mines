import type { Mode } from '../../config/content'
import { DROP_D, road, stationD } from './layout'

/**
 * Truck traffic along the chain. Each truck follows a fixed timetable: drive,
 * stop at each station, unload at the buyer, then start again at the pit.
 * All trucks share one cycle length, offset in time, so they never bunch up.
 *
 * In the "before" scene two trucks show the gaps: one skips the weighbridge
 * and one stops on the road and drops part of its load.
 */

export const TRUCKS = 4
export const SPEED = 3.4
export const FADE_S = 0.5

export type TruckRole = 'normal' | 'bypass' | 'drop'

/** Seconds a truck stands at each station, index 1-6. */
const DWELL = [0, 2.0, 1.0, 1.6, 1.4, 1.2, 1.6]
const DROP_DWELL = 1.4

export interface Segment {
  t0: number
  t1: number
  d0: number
  d1: number
  /** Station index when the truck stands at a station, 'drop' when it stops to drop load. */
  stop: number | 'drop' | null
}

export interface Timetable {
  segments: Segment[]
  cycle: number
}

/** Extra time a truck spends somewhere so that every timetable has the same length. */
const SLACK = DWELL[3] + DROP_DWELL

function timetable(role: TruckRole): Timetable {
  const stops: { d: number; dwell: number; stop: number | 'drop' }[] = []
  for (let k = 1; k <= 6; k++) {
    if (k === 3 && role === 'bypass') continue
    let dwell = DWELL[k]
    if (k === 6) dwell += SLACK - (role === 'bypass' ? 0 : DWELL[3]) - (role === 'drop' ? DROP_DWELL : 0)
    stops.push({ d: stationD[k], dwell, stop: k })
  }
  if (role === 'drop') stops.push({ d: DROP_D, dwell: DROP_DWELL, stop: 'drop' })
  stops.sort((a, b) => a.d - b.d)

  const segments: Segment[] = []
  let t = 0
  let d = 0
  for (const s of stops) {
    if (s.d > d) {
      const dt = (s.d - d) / SPEED
      segments.push({ t0: t, t1: t + dt, d0: d, d1: s.d, stop: null })
      t += dt
      d = s.d
    }
    segments.push({ t0: t, t1: t + s.dwell, d0: d, d1: d, stop: s.stop })
    t += s.dwell
  }
  if (d < road.length) {
    const dt = (road.length - d) / SPEED
    segments.push({ t0: t, t1: t + dt, d0: d, d1: road.length, stop: null })
    t += dt
  }
  return { segments, cycle: t }
}

export function rolesFor(mode: Mode): TruckRole[] {
  return mode === 'before' ? ['normal', 'bypass', 'drop', 'normal'] : ['normal', 'normal', 'normal', 'normal']
}

export interface TruckState {
  d: number
  /** Index of the current timetable segment. */
  seg: number
  /** Station index (or 'drop') while standing, else null. */
  stop: number | 'drop' | null
  /** 0..1, for fading in at the pit and out at the buyer. */
  alpha: number
  /** Laps completed, used to tell repeated stops apart. */
  lap: number
}

export class Traffic {
  readonly tables: Timetable[]
  readonly roles: TruckRole[]
  readonly trucks: TruckState[]
  time = 0

  constructor(mode: Mode) {
    this.roles = rolesFor(mode)
    this.tables = this.roles.map(timetable)
    this.trucks = this.roles.map(() => ({ d: 0, seg: -1, stop: null, alpha: 0, lap: 0 }))
  }

  /**
   * Advances time and calls `onStop` once each time a truck arrives at a stop.
   * The first truck starts mid-way so a fresh scene already shows traffic.
   */
  tick(dt: number, onStop: (truck: number, stop: number | 'drop') => void) {
    this.time += dt
    for (let i = 0; i < this.trucks.length; i++) {
      const tt = this.tables[i]
      const offset = (tt.cycle * (TRUCKS - i)) / TRUCKS + tt.cycle * 0.12
      const total = this.time + offset
      const local = total % tt.cycle
      const lap = Math.floor(total / tt.cycle)
      let k = 0
      while (k < tt.segments.length - 1 && tt.segments[k].t1 <= local) k++
      const s = tt.segments[k]
      const u = s.t1 > s.t0 ? (local - s.t0) / (s.t1 - s.t0) : 1
      const tr = this.trucks[i]
      const arrived = k !== tr.seg || lap !== tr.lap
      tr.d = s.d0 + (s.d1 - s.d0) * u
      tr.stop = s.stop
      tr.alpha = Math.min(1, local / FADE_S, (tt.cycle - local) / FADE_S)
      // Skip the very first frame so a scene does not open with a burst of events.
      if (arrived && tr.seg !== -1 && s.stop !== null) onStop(i, s.stop)
      tr.seg = k
      tr.lap = lap
    }
  }
}

/** Fraction of the load still on the truck at distance d. */
export function loadLeft(role: TruckRole, d: number) {
  if (role !== 'drop') return 1
  return d < DROP_D ? 1 : 0.5
}
