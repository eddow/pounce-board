import type { Child } from 'pounce-ts'

export default function UsersLayout({ children }: { children: Child }) {
	return (
		<div class="users-layout">
			<h2>Users Section</h2>
			{children}
		</div>
	)
}
