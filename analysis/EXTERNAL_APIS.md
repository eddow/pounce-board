# External API Integration

## 1. Defining Proxies
Create typed proxies for external APIs in `routes/api/`:

```ts
// routes/api/legacy.ts
import { defineProxy } from "pounce/http";

export default defineProxy({
  baseUrl: "https://legacy-api.example.com",

  // Global request transforms
  request: {
    headers: {
      "X-API-KEY": process.env.LEGACY_API_KEY!
    }
  },

  endpoints: {
    // Define each endpoint
    getUser: {
      method: "GET",
      path: "/users/{id}",
      // Transform response data
      transform: (data) => ({
        id: data.userId,  // Rename fields
        name: data.fullName,
        email: data.emailAddress,
        legacyData: {
          originalId: data.userId,
          createdAt: data.registrationDate
        }
      })
    },

    createUser: {
      method: "POST",
      path: "/users",
      // Transform request body
      prepare: (body) => ({
        userData: body,
        source: "pounce-framework"
      })
    },

    searchUsers: {
      method: "GET",
      path: "/users/search",
      // Query parameter handling
      params: (input) => ({
        q: input.query,
        page: input.page || 1,
        limit: input.limit || 10
      })
    }
  }
});
```

## 2. Using Proxies
```ts
// In your route handlers or frontend
import { api } from "pounce/http/client";

// Get a user
// Note: Proxies are just mapped to URLs. The api() client handles them if the path matches the proxy URL.
// Or if we registered a global alias like "~/api/legacy" -> "https://legacy-api.example.com"
const user = await api("~/api/legacy/users/123").get<User>();

// Create a user
const newUser = await api("~/api/legacy/users").post<User>({
  name: "John Doe",
  email: "john@example.com"
});

// Search users
const results = await api("~/api/legacy/users/search").get<User[]>({
  query: "John",
  page: "2"
});
```

## 3. Type Safety
The proxy automatically generates TypeScript types:

```ts
// All these are fully typed
const user = await api("~/api/legacy/users/123").get<User>();
// user: {
//   id: string;...
//   name: string;
//   email: string;
//   legacyData: {
//     originalId: string;
//     createdAt: string;
// }
```

## 4. Advanced Features

### Dynamic Path Segments
```ts
endpoints: {
  getUserPosts: {
    method: "GET",
    path: "/users/{userId}/posts/{postId}",
    // Path params are automatically typed
    transform: (data, params) => ({
      ...data,
      userId: params.userId,
      postId: params.postId
    })
  }
}
```

### Error Handling
```ts
endpoints: {
  getUser: {
    method: "GET",
    path: "/users/{id}",
    // Handle API errors
    onError: (error) => {
      if (error.status === 404) {
        throw new Error("User not found");
      }
      throw new Error("Failed to fetch user");
    }
  }
}
```

### Response Validation
```ts
import { z } from "zod";

endpoints: {
  getUser: {
    method: "GET",
    path: "/users/{id}",
    // Validate response with Zod
    schema: z.object({
      userId: z.string(),
      fullName: z.string(),
      emailAddress: z.string().email()
    })
  }
}
```

## 5. Mocking for Development
```ts
// routes/api/legacy.ts
import { defineProxy } from "pounce/http";

export default defineProxy({
  baseUrl: process.env.NODE_ENV === "development"
    ? "/mock-legacy-api"
    : "https://legacy-api.example.com",
  endpoints: {
    getUser: {
      method: "GET",
      path: "/users/{id}",
      // Development mock
      mock: (params) => ({
        userId: params.id,
        fullName: `Mock User ${params.id}`,
        emailAddress: `user${params.id}@example.com`
      })
    }
  }
});
```

## 6. Authentication
```ts
// routes/api/secure.ts
import { defineProxy } from "pounce/http";

export default defineProxy({
  baseUrl: "https://secure-api.example.com",

  // Global auth
  request: async (init) => {
    const token = await getAuthToken();
    return {
      ...init,
      headers: {
        ...init.headers,
        "Authorization": `Bearer ${token}`
      }
    };
  },

  endpoints: {
    getPrivateData: {
      method: "GET",
      path: "/private"
    }
  }
});
```

## 7. File Uploads
```ts
endpoints: {
  uploadAvatar: {
    method: "POST",
    path: "/users/{id}/avatar",
    // Handle FormData
    prepare: (body) => {
      const formData = new FormData();
      formData.append("avatar", body.file);
      formData.append("userId", body.userId);
      return formData;
    },
    // Don't parse response as JSON
    raw: true
  }
}
```

## 8. Streaming Responses
```ts
endpoints: {
  downloadReport: {
    method: "GET",
    path: "/reports/{id}/download",
    // Handle stream response
    raw: true,
    transform: (response) => ({
      filename: response.headers.get("content-disposition"),
      stream: response.body
    })
  }
}
```
