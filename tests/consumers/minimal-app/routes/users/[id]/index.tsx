import { reactive } from 'mutts'
import { api } from 'pounce-board'
import { userRoute } from './def'

export default function UserDetail({ params }: { params: { id: string } }) {


	const req = api(userRoute, { id: params.id }).get<{
		id: string
		name: string
		role: string
		contextUser: { id: string; role: string }
		requestTimestamp: number
	}>()

	const state = reactive({
		user: req.hydrated,
	})

	if (!state.user) {
		req.then((data) => {
			state.user = data
		})
	}

	return (
		<div id="user-profile">
			<h1>User Profile</h1>
			<div if={state.user}>
				<p>ID: {() => state.user!.id}</p>
				<p>Name: {() => state.user!.name}</p>
				<p>Role: {() => state.user!.role}</p>
				<p id="context-info">
					Auth: {() => state.user!.contextUser.id} ({() => state.user!.contextUser.role})
				</p>
				<p id="timestamp">Time: {() => new Date(state.user!.requestTimestamp).toLocaleString()}</p>
			</div>
			<p else>Loading user {params.id}...</p>
		</div>
	)
}
