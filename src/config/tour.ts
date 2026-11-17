import type { SceneId, Station } from '../core/store'

export interface TourStop {
  scene: SceneId
  station: Station
  seconds: number
}

/**
 * Autoplay demo tour, about two minutes end to end.
 * It opens on today's chain, then walks each step today and then with Cognecto,
 * and ends on the whole chain with every control in place.
 * Manual input pauses the tour; it resumes after `resumeAfterIdleS` seconds without input.
 */
export const tour: TourStop[] = [
  { scene: 'before', station: 0, seconds: 10 },
  ...([1, 2, 3, 4, 5, 6] as const).flatMap((station) => [
    { scene: 'before' as const, station, seconds: station === 3 ? 10 : 8 },
    { scene: 'after' as const, station, seconds: station === 3 ? 10 : 8 },
  ]),
  { scene: 'after', station: 0, seconds: 12 },
]

export const resumeAfterIdleS = 15
