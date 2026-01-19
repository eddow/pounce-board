import { reactive } from 'mutts'
import { api } from 'pounce-board/http/client.js'
import { getSSRData } from 'pounce-board/ssr/utils.js'

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

	const u = () => state.user

	return (
		<div id="user-profile">
			<h1>User Profile</h1>
			<div if={u}>
				<p>ID: {() => u()?.id}</p>
				<p>Name: {() => u()?.name}</p>
				<p>Role: {() => u()?.role}</p>
				<p id="context-info">
					Auth: {() => u()?.contextUser?.id} ({() => u()?.contextUser?.role})
				</p>
				<p id="timestamp">Time: {() => (u() ? new Date(u()!.requestTimestamp).toLocaleString() : '')}</p>
			</div>
			<p if={() => !u()}>Loading user {params.id}...</p>
		</div>
	)
}
