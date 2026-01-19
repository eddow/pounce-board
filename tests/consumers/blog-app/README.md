# Blog App Consumer Test

This consumer app mocks a simple blog backend to verify advanced Pounce-Board features.

## Tested Features

1.  **CRUD API Routes**:
    - `GET /posts`: List all posts
    - `POST /posts`: Create a new post
    - `GET /posts/[id]`: View single post
    - `PUT /posts/[id]`: Update post
    - `DELETE /posts/[id]`: Delete post

2.  **Route Groups**:
    - `(auth)/login`: Login endpoint (verifies route group path mapping)

3.  **Middleware Inheritance**:
    - `routes/common.ts`: Global middleware
    - `routes/posts/common.ts`: Middleware specific to posts (e.g., validation)

4.  **Hono Integration**:
    - `server.ts` uses `createPounceApp` to mount the file-based router.
