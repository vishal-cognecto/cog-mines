// Usage: node scripts/shot.mjs <hash> <waitMs> <out.png> [clickSelector]
// Needs `npm run dev -- --port 5199` running.
import { chromium } from '@playwright/test'

const [hash = 'loop', wait = '3000', out = 'tests/e2e/shots/shot.png'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`http://localhost:5199/#${hash}`)
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: out })
if (errors.length) console.log('ERRORS', errors)
await browser.close()
