/**
 * Extended Response class for Pounce-Board interceptors
 * Supports caching the body to allow multiple reads (by interceptors and consumers)
 * and allows body modification via setJson()
 */
export class PounceResponse extends Response {
	private _bufferCache: ArrayBuffer | null = null
	private _jsonCache: any = null
	private _textCache: string | null = null
	private _bodyRead = false

	constructor(body?: BodyInit | null, init?: ResponseInit) {
		super(body, init)
	}

	/**
	 * Internal helper to get and cache the raw buffer
	 */
	private async _getBuffer(): Promise<ArrayBuffer> {
		if (this._bufferCache) return this._bufferCache
		if (this._bodyRead && !this._bufferCache) {
			throw new Error('[pounce-board] Body already read or locked')
		}
		this._bodyRead = true
		this._bufferCache = await super.arrayBuffer()
		return this._bufferCache
	}

	/**
	 * Reads JSON, caches it, and returns it.
	 * Subsequent calls return the cached object.
	 * If data was set via setData(), it is returned directly.
	 */
	override async json<T = any>(): Promise<T> {
		if (this._jsonCache !== null) return this._jsonCache
		
		const buffer = await this._getBuffer()
		const text = new TextDecoder().decode(buffer)
		this._jsonCache = JSON.parse(text)
		return this._jsonCache
	}

	/**
	 * Returns the high-level representation of the response payload.
	 * Populated after a successful call to json() or via setData().
	 */
	get data(): any {
		return this._jsonCache
	}

	/**
	 * Reads the body as text, caches it, and returns it.
	 */
	override async text(): Promise<string> {
		if (this._textCache !== null) return this._textCache
		
		const buffer = await this._getBuffer()
		this._textCache = new TextDecoder().decode(buffer)
		return this._textCache
	}

	/**
	 * Reads the body as an ArrayBuffer, caches it, and returns it.
	 */
	override async arrayBuffer(): Promise<ArrayBuffer> {
		return this._getBuffer()
	}

	/**
	 * Set the high-level representation of the response payload.
	 * Can be used by interceptors to transform response data into
	 * any JavaScript object (including cyclic references or class instances).
	 */
	setData(value: any): void {
		this._jsonCache = value
	}

	/**
	 * Override clone to carry over the cache state
	 */
	override clone(): PounceResponse {
		const cloned = new PounceResponse(this._bufferCache || this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		})
		
		// Copy cache state
		cloned._bufferCache = this._bufferCache
		cloned._jsonCache = this._jsonCache
		cloned._textCache = this._textCache
		cloned._bodyRead = this._bodyRead
		
		return cloned
	}

	static from(response: Response): PounceResponse {
		if (response instanceof PounceResponse) return response
		
		// If the body is already disturbed, we can't pass it to the constructor.
		// We create a response with a null body but mark it as read.
		const body = response.bodyUsed ? null : response.body
		const res = new PounceResponse(body, response)
		
		if (response.bodyUsed) {
			res._bodyRead = true
		}
		
		return res
	}
}
