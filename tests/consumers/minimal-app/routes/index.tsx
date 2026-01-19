/** @jsxImportSource pounce-ts */
import { reactive } from 'mutts'
import { api } from 'pounce-board/http/client.js'

export default function Home() {
	const state = reactive({
		data: undefined as { message: string; timestamp: string } | undefined,
	})
	const data = () => state.data

	api('/')
		.get<{ message: string; timestamp: string }>()
		.then((res: { message: string; timestamp: string }) => {
			state.data = res
		})

	return (
		<div>
			<h1>Minimal App</h1>
			<p if={data}>{() => data()?.message}</p>
			<p if={data}>Generated at: {() => data()?.timestamp}</p>
			<p if={() => !data()}>Loading...</p>
		</div>
	)
}
