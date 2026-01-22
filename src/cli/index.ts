#!/usr/bin/env node

import { cac } from 'cac'
import { runDevServer } from './dev.js'

const cli = cac('pounce')

cli
	.command('dev', 'Start development server')
	.option('--port <port>', 'Port to listen on', { default: 3000 })
	.option('--routes <dir>', 'Directory containing routes', { default: './routes' })
	.option('--html <html>', 'Path to entry HTML file', { default: './index.html' })
	.action(async (options) => {
		try {
			await runDevServer({
				port: Number(options.port),
				routesDir: options.routes,
				entryHtml: options.html,
			})
		} catch (error) {
			console.error('Failed to start dev server:', error)
			process.exit(1)
		}
	})

cli.command('build', 'Build for production').action(() => {
	console.log('Build command coming soon.')
})

cli.command('preview', 'Preview production build').action(() => {
	console.log('Preview command coming soon.')
})

cli.help()
cli.version('0.1.0')

cli.parse()
