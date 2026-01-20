/**
 * SSR utilities for pounce-board
 * Re-exports from utils.ts for package consumers
 */
export {
	withSSRContext,
	getSSRId,
	injectSSRData,
	getCollectedSSRResponses,
	clearSSRData,
	injectApiResponses,
	getSSRData,
	escapeJson,
	type SSRDataMap,
} from './utils.js'
