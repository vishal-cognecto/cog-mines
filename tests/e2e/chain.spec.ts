import { expect, test } from '@playwright/test'

test('walks the chain today, flips to Cognecto at the same step, and runs the tour', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/#before')
  const step = page.getByTestId('step-panel')
  await expect(step).toContainText('Six points where the number is typed in')
  await expect(page.getByTestId('source-panel')).toContainText('6 of 6 typed in')
  await expect(page.getByTestId('closing')).toContainText('each type in their own number')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'tests/e2e/shots/before-0.png' })

  // Today, every load off the books is royalty missed.
  await expect(page.getByTestId('royalty-gap')).not.toHaveText('₹0')

  // Step 3 today: the weighbridge gaps.
  await page.keyboard.press('3')
  await expect(step).toContainText('The weighbridge can be skipped')
  await expect(page).toHaveURL(/#before\/3$/)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'tests/e2e/shots/before-3.png' })

  // Flip to Cognecto at the same step: the gap is closed by controls.
  await page.keyboard.press('b')
  await expect(step).toContainText('Online weighbridge', { timeout: 5000 })
  await expect(step).toContainText('Closes')
  await expect(page).toHaveURL(/#after\/3$/)
  await expect(page.getByTestId('source-panel')).toContainText('6 of 6 captured')
  await expect(page.getByTestId('royalty-gap')).toHaveText('₹0')
  await expect(page.getByTestId('matrix-panel')).toContainText('Online weighbridge')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'tests/e2e/shots/after-3.png' })

  // Arrow keys step through the chain; the rail follows.
  await page.keyboard.press('ArrowRight')
  await expect(step).toContainText('Crusher')
  await expect(page.locator('.rail__item.is-active')).toContainText('Crusher')

  // Clicking a step in the source panel focuses it.
  await page.getByTestId('source-panel').getByRole('button', { name: /Buyer/ }).click()
  await expect(step).toContainText('GSTIN')

  // The switch flips back to today.
  await page.getByRole('tab', { name: /Today/ }).click()
  await expect(step).toContainText('The seller registers himself as the buyer', { timeout: 5000 })

  // Overview with 0, then autoplay moves on by itself.
  await page.keyboard.press('0')
  await expect(step).toContainText('Six points')
  await page.keyboard.press(' ')
  await expect(step).toContainText('The contractor digs stone', { timeout: 15_000 })
  await expect(page).toHaveURL(/#before\/1$/)
  await expect(page).toHaveURL(/#after\/1$/, { timeout: 15_000 })

  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0
        const t0 = performance.now()
        const f = () => {
          n++
          if (performance.now() - t0 < 2000) requestAnimationFrame(f)
          else resolve((n * 1000) / (performance.now() - t0))
        }
        requestAnimationFrame(f)
      }),
  )
  console.log('fps', fps.toFixed(1))
  expect(errors).toEqual([])
})
