/**
 * Single source of truth for every name, figure and claim shown in the model.
 *
 * Wording follows Cognecto's proposal to Haryana Mines & Geology
 * ("Illegal Mining Control and Revenue Growth", 11 November 2026),
 * pages "What happens now in Haryana mining" and "What changes with Cognecto".
 *
 * Edit text here. Set `visible: false` to hide a fact everywhere.
 * Facts can also be hidden live from the presenter panel (backtick key).
 */

export interface Fact {
  /** Text shown in the UI. */
  text: string
  /** Default visibility. The presenter panel can override it at runtime. */
  visible: boolean
  /** Label used in the presenter panel. */
  label: string
}

const fact = (label: string, text: string, visible = true): Fact => ({ label, text, visible })

export const facts = {
  wordmark: fact('Wordmark', 'cognecto'),
  client: fact('Client name', 'Haryana Mines & Geology'),
  system: fact('Portal name', 'HMGIS'),
  simulatedBadge: fact('Illustrative data badge', 'ILLUSTRATIVE DATA'),
  royaltyRates: fact('Royalty rates', '₹100 a tonne for stone, ₹80 for sand (June 2025)'),
  transitFee: fact('Inter-state transit fee', '₹80 a tonne on minerals entering the state'),
} satisfies Record<string, Fact>

export type FactId = keyof typeof facts

export type Mode = 'before' | 'after'

export type StepId = 'mine' | 'pass' | 'weighbridge' | 'crusher' | 'dealer' | 'buyer'

export interface ControlLine {
  /** Control name, shown in bold. */
  name: string
  /** Rest of the sentence. */
  text: string
}

export interface ChainStep {
  id: StepId
  n: 1 | 2 | 3 | 4 | 5 | 6
  title: string
  /** Short name for the rail and the matrix header. */
  short: string
  before: {
    title: string
    what: string
    gaps: string[]
    /** Who writes the number at this step today. */
    source: string
  }
  after: {
    title: string
    /** The gap from the "before" page that this step closes. */
    closes: string
    controls: ControlLine[]
    /** Where the number comes from with the Grid. */
    source: string
  }
}

export const chain: ChainStep[] = [
  {
    id: 'mine',
    n: 1,
    title: 'Stone mine',
    short: 'Mine',
    before: {
      title: 'Stone mine',
      what: 'The contractor digs stone and enters on the website how much was dug.',
      gaps: ['Entry is not checked against the actual dig', '100 loads dug, 60 entered, fee paid on 60'],
      source: 'Typed by the contractor',
    },
    after: {
      title: 'Stone mine',
      closes: 'Entry not checked against the actual dig: 100 dug, 60 entered',
      controls: [
        { name: 'Geo-fence', text: 'on the lease area: digging or trucks outside the boundary raise an alert' },
        { name: 'Drone survey', text: 'measures the pit volume, compared against the quantity entered' },
        { name: 'Inspector mobile app', text: 'geo-tagged, time-stamped site checks against the declared figure' },
      ],
      source: 'Drone survey, geo-fence',
    },
  },
  {
    id: 'pass',
    n: 2,
    title: 'Temporary pass',
    short: 'Pass',
    before: {
      title: 'Temporary pass',
      what: 'After entering the quantity dug, the contractor creates a temporary pass on the website.',
      gaps: ['The pass is based on the figure entered at step 1, which nobody checked'],
      source: 'Self-issued from step 1',
    },
    after: {
      title: 'Transit pass',
      closes: 'Temporary pass created from an unchecked figure',
      controls: [
        { name: 'Immutable QR code', text: 'carries all challan details: lease, vehicle, quantity, weight, route, buyer and time' },
        { name: 'Vahan portal', text: 'confirms the vehicle is registered and valid before the pass is issued' },
        { name: 'GST API', text: "confirms the buyer's GSTIN at issue" },
      ],
      source: 'QR pass, Vahan, GST API',
    },
  },
  {
    id: 'weighbridge',
    n: 3,
    title: 'Weighbridge',
    short: 'Weighbridge',
    before: {
      title: 'Weighbridge',
      what: 'The truck needs to go to the weighbridge to get a proper pass.',
      gaps: [
        'The weighbridge can be skipped',
        'Entry at the weighbridge is manual',
        'On the way, the truck can drop weight or carry extra',
        'The pass can be cancelled as if the trip never happened',
        "The weighbridge is connected to the operator's own computer, which can be changed",
        'No photo is taken to verify which vehicle was at the weighbridge',
      ],
      source: "Operator's own computer",
    },
    after: {
      title: 'Weighbridge and road',
      closes: 'Skipped, manual, editable, no photo, load dropped or added, pass cancelled',
      controls: [
        { name: 'Online weighbridge', text: 'weight goes straight from the scale to the system; the operator cannot type or change it' },
        { name: 'ANPR camera', text: 'reads the plate and takes a photo at every weighing, matched to the QR pass' },
        { name: 'GPS on truck', text: 'tracks the route; unplanned stops flag weight dropped or extra loaded' },
        { name: 'FASTag', text: 'toll reads confirm route and timing' },
        { name: 'Pass cancellation check', text: 'a pass cancelled after the truck has moved is flagged against GPS and ANPR' },
        { name: 'Inspector app', text: 'scans the QR at roadside checks' },
      ],
      source: 'Online scale, ANPR, GPS, FASTag',
    },
  },
  {
    id: 'crusher',
    n: 4,
    title: 'Crusher',
    short: 'Crusher',
    before: {
      title: 'Crusher',
      what: 'The crusher owner types in how much stone came in and how much gravel went out.',
      gaps: ['If he claims 100 t came in when only 70 t did, he now has 30 t of "legal" paper stock'],
      source: 'Typed by the crusher owner',
    },
    after: {
      title: 'Crusher',
      closes: 'Owner types stone in and gravel out: 30 t of "legal" paper stock',
      controls: [
        { name: 'Online weighbridge and ANPR', text: 'at the crusher gate record stone in from the truck itself' },
        { name: 'Pass match', text: 'stone in must match QR passes and GPS trips that actually arrived' },
        { name: 'GST API', text: 'ties gravel out to invoices and e-way bills' },
        { name: 'Drone survey', text: 'of stockpiles checks stock on hand' },
      ],
      source: 'Gate scale, ANPR, GST API',
    },
  },
  {
    id: 'dealer',
    n: 5,
    title: 'Dealer',
    short: 'Dealer',
    before: {
      title: 'Dealer',
      what: 'The dealer can type in "I brought this from another state".',
      gaps: ['Nobody checks that the truck actually crossed the border', 'Illegally dug Haryana stone gets passed off as bought from elsewhere'],
      source: 'Typed by the dealer',
    },
    after: {
      title: 'Dealer',
      closes: '"Brought from another state" with no border check',
      controls: [
        { name: 'FASTag and ANPR', text: 'must show the truck crossing the border for any inter-state claim' },
        { name: 'GST API', text: 'the purchase must have a matching invoice and e-way bill' },
        { name: 'Vahan portal', text: 'confirms the vehicle used' },
        { name: 'Inspector app', text: 'scans QR passes during dealer stock checks' },
      ],
      source: 'FASTag, ANPR, e-way bill',
    },
  },
  {
    id: 'buyer',
    n: 6,
    title: 'Buyer',
    short: 'Buyer',
    before: {
      title: 'Buyer',
      what: 'The seller registers himself as the buyer.',
      gaps: ['The buyer can be fake', 'Or the buyer never confirms the material arrived', 'So material can be "sold" on paper to someone who does not exist'],
      source: 'Typed by the seller',
    },
    after: {
      title: 'Buyer',
      closes: 'Seller registers as buyer; fake buyer; receipt never confirmed',
      controls: [
        { name: 'GST API', text: "verifies the buyer's GSTIN; a buyer matching the seller is flagged" },
        { name: 'QR scan', text: 'the buyer confirms receipt by scanning the QR in the mobile app' },
        { name: 'GPS', text: "shows the truck reached the buyer's location" },
      ],
      source: 'QR scan, GSTIN, GPS',
    },
  },
]

export const headline = {
  before: {
    kicker: 'What happens now in Haryana mining',
    title: 'Six points where the number is typed in',
    lead: 'The current HMGIS flow, from the stone mine to the final buyer. At every step the quantity is declared by the party that benefits, and nothing checks it against what physically moved.',
    closing:
      'Mine, weighbridge, crusher, dealer and buyer each type in their own number. No step is tied to a sensor, a photo or a reading from the step before it.',
  },
  after: {
    kicker: 'What changes with Cognecto',
    title: 'Every number captured at the source',
    lead: 'The same six steps. Each control below comes in at a step and closes the gap from the current process.',
    closing: 'The same chain, but each number now comes from a sensor, a camera, a government record or a scan, and every entry is kept.',
  },
} as const

/** "Where each control comes in": each row is a control, each dot a step it changes. */
export const controls: { name: string; does: string; steps: StepId[] }[] = [
  { name: 'Geo-fence', does: 'Lease boundary; alerts outside it', steps: ['mine'] },
  { name: 'Drone survey', does: 'Measures pit and stockpile volume', steps: ['mine', 'crusher'] },
  { name: 'Inspector mobile app', does: 'Geo-tagged checks, QR scans', steps: ['mine', 'weighbridge', 'dealer'] },
  { name: 'ANPR camera', does: 'Number plate read and photo', steps: ['weighbridge', 'crusher', 'dealer'] },
  { name: 'Online weighbridge', does: 'Weight sent direct, no typing', steps: ['weighbridge', 'crusher'] },
  { name: 'GPS on truck', does: 'Route, stops and arrival', steps: ['weighbridge', 'buyer'] },
  { name: 'Immutable QR code', does: 'All challan details, locked', steps: ['pass', 'weighbridge', 'crusher', 'dealer', 'buyer'] },
  { name: 'GST API', does: 'GSTIN, invoices, e-way bills', steps: ['pass', 'crusher', 'dealer', 'buyer'] },
  { name: 'FASTag', does: 'Toll reads confirm route', steps: ['weighbridge', 'dealer'] },
  { name: 'Vahan portal', does: 'Vehicle registration check', steps: ['pass', 'dealer'] },
]

/** Leakage patterns the department has already found (proposal, "Haryana today"). */
export const leakPatterns: { name: string; text: string; step: StepId }[] = [
  { name: 'Issue-then-cancel passes', text: 'e-rawanas cancelled once trucks crossed check-posts, so portal stock never went down', step: 'weighbridge' },
  { name: 'Paper purchases', text: '89 Yamunanagar units barred after 3,59,616 MT of fake online transactions', step: 'crusher' },
  { name: 'Fake out-of-state purchases', text: 'material booked as bought from distant states to cover local illegal mining', step: 'dealer' },
  { name: 'Crushers with no sales', text: 'inactive on the portal and filing NIL GST, yet drawing heavy electricity', step: 'crusher' },
  { name: 'Short-term permit misuse', text: 'STPs generated illegally and sold to turn illegal material into "genuine" stock', step: 'pass' },
  { name: 'Cross-border Aravalli flows', text: 'material from Rajasthan on doubtful receipts', step: 'dealer' },
]

/** Per-tonne arithmetic from the proposal ("Financial dynamics"). */
export const royaltyAtStake: { unit: string; stake: string; year: string }[] = [
  { unit: 'One 40 t stone truck leaving without a pass', stake: '₹4,000 a trip', year: '₹14.6 lakh a year at one a day' },
  { unit: '100 such trucks a day, statewide', stake: '₹4 lakh a day', year: '₹14.6 Cr a year' },
  { unit: '1,000 such trucks a day, statewide', stake: '₹40 lakh a day', year: '₹146 Cr a year' },
  { unit: 'One inbound 40 t truck that skips the transit fee', stake: '₹3,200 a trip', year: '₹11.7 lakh a year at one a day' },
  { unit: '10 t of overloading on one trip (stone)', stake: '₹1,000 royalty, plus penalty', year: 'scales with trips' },
]

/** Revenue levers the controls feed (proposal, "Revenue bridge", mid case). */
export const levers: { name: string; mid: string }[] = [
  { name: 'Lease volumetric reconciliation', mid: '₹150 Cr' },
  { name: 'Border leakage', mid: '₹125 Cr' },
  { name: 'Crusher and screening plant ledger', mid: '₹100 Cr' },
  { name: 'Faster start of new and dormant blocks', mid: '₹120 Cr' },
  { name: 'Overloading at source', mid: '₹55 Cr' },
  { name: 'Penalty and arrears recovery', mid: '₹50 Cr' },
]
export const bridgeTotal = { from: '₹1,200 Cr', to: '₹1,800 Cr', uplift: '+₹600 Cr a year (₹480-730 Cr range)' }
