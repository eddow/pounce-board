#!/usr/bin/env node

import { cac } from 'cac'
import { runDevServer } from './dev.js'
import { runBuild } from './build.js'
import { runPreview } from './preview.js'

const cli = cac('pounce')

cli
	.command('dev', 'Start development server')
	.option('--port <port>', 'Port to listen on', { default: 3000 })
	.option('--hmr-port <port>', 'Port for Vite HMR')
	.option('--routes <dir>', 'Directory containing routes', { default: './routes' })
	.option('--html <html>', 'Path to entry HTML file', { default: './index.html' })
	.action(async (options) => {
		try {
			await runDevServer({
				port: Number(options.port),
				hmrPort: options.hmrPort ? Number(options.hmrPort) : undefined,
				routesDir: options.routes,
				entryHtml: options.html,
			})
		} catch (error) {
			console.error('Failed to start dev server:', error)
			process.exit(1)
		}
	})

cli.command('build', 'Build for production')
	.option('--out <dir>', 'Output directory', { default: './dist' })
	.action(async (options) => {
		try {
			await runBuild({
				routesDir: options.routes,
				outDir: options.out,
				entryHtml: options.html
			})
		} catch (error) {
			console.error('Build failed:', error)
			process.exit(1)
		}
	})

cli.command('preview', 'Preview production build').action(async () => {
    try {
        await runPreview()
    } catch (error) {
        console.error('Preview failed:', error)
        process.exit(1)
    }
})

cli.help()
cli.version('0.1.0')

cli.parse()
