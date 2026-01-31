import { reactiveOptions } from 'mutts';

reactiveOptions.onMemoizationDiscrepancy = (cached: any, fresh: any, fn: Function, args: any[]) => {
    const isNode = (val: any) => typeof Node !== 'undefined' && val instanceof Node;
    const stringify = (val: any): string => {
        if (typeof val === 'object' && val !== null && 'outerHTML' in val) return (val as any).outerHTML || `[Empty ${val.tagName || 'Node'}]`;
        if (Array.isArray(val)) return `[${val.map((v) => stringify(v)).join(', ')}]`;
        if (val && typeof val === 'object' && !val.toJSON && Object.getPrototypeOf(val) !== Object.prototype) return `[${val.constructor?.name || 'Object.create(null)'}]`;
        try {
            return JSON.stringify(val);
        } catch {
            return String(val);
        }
    };

    const cachedStr = stringify(cached);
    const freshStr = stringify(fresh);

    if (cachedStr === freshStr) return; // Ignore if content matches (especially for new DOM nodes with same content)

    const fnName = fn.name || 'anonymous';
    const error = new Error(`Memoization discrepancy detected in ${fnName}!
Cached: ${cachedStr}
Fresh:  ${freshStr}
Args:   ${stringify(args)}`);
    
    console.error(error);
    throw error;
};

