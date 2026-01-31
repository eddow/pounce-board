/** @jsxImportSource pounce-ts */
import { bindApp } from 'pounce-ts'
import { intercept } from 'pounce-board'
import Home from './routes/index.tsx'
import UserDetail from './routes/users/[id]/index.tsx'
import UserList from './routes/users/list.tsx'

// Sample interceptor for manual verification
intercept('**', async (req: Request, next: (req: Request) => Promise<any>) => {
	console.log(`[minimal-app] API Request: ${req.method} ${req.url}`)
	return next(req)
})

const path = window.location.pathname

if (path === '/') {
	bindApp(<Home />, document.getElementById('root')!)
} else if (path === '/users/list') {
	bindApp(<UserList />, document.getElementById('root')!)
} else if (path.startsWith('/users/')) {
	const id = path.split('/')[2]
	bindApp(<UserDetail params={{ id }} />, document.getElementById('root')!)
}
