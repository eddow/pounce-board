import { defineRoute } from 'pounce-board'
import { z } from 'zod'

export const userRoute = defineRoute('/users/[id]', z.object({
	details: z.boolean().optional(),
    format: z.enum(['full', 'compact']).optional()
}))
