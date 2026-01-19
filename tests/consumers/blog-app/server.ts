import { createPounceApp } from 'pounce-board/adapters/hono.js'
import { getRequestListener } from '@hono/node-server'
import { createServer } from 'http'

const port = Number(process.env.PORT) || 3001

const app = createPounceApp({
	routesDir: './routes',
})

const server = createServer(getRequestListener(app.fetch))

server.listen(port, () => {
	console.log(`Blog App running at http://localhost:${port}`)
})
