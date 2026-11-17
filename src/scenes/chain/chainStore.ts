import { create } from 'zustand'
import { chain, type Mode } from '../../config/content'
import { useApp } from '../../core/store'
import { Traffic, type TruckRole } from './sim'

/**
 * Per-scene state for the chain: truck traffic, station pulses and the
 * running count of loads dug against loads on the books.
 *
 * The count opens on the proposal's own example (100 loads dug, 60 entered)
 * and grows as trucks leave the pit. In "before", 3 of every 5 loads are
 * entered; with Cognecto every load is measured.
 */

/** Pulse per station, index 1-6; index 7 is the load drop on the road. */
export const pulses = new Float32Array(8)
export const DROP_PULSE = 7
const PULSE_DECAY = 1.4

export const LOAD_T = 40
export const ROYALTY_PER_T = 100

interface ChainState {
  mode: Mode
  traffic: Traffic
  dug: number
  entered: number
  start: (mode: Mode) => void
  tick: (dt: number) => void
}

const BASE_DUG = 100
const BASE_ENTERED = 60

export const useChain = create<ChainState>((set, get) => ({
  mode: 'before',
  traffic: new Traffic('before'),
  dug: BASE_DUG,
  entered: BASE_ENTERED,
  start: (mode) => {
    pulses.fill(0)
    set({ mode, traffic: new Traffic(mode), dug: BASE_DUG, entered: mode === 'before' ? BASE_ENTERED : BASE_DUG })
  },
  tick: (dt) => {
    for (let i = 0; i < pulses.length; i++) pulses[i] = Math.max(0, pulses[i] - dt * PULSE_DECAY)
    const { traffic, mode } = get()
    traffic.tick(dt, (truck, stop) => {
      const role = traffic.roles[truck]
      if (stop === 'drop') {
        pulses[DROP_PULSE] = 1
        announce(mode, 'drop', role, truck)
        return
      }
      pulses[stop] = 1
      if (stop === 1) {
        set((s) => {
          const dug = s.dug + 1
          return { dug, entered: mode === 'before' ? Math.round(dug * 0.6) : dug }
        })
      }
      // A bypassing truck never stops at the weighbridge, so announce it as it leaves the pass.
      if (stop === 2 && role === 'bypass') {
        pulses[3] = 1
        announce(mode, 3, role, truck)
      }
      announce(mode, stop, role, truck)
    })
  },
}))

type Level = 'info' | 'ok' | 'alert'

/** Ticker line for each stop, by scene. */
function message(mode: Mode, stop: number | 'drop', role: TruckRole, truck: number): { level: Level; text: string } | null {
  const t = `Truck T${truck + 1}`
  if (mode === 'before') {
    switch (stop) {
      case 1:
        return { level: 'alert', text: `${t} loaded at the pit. Quantity typed in by the contractor; nothing measures the dig.` }
      case 2:
        return role === 'bypass' ? null : { level: 'alert', text: `${t}: temporary pass self-issued on the figure from step 1.` }
      case 3:
        return role === 'bypass'
          ? { level: 'alert', text: `${t} skipped the weighbridge. No weight, no photo on record.` }
          : { level: 'alert', text: `${t} weighed. Weight on the operator's own PC; no photo of the vehicle.` }
      case 'drop':
        return { level: 'alert', text: `${t} stopped on the road and dropped part of its load. The pass did not change.` }
      case 4:
        return { level: 'alert', text: `${t} unloaded. Crusher owner types in 100 t; 70 t arrived.` }
      case 5:
        return { level: 'alert', text: `${t}: dealer types "brought from another state". No border record.` }
      case 6:
        return { level: 'alert', text: `${t} delivered. Seller registered as the buyer; receipt never confirmed.` }
    }
  } else {
    switch (stop) {
      case 1:
        return { level: 'ok', text: `${t} loaded inside the geo-fence. Drone volume checks the quantity entered.` }
      case 2:
        return { level: 'ok', text: `${t}: QR pass issued. Vahan vehicle check and buyer GSTIN passed; record locked.` }
      case 3:
        return { level: 'ok', text: `${t} weighed online. ANPR photo matched to the QR pass; GPS trip running.` }
      case 4:
        return { level: 'ok', text: `${t} weighed in at the crusher gate. Matched to its QR pass and GPS trip.` }
      case 5:
        return { level: 'ok', text: `${t}: inter-state claim checked against FASTag, ANPR and e-way bill.` }
      case 6:
        return { level: 'ok', text: `${t} delivered. Buyer scanned the QR; GSTIN and GPS arrival confirmed.` }
    }
  }
  return null
}

let lastOverviewAt = 0

function announce(mode: Mode, stop: number | 'drop', role: TruckRole, truck: number) {
  const app = useApp.getState()
  if (app.pendingScene) return
  const focus = app.station
  const here = stop === 'drop' ? 3 : stop
  if (focus !== 0 && focus !== here) return
  // In the overview, keep the ticker readable: at most one line every 2.5 s.
  if (focus === 0) {
    const now = performance.now()
    if (now - lastOverviewAt < 2500) return
    lastOverviewAt = now
  }
  const m = message(mode, stop, role, truck)
  if (m) app.pushTicker(m)
}

export const stepById = (n: number) => chain[n - 1]
