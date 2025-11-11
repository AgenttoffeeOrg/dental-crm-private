import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', msg => {
    console.log('[browser]', msg.type(), msg.text())
  })

  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle' })
  console.log('initial url', page.url())

  await page.waitForSelector('#email', { timeout: 15000 })
  await page.fill('#email', 'deepakshegde@gmail.com')
  await page.fill('#password', 'Admin@123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(4000)
  console.log('after login', page.url())

  await page.click('a[href="/deals"]', { timeout: 15000 })
  await page.waitForTimeout(4000)
  console.log('after deals nav', page.url())

  await page.click('a[href="/contacts"]', { timeout: 15000 })
  await page.waitForTimeout(4000)
  console.log('after contacts nav', page.url())

  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
