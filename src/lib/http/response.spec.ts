import { describe, expect, it } from 'vitest'
import { PounceResponse } from './response.js'

describe('PounceResponse', () => {
	it('should allow reading body multiple times as JSON', async () => {
		const data = { hello: 'world' }
		const res = new PounceResponse(JSON.stringify(data))

		const first = await res.json()
		const second = await res.json()

		expect(first).toEqual(data)
		expect(second).toEqual(data)
		expect(first).toBe(second) // Should be the same object instance from cache
	})

	it('should allow reading body as JSON then as Text', async () => {
		const data = { hello: 'world' }
		const jsonString = JSON.stringify(data)
		const res = new PounceResponse(jsonString)

		const json = await res.json()
		const text = await res.text()

		expect(json).toEqual(data)
		expect(text).toBe(jsonString)
	})

	it('should allow reading body as Text then as JSON', async () => {
		const data = { hello: 'world' }
		const jsonString = JSON.stringify(data)
		const res = new PounceResponse(jsonString)

		const text = await res.text()
		const json = await res.json()

		expect(text).toBe(jsonString)
		expect(json).toEqual(data)
	})

	it('should support setData and correctly reflect in json() and .data', async () => {
		const res = new PounceResponse(null)
		const data = { updated: true }
		
		res.setData(data)

		expect(await res.json()).toEqual(data)
		expect(res.data).toBe(data)
		// text() should still return original body (null in this case)
		expect(await res.text()).toBe('')
	})

	it('should support complex/cyclic objects in setData', async () => {
		const res = new PounceResponse(null)
		const cyclic: any = { a: 1 }
		cyclic.self = cyclic
		
		res.setData(cyclic)

		const result = await res.json()
		expect(result).toBe(cyclic)
		expect(result.self).toBe(cyclic)
		expect(res.data).toBe(cyclic)
	})

	it('should populate .data after json() is called', async () => {
		const data = { auto: 'populated' }
		const res = new PounceResponse(JSON.stringify(data))
		
		expect(res.data).toBeNull()
		await res.json()
		expect(res.data).toEqual(data)
	})

	it('should correctly clone while preserving complex data', async () => {
		const res = new PounceResponse(null)
		const complex = { date: new Date(), func: () => 'hi' }
		
		res.setData(complex)
		
		const cloned = res.clone()
		
		expect(cloned.data).toBe(complex)
		expect(await cloned.json()).toBe(complex)
	})

	it('should throw if body is read from standard Response then converted to PounceResponse', async () => {
		const standardRes = new Response('raw body')
		await standardRes.text() // Consume stream
		
		const pounceRes = PounceResponse.from(standardRes)
		
		await expect(pounceRes.text()).rejects.toThrow('[pounce-board] Body already read or locked')
	})
})
