import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { holoLineMaterial, holoMeshMaterial, type HoloOptions } from './materials'

/** Memoised hologram mesh material. Disposed on unmount. */
export function useHoloMesh(o: HoloOptions, deps: unknown[] = []): THREE.ShaderMaterial {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => holoMeshMaterial(o), deps)
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

/** Memoised hologram line material. Disposed on unmount. */
export function useHoloLine(o: HoloOptions, deps: unknown[] = []): THREE.ShaderMaterial {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => holoLineMaterial(o), deps)
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}
