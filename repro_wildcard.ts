
import { clearInterceptors, intercept, api } from './src/lib/http/client.js'
import { vi } from 'vitest'

// Mock global fetch to just log what it gets
global.fetch = async (url, init) => {
    console.log(`[FETCH] ${url}`)
    return new Response(JSON.stringify({ ok: true }))
}

// We need to access the internal matchPattern or observe behavior via intercept
// We'll use intercept() public API

async function run() {
    clearInterceptors()
    
    // 1. Intercept "/api/foo"
    console.log('--- Registering interceptor for "/api/foo" ---')
    intercept('/api/foo', async (req, next) => {
        console.log(`[INTERCEPTOR] Matched: ${req.url}`)
        return next(req)
    })

    // 2. Request to local (relative)
    console.log('\n--- Requesting /api/foo (Local) ---')
    // Mock window location
    global.window = { location: { origin: 'http://localhost', href: 'http://localhost/' } } as any
    await api('/api/foo').get()

    // 3. Request to external
    console.log('\n--- Requesting https://google.com/api/foo (External) ---')
    await api('https://google.com/api/foo').get()
}

run().catch(console.error)
