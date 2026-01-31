import { z } from 'zod'
import { parsePathSegment } from 'pounce-ts'

export type RouteParams<Path extends string> = Record<string, string>

// Helper to extract params from path string like /users/[id]
type ExtractParams<Path extends string> = Path extends `${infer Start}/${infer Rest}`
	? ExtractParams<Start> & ExtractParams<Rest>
	: Path extends `[...${infer Param}]`
	? { [K in Param]: string }
	: Path extends `[${infer Param}]`
	? { [K in Param]: string }
	: {}

export interface RouteDefinition<
	Path extends string = string,
	QuerySchema extends z.ZodType = z.ZodType,
> {
	path: Path
	querySchema?: QuerySchema
	buildUrl: (
		params: ExtractParams<Path> & z.input<QuerySchema>
	) => string
}

export function defineRoute<
	Path extends string,
	QuerySchema extends z.ZodType
>(
	path: Path,
	querySchema?: QuerySchema
): RouteDefinition<Path, QuerySchema> {
	return {
		path,
		querySchema,
		buildUrl: (params: any) => {
			let url: string = path
			const queryParams = new URLSearchParams()
			
			// Separate path params and query params
			// This is a bit naive, ideally we'd separate them based on the path structure
			// But since we have the path string, we can regex replace
			
			const pathKeys = new Set<string>()
            const segments = path.split('/')
            for (const segment of segments) {
                 if (segment.startsWith('[') && segment.endsWith(']')) {
                     const isCatchAll = segment.startsWith('[...')
                     const key = segment.slice(isCatchAll ? 4 : 1, -1)
                     pathKeys.add(key)
                     
                     if (params[key] === undefined) {
                         throw new Error(`Missing path parameter: ${key}`)
                     }
                     
                     url = url.replace(segment, params[key])
                 }
            }

			// Validate and append query params
			if (querySchema) {
                // Filter params that are NOT path params to pass to validation
                const potentialQueryParams: Record<string, any> = {}
                for (const key in params) {
                    if (!pathKeys.has(key)) {
                        potentialQueryParams[key] = params[key]
                    }
                }

				const parsedQuery = querySchema.parse(potentialQueryParams)
				for (const [key, value] of Object.entries(parsedQuery)) {
					if (value !== undefined && value !== null) {
						queryParams.set(key, String(value))
					}
				}
			}

			const queryString = queryParams.toString()
			return queryString ? `${url}?${queryString}` : url
		},
	}
}
