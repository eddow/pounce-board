import type { Child } from 'pounce-ts'

export default function RootLayout({ children }: { children: Child }) {
	return (
		<div class="root-layout">
			<nav>
				<a href="/">Home</a> | <a href="/users/1">User 1</a>
			</nav>
			<main>{children}</main>
		</div>
	)
}
