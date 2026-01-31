
import { build as viteBuild } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface BuildOptions {
	routesDir?: string
	outDir?: string
	entryHtml?: string
}

export async function runBuild(options: BuildOptions = {}) {
	const root = process.cwd()
	const routesDir = options.routesDir ?? './routes'
	const outDir = options.outDir ?? './dist'
	const entryHtml = options.entryHtml ?? './index.html'

	console.log('🚧 Starting Pounce-Board build...')

	// 1. Client Build
	console.log('\n📦 Building Client...')
	await viteBuild({
		root,
		build: {
			outDir: path.join(outDir, 'client'),
			emptyOutDir: true,
			ssrManifest: true,
		},
		resolve: {
			alias: {
				'pounce-board/adapters': path.resolve(__dirname, '../../src/adapters/hono.ts'),
				'pounce-board/client': path.resolve(__dirname, '../../src/client/index.ts'),
				'pounce-board/server': path.resolve(__dirname, '../../src/server/index.ts'),
				'pounce-board': path.resolve(__dirname, '../../src/client/index.ts'),
			}
		}
	})

	// 2. Server Build
	console.log('\n📦 Building Server...')
	
	const serverEntryContent = `
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { 
    createPounceMiddleware, 
    buildRouteTree, 
    matchRoute,
    withSSRContext, 
    injectApiResponses, 
    getCollectedSSRResponses,
    flushSSRPromises
} from 'pounce-board/server'
import { api } from 'pounce-board/client'
import { renderToStringAsync, withSSR } from 'pounce-ts/server'
import { h } from 'pounce-ts'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Glob all routes
const routes = import.meta.glob('/${routesDir.replace(/^\.\//, '')}/**')

const app = new Hono()

// Serve static assets
// Serve static assets - Moved to end
// app.use('/*', serveStatic({ root: './dist/client' }))

// Pounce middleware for API routes and context setup
app.use('*', createPounceMiddleware({
	globRoutes: routes,
	routesDir: '${routesDir}'
}))

// SSR Handler
app.get('*', async (c, next) => {
	const url = new URL(c.req.url)
	const origin = \`\${url.protocol}//\${url.host}\`

	// This should already be inside withSSRContext thanks to createPounceMiddleware falling through
	// BUT createPounceMiddleware calls next(), so we are inside its scope? 
	// YES. The middleware wraps next() in withSSRContext.

	// Try API pre-fetch
	try {
		await api(url.pathname).get().catch(() => {})
	} catch (e) {}

	// Read index.html
	let template = ''
	try {
		template = fs.readFileSync('./dist/client/index.html', 'utf-8')
	} catch (e) {
		return c.text('index.html not found', 404)
	}

	// Build route tree (cached internally by adapter, but we need it here)
	// We can pass the same globRoutes
	const routeTree = await buildRouteTree('${routesDir}', undefined, routes)
	const match = matchRoute(url.pathname, routeTree, 'GET')

	if (match && match.component) {
		if (typeof match.component !== 'function') {
			console.warn(\`Skipping SSR: component is not a function\`)
			return c.html(template)
		}

		// Render component
		const renderedHtml = await withSSR(async () => {
			let app = h(match.component, { params: match.params })
			if (match.layouts) {
				for (let i = match.layouts.length - 1; i >= 0; i--) {
					const layout = match.layouts[i]
					app = h(layout, { params: match.params }, app)
				}
			}

			return await renderToStringAsync(app, undefined, {
				collectPromises: flushSSRPromises
			})
		})

		template = template.replace(/<div id="root">\\s*<\\/div>/, \`<div id="root">\${renderedHtml}</div>\`)
	}

    // If no match/component, try static files
    if (!match || !match.component) {
        return next()
    }

	// Get collected SSR data (from middleware context) handled by createPounceMiddleware
	// const ssrData = getCollectedSSRResponses()
	// const finalHtml = injectApiResponses(template, ssrData)

	return c.html(template)
})

// Serve static assets (fallback)
app.use('/*', serveStatic({ root: './dist/client' }))

const port = Number(process.env.PORT) || 3000
console.log('Starting server on port ' + port)

serve({
	fetch: app.fetch,
	port
})
`
	const tempEntry = path.join(root, 'pounce-server-entry.ts')
	fs.writeFileSync(tempEntry, serverEntryContent)

	try {
		await viteBuild({
			root,
			build: {
				ssr: tempEntry,
				outDir: path.join(outDir, 'server'),
				emptyOutDir: true,
				rollupOptions: {
					input: tempEntry,
                    external: [
                        /^node:/,
                        'jsdom',
                        ...require('module').builtinModules
                    ]
				}
			},
			resolve: {
				alias: {
					'pounce-board/adapters': path.resolve(__dirname, '../../src/adapters/hono.ts'),
					'pounce-board/client': path.resolve(__dirname, '../../src/client/index.ts'),
					'pounce-board/server': path.resolve(__dirname, '../../src/server/index.ts'),
					'pounce-board': path.resolve(__dirname, '../../src/client/index.ts'),
				}
			}
		})
	} finally {
		if (fs.existsSync(tempEntry)) {
			fs.unlinkSync(tempEntry)
		}
	}
	
	console.log('\n✅ Build complete!')
}

// Need require for builtinModules check in ESM...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
