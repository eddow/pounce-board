import { describe, it, expect, beforeEach } from 'vitest'
import { h } from 'pounce-ts'
import { renderToString, renderToStringAsync, withSSR } from 'pounce-ts/server'
import { reactive } from 'mutts'
import { createScope, runWithContext, flushSSRPromises, trackSSRPromise } from '../../src/lib/http/context.js'

describe('SSR Component Rendering', () => {
    it('should render a simple component to string', () => {
        const Simple = () => h('div', { class: 'test' }, 'Hello World')
        const html = renderToString(h(Simple, {}))
        expect(html).toBe('<div class="test">Hello World</div>')
    })

    it('should handle reactive state in synchronous render', () => {
        const Stateful = () => {
            const state = reactive({ count: 1 })
            return h('div', {}, () => `Count: ${state.count}`)
        }
        const html = renderToString(h(Stateful, {}))
        expect(html).toBe('<div>Count: 1</div>')
    })

    it('should render asynchronously with promised data', async () => {
        const AsyncComp = () => {
            const state = reactive({ data: 'loading' })
            
            // Simulating an API call
            const promise = new Promise((resolve) => {
                setTimeout(() => {
                    state.data = 'resolved'
                    resolve(true)
                }, 10)
            })
            trackSSRPromise(promise)

            return h('div', {}, () => state.data)
        }

        const scope = createScope({ ssr: true })
        const html = await runWithContext(scope, async () => {
            return await renderToStringAsync(h(AsyncComp, {}), undefined, {
                collectPromises: flushSSRPromises
            })
        })

        expect(html).toBe('<div>resolved</div>')
    })
    
    it('should handle nested components during async render', async () => {
        const Child = (props: { data: string }) => h('span', {}, () => props.data)
        const Parent = () => {
            const state = reactive({ val: 'loading' })
            const promise = new Promise((resolve) => {
                setTimeout(() => {
                    state.val = 'done'
                    resolve(true)
                }, 10)
            })
            trackSSRPromise(promise)
            return h('div', {}, [
                h('strong', {}, 'Status: '),
                h(Child, { data: () => state.val })
            ])
        }

        const scope = createScope({ ssr: true })
        const html = await runWithContext(scope, async () => {
            return await renderToStringAsync(h(Parent, {}), undefined, {
                collectPromises: flushSSRPromises
            })
        })

        expect(html).toContain('<strong>Status: </strong><span>done</span>')
    })

    it('should provide a safe SSR environment with withSSR', () => {
        const result = withSSR(({ document }) => {
            const el = document.createElement('span')
            el.textContent = 'inner'
            return el.outerHTML
        })
        expect(result).toBe('<span>inner</span>')
    })
})
