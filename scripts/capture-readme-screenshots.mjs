import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SCREENSHOT_DIR = path.join(ROOT, 'docs', 'screenshots')
const STATE_DIR = path.join(ROOT, '.tmp', 'readme-screenshots')
const BASE_URL = process.env.ECOTRACK_SCREENSHOT_BASE_URL ?? 'https://ecotrack-hassan-demo.vercel.app'
const WINDOW = { width: 1600, height: 1000 }

const captures = [
  {
    name: 'login',
    path: '/login',
    marker: 'Quick access demo accounts',
  },
  {
    name: 'admin-dashboard',
    path: '/admin/dashboard',
    marker: 'Admin Dashboard',
    account: { email: 'admin@ecotrack.com', password: 'demo1234' },
  },
  {
    name: 'citizen-dashboard',
    path: '/citizen/dashboard',
    marker: 'Upcoming Pickups',
    account: { email: 'citizen@ecotrack.com', password: 'demo1234' },
  },
  {
    name: 'crew-dashboard',
    path: '/crew/dashboard',
    marker: "Today's Pickup Queue",
    account: { email: 'crew@ecotrack.com', password: 'demo1234' },
  },
  {
    name: 'staff-dashboard',
    path: '/staff/dashboard',
    marker: 'Recent Load Records',
    account: { email: 'staff@ecotrack.com', password: 'demo1234' },
  },
]

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true })
  await mkdir(STATE_DIR, { recursive: true })

  for (const [index, capture] of captures.entries()) {
    const port = 9222 + index
    const userDataDir = path.join(STATE_DIR, capture.name)
    await rm(userDataDir, { recursive: true, force: true })
    await mkdir(userDataDir, { recursive: true })

    console.log(`Capturing ${capture.name}...`)
    const browser = launchBrowser(port, userDataDir)

    try {
      const wsUrl = await waitForPageTarget(port)
      const client = await connectToCdp(wsUrl)

      try {
        await client.send('Page.enable')
        await client.send('Runtime.enable')
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: WINDOW.width,
          height: WINDOW.height,
          deviceScaleFactor: 1,
          mobile: false,
        })

        await navigate(client, `${BASE_URL}${capture.path}`)

        if (capture.account) {
          await login(client, capture.account)
          await waitFor(
            () => evaluate(client, 'location.pathname').then((value) => value === capture.path),
            `navigation to ${capture.path}`,
          )
        }

        await waitFor(
          () => evaluate(client, `document.body.innerText.includes(${JSON.stringify(capture.marker)})`),
          `page marker "${capture.marker}"`,
        )
        await sleep(1200)

        const outputPath = path.join(SCREENSHOT_DIR, `${capture.name}.png`)
        await captureScreenshot(client, outputPath)
        await client.close()
      } finally {
        browser.kill()
      }
    } catch (error) {
      browser.kill()
      throw error
    }
  }
}

function launchBrowser(port, userDataDir) {
  const browserPath = findBrowser()
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${WINDOW.width},${WINDOW.height}`,
    'about:blank',
  ]

  const browser = spawn(browserPath, args, { stdio: 'ignore' })
  browser.on('error', (error) => {
    throw new Error(`Failed to launch browser: ${error.message}`)
  })
  return browser
}

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error('No supported browser found. Set EDGE_PATH to a local Edge or Chrome executable.')
}

async function waitForPageTarget(port, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) {
        const pages = await response.json()
        const page = pages.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl)
        if (page) return page.webSocketDebuggerUrl
      }
    } catch {}

    await sleep(250)
  }

  throw new Error(`Timed out waiting for browser debugging target on port ${port}.`)
}

async function connectToCdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let id = 0

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString())
    if (!message.id) return

    const callbacks = pending.get(message.id)
    if (!callbacks) return
    pending.delete(message.id)

    if (message.error) callbacks.reject(new Error(message.error.message))
    else callbacks.resolve(message.result)
  })

  return {
    async send(method, params = {}) {
      const currentId = ++id
      ws.send(JSON.stringify({ id: currentId, method, params }))
      return new Promise((resolve, reject) => pending.set(currentId, { resolve, reject }))
    },
    async close() {
      if (ws.readyState === WebSocket.OPEN) ws.close()
    },
  }
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url })
  await waitFor(
    () => evaluate(client, 'document.readyState').then((value) => value === 'complete'),
    `document ready state for ${url}`,
  )
  await sleep(1200)
}

async function login(client, account) {
  await waitFor(
    () => evaluate(client, "Boolean(document.querySelector('#email') && document.querySelector('#password'))"),
    'login form',
  )

  await evaluate(
    client,
    `(function () {
      const email = document.querySelector('#email')
      const password = document.querySelector('#password')
      const setValue = (element, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        setter.call(element, value)
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
      setValue(email, ${JSON.stringify(account.email)})
      setValue(password, ${JSON.stringify(account.password)})
      document.querySelector('button[type="submit"]').click()
      return true
    })()`,
  )
}

async function captureScreenshot(client, outputPath) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  })
  await writeFile(outputPath, Buffer.from(data, 'base64'))
}

async function evaluate(client, expression) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })

  if (exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${exceptionDetails.text}`)
  }

  return result.value
}

async function waitFor(check, label, timeoutMs = 20000, intervalMs = 250) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if (await check()) return
    } catch {}
    await sleep(intervalMs)
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
