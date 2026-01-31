
import { describe, it, expectTypeOf } from 'vitest';
import type { ExtractPathParams } from './inference';

describe('Type Inference', () => {
  it('should extract simple params', () => {
    type Params = ExtractPathParams<'/users/[id]'>;
    expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
  });
  
  it('should extract multiple params', () => {
    type Params = ExtractPathParams<'/users/[userId]/posts/[postId]'>;
    expectTypeOf<Params>().toMatchTypeOf<{ userId: string; postId: string }>();
  });

  it('should handle catch-all params', () => {
    type Params = ExtractPathParams<'/files/[...path]'>;
    expectTypeOf<Params>().toEqualTypeOf<{ path: string[] }>();
  });

  it('should return empty object for static paths', () => {
    type Params = ExtractPathParams<'/users'>;
    expectTypeOf<Params>().toEqualTypeOf<{}>();
  });

  it('should extract params including prefix/suffix', () => {
    type Params = ExtractPathParams<'/data/[id].json'>;
    expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
  });

  it('should ignore protocols like https://', () => {
    type Params = ExtractPathParams<'https://example.com/data'>;
    expectTypeOf<Params>().toEqualTypeOf<{}>();
  });
});
