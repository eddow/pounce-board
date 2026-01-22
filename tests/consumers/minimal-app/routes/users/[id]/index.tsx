import { reactive } from 'mutts'
import { api } from 'pounce-board'

export default function UserDetail({ params }: { params: { id: string } }) {
	const state = reactive({
		user: undefined as
			| {
				id: string
				name: string
				role: string
				contextUser: { id: string; role: string }
				requestTimestamp: number
			}
			| undefined,
	})

	api(`/users/${params.id}`)
		.get<{
			id: string
			name: string
			role: string
			contextUser: { id: string; role: string }
			requestTimestamp: number
		}>()
		.then((data) => {
			state.user = data
		})

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
