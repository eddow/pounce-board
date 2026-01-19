/**
 * Extended Response class for Pounce-Board interceptors
 * Supports caching the body JSON to allow multiple reads (by interceptors and consumers)
 * and allows body modification via setJson()
 */
export class PounceResponse extends Response {
	private _bodyCache: any = null
	private _bodyRead = false

	constructor(body?: BodyInit | null, init?: ResponseInit) {
		super(body, init)
	}

	/**
	 * Reads JSON, caches it, and returns it.
	 * Subsequent calls return the cached object.
	 */
	override async json<T = any>(): Promise<T> {
		if (this._bodyCache) return this._bodyCache

		// If we already read the body but have no cache, it might have been read as text/blob
		// In that case, we can't read it again unless we implemented full cloning/teeing logic elsewhere
		// But for our use case, we assume JSON-first usage.
		if (this._bodyRead && !this._bodyCache) {
			throw new Error('Body already read as non-JSON')
		}

		this._bodyRead = true
		this._bodyCache = await super.json()
		return this._bodyCache
	}

	/**
	 * Modify the JSON body.
	 * Can be used by interceptors to transform response data.
	 */
	setJson(data: any): void {
		this._bodyCache = data
		this._bodyRead = true
	}

	/**
	 * Override clone to ensure we don't lose the cache capability
	 * Note: This is detailed work. For now, a simple clone calling super is enough,
	 * but ideally, it should carry over the cache state if needed.
	 */
	override clone(): PounceResponse {
		return new PounceResponse(this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		})
	}

	static from(response: Response): PounceResponse {
		if (response instanceof PounceResponse) return response
		return new PounceResponse(response.body, response)
	}
}
