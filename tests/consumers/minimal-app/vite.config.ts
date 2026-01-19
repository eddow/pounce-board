import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	resolve: {
		alias: {
			'pounce-board/adapters': resolve(__dirname, '../../../src/adapters'),
			'pounce-board': resolve(__dirname, '../../../src/lib'),
		},
	},
	server: {
		port: 3000,
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			input: {
				client: resolve(__dirname, 'index.html'),
			},
		},
	},
})
