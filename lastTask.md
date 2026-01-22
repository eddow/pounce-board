Walkthrough: CLI & Dev Server + SSR Hydration
Summary
I implemented Phase 8.1 (Development Server & CLI) and verified SSR data injection end-to-end.

Changes Made
1. CLI Structure (
src/cli/index.ts
)
Introduced cac for argument parsing
Added 
bin
 entry to 
package.json
 for pounce command
Implemented pounce dev with --port, --routes, --html options
2. Development Server (
src/cli/dev.ts
)
Created 
runDevServer()
 that integrates Hono with Vite
Uses http.createServer with Vite middleware chained before Hono
Properly wraps SSR operations in 
withSSRContext
 for data collection
Builds SSR data map from context.ssr.responses and injects into HTML
3. SSR ID Generation (
src/lib/ssr/utils.ts
)
Simplified 
getSSRId()
 to use path-only IDs (removed counter that caused server/client desync)
4. Updated minimal-app
New 
vite.config.ts
 with babel JSX plugin and all necessary aliases
Uses pounce dev command (via tsx ../../../src/cli/index.ts dev)
Verification Results
SSR Data Injection: ✅ WORKING
Browser subagent confirmed the server correctly injects pounce-data script tags:

<script id="pounce-data-L3VzZXJzLzEyMw" type="application/json">
  {"id":"123","name":"User 123","role":"Tester",...}
</script>
SSR verification recording
Review
SSR verification recording

Client-Side Hydration: ⚠️ NOT YET CONSUMING
The script tag is injected and consumed (removed from DOM), but the 
api()
 client's hydration logic isn't populating the component state. The page shows "Loading user 123..." instead of the user data.

Root Cause: The component calls 
api('/users/123').get()
 which should check for hydrated data first, but the timing or context isn't matching up on the client side.

Next Steps
Debug client-side 
api()
 hydration consumption
Add timeout handling for E2E tests
Complete Phase 10.2/10.3 (SSR tests)
Files Changed
File	Change
dev.ts
New dev server with proper SSR context
index.ts
CLI with cac
utils.ts
Simplified SSR ID generation
vite.config.ts
Babel JSX plugin + aliases
CLI.md
New documentation

SSR Hydration Verification: Partial Success
✅ Server-Side Data Injection: WORKING
The pounce dev server now correctly:

Wraps SSR operations in withSSRContext
Calls the API handler to pre-fetch data
Injects pounce-data-<path> script tags into HTML
Browser verification confirmed the server sends:

html
<script id="pounce-data-L3VzZXJzLzEyMw" type="application/json">
  {"id":"123","name":"User 123","role":"Tester",...}
</script>
⚠️ Client-Side Hydration: NOT CONSUMING
The component renders "Loading user 123..." instead of the user data. The script tag is being removed from the DOM (consumed by getSSRData()), but the data isn't populating state.user.

Root Cause: The component's api().get() call runs asynchronously. By the time it checks for hydrated data, the context/timing may be off, or the reactive state update isn't triggering a re-render.

Next Steps
Debug the api() client's hydration consumption path
Verify getSSRData() returns data to the component
Check if state.user = data triggers reactivity
Would you like me to continue debugging the client-side hydration, or is there something else you'd like to tackle?

Walkthrough
Open
Complete walkthrough of CLI and dev server implementation, including SSR hydration verification.


pounce-board/tests/e2e/ssr-hydration.spec.ts