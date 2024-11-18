# Spec File Best Practices

⚠️ Pay attention to the size of the Spec File. Consider modularizing, simplifying, or simply removing any non-essential content. When your file goes beyond a few hundred lines, and you are approaching LLM context windows, it might be time to split your worker into independent services. The goal is to keep Spec Files concise, manageable, readable, and maintainable.

## Functional requirements section

⚠️ This section might contain technical terms, but still makes it easy for someone with limited technical knowledge to grasp the main ideas. It is placed at the beginning of the Spec File within a comment block.

### ✅️ Do

- **Elevator Pitch**: Clearly describe what the worker does and how it can be used. Anyone on the team should be able to understand the worker's purpose and value, regardless of their role and specialization. For example: _"This worker generates vector embeddings for input text using Workers AI Text Embedding Model and is used in applications requiring vector search. The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."_
- **Highlight Specific Project Priorities**: Focus on what the worker should achieve, not how it should be built. For instance, say _"The worker should include extensive error handling,"_ rather than listing specific error cases like _"The worker should handle errors X, Y, Z."_
- **Provide Technical Details**: After the high-level description, include more detailed technical information, such as:
  - Input and output formats (e.g., JSON structures for REST APIs)
  - Database schemas (e.g., Drizzle schema definitions)
  - Algorithms that contain custom business logic (e.g., similarity score calculation)
  - Integration with other systems or services
- **Describe System Context**: If relevant, provide a brief explanation of how the worker fits into a larger system or interacts with other components. Keep this high-level and focused on the worker's immediate interactions.
- **Include Examples**: Where helpful, provide examples of input/output, SQL queries, or other relevant code snippets to illustrate the worker's functionality or usage.

### ❌ Avoid

- **Excessive Implementation Details**: Avoid providing step-by-step implementation instructions. Focus on what needs to be achieved rather than how to code it, letting the LLM break down complex problems into individual steps.
- **Excessive System of Systems Context**: Refrain from providing detailed descriptions of the broader system or external components that the worker isn't touching directly. Concentrate on the worker’s specific role, decoupling it from the larger system as much as possible.

## Integration tests section

⚠️ This section should focus on testing the worker as a black box, verifying functionality without making assumptions about the internal implementation.

### ✅️ Do

- **Limit Imports**: Keep imports simple and standardized, defining them at the top of the file, either before or after the functional requirements section. Use only essential imports for testing and key services, like those from Cloudflare, Vitest, Postgres, or Drizzle, and avoid adding extra packages for convenience. This keeps dependencies clear and familiar for both developers and LLMs. Example:

  ```typescript
  import { SELF, env } from 'cloudflare:test';
  import { describe, it, expect } from 'vitest';
  import { eq } from 'drizzle-orm';
  import * as worker from '../src';
  import { users } from '../schema';
  ```

- **Use Contextualized, Realistic Data Mocks**: Utilize mock data that closely resembles real-world scenarios and includes edge cases and boundary conditions where relevant. This helps ensure the tests are representative and meaningful. Example

  ```typescript
  const mockMessages = [
    {
      id: '1645479494256594945',
      platform: 'RSS',
      text: 'Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC',
    },
  ];
  ```

- **Write Descriptive Test Names and Document Constraints**: Use clear, descriptive test names that align with the functional requirements of the worker. Document any known test limitations to provide context on potential areas of flakiness or incomplete simulation. Example:

  ```typescript
  it('should fetch the latest unclassified texts from DB', async () => {
    /**
     * This test checks that the worker correctly fetches the most recent unclassified texts
     * from the database, ensuring proper database query functionality.
     */
  });
  ```

- **Test Database and External Interactions Only**: If your worker interacts with external systems like databases or APIs, simulate these interactions using mock methods instead of real calls. This prevents the need for an external testing infrastructure.

  1. Replace actual calls to external services with mocks to isolate worker functionality.
  2. Use spies or mocks to capture arguments passed to these mock methods, allowing inspection of the data being used.
  3. Assert that mocked methods are called with expected data, verifying that external interactions are functioning as expected.

  ```typescript
  it('should correctly insert JSON data into the database', async () => {
    const expectedData = { id: 1, name: 'Test' };

    // Mock the Drizzle ORM insert method to prevent real database interaction
    const insertMock = vi.fn().mockResolvedValue([expectedData]);
    (drizzle.pgTable as any).mockReturnValue({
      insert: insertMock,
    });

    // Simulate the action that triggers the database insert
    const response = await SELF.fetch('https://example.com/insert', {
      method: 'POST',
      body: JSON.stringify(expectedData),
    });

    // Verify that the insert method was called with the correct data
    expect(insertMock).toHaveBeenCalledWith(expectedData);
  });
  ```

### ❌ Avoid

- **Unit Tests or Internal Implementation Checks**: Avoid testing specific internal functions or logic, as integration tests should treat the worker as a black box. Example:

  ```typescript
  it('calculates similarity score', () => {
    expect(calculateScore(0.8, 0.3)).toBeCloseTo(0.7273);
  });
  ```

- **Mocking Internal Functions**: Refrain from mocking internal worker functions. Instead, evaluate them within the complete integration to verify real outputs. Example:

  ```typescript
  it('should process message with mocked internal validator', () => {
    jest.spyOn(worker, 'validateMessage').mockImplementation(() => true);
    
    const result = worker.processMessage(message);
    expect(result.isValid).toBe(true);
  });
  ```

- **Randomly Generated Data in Mocks**: Avoid using data generated by functions like _Math.random()_ in mocks. Randomized data can obscure functional requirements and complicate debugging. Example:

  ```typescript
  const randomMockMessage = () => ({
    id: Math.random().toString(36).substring(7),
    platform: ['RSS', 'Twitter', 'Facebook'][Math.floor(Math.random() * 3)],
    text: Math.random().toString(36).substring(7),
  });

  const mockMessages = Array.from({ length: 10 }, randomMockMessage);
  ```

- **Shared State or Global Data**: Avoid shared state or global data across tests to keep them independent. Shared globals are allowed in specific cases, like `global.fetch` for consistent mocks. Example:

  ```typescript
  let sharedCounter = 0;

  describe('Worker tests', () => {
    it('first test', () => {
      sharedCounter++;
      expect(worker.process()).toBe(sharedCounter);
    });
    
    it('second test', () => {
      sharedCounter++;
      expect(worker.process()).toBe(sharedCounter);
    });
  });
  ```

- **Common-Sense Functionality Tests**: Refrain from testing trivial functionality. Assume LLMs have seen sufficient high-quality examples of common practices, such as logging, error handling, and back-off strategies.

  ```typescript
  it('should return error when content-type header is missing', async () => {
    const credentials = {
      username: 'the_donald',
      password: 'badPassword123',
    };

    const response = await SELF.fetch('https://example.com/login', {
      body: JSON.stringify(credentials), // Content is JSON encoded
      method: 'POST',
      // content-type header is intentionally omitted to simulate the error
    });

    expect(response.status).toBe(400); // Assuming server returns 400 for missing content-type
    expect(response.json()).toEqual({
      error: 'Content-Type header missing',
    });
  });
  ```

## Database Systems

⚠️ Choose the appropriate database system based on your worker's requirements and complexity.

### Cloudflare D1 (SQLite)

For basic usage with simple data structures and moderate traffic, use [`Cloudflare D1`](https://developers.cloudflare.com/d1/). It's ideal for:

- Simple CRUD operations
- Local data storage
- Low to moderate traffic
- Basic relational data

Example integration test with `D1`:

```typescript
import { SELF, env } from 'cloudflare:test';
import { it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').unique().notNull(),
});

it('should insert and retrieve user data from D1', async () => {
	const testUser = {
		name: 'John Doe',
		email: 'john@example.com',
	};

	// Insert test user through the /register API
	const response = await SELF.fetch('http://localhost/register', {
		method: 'POST',
		body: JSON.stringify(testUser),
	});

	// Query the registered user through the test database
	const db = drizzle(env.DB);
	const result = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
		})
		.from(users)
		.where(eq(users.email, testUser.email));

	expect(result[0]).toEqual({
		id: expect.any(Number),
		name: testUser.name,
		email: testUser.email,
	});
});
```

### Cloudflare Hyperdrive (PostgreSQL)

For complex applications requiring advanced database features, use [`Hyperdrive`](https://developers.cloudflare.com/hyperdrive/) to connect to PostgreSQL. It's suitable for:

- Complex queries and joins
- High traffic applications
- Advanced database features (JSON, Full-text search)
- Large datasets
- Time series databases (TimescaleDB)

Example integration test with `Hyperdrive`:

```typescript
import { SELF, env } from 'cloudflare:test';
import { it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { Client } from 'pg';

vi.mock('pg', () => ({
	Client: class {
		connect = vi.fn();
		query = vi.fn();
		end = vi.fn();
	},
}));

const values = vi.fn();
const insert = vi.fn(() => ({
  values,
}));

vi.mock('drizzle-orm/node-postgres', async () => ({
	drizzle: vi.fn(() => ({
		insert,
	})),
}));

const users = pgTable('users', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').unique().notNull(),
});

it('should insert and retrieve user data from D1', async () => {
	const testUser = {
		name: 'John Doe',
		email: 'john@example.com',
	};

	// Insert test user through the /register API
	const response = await SELF.fetch('http://localhost/register', {
		method: 'POST',
		body: JSON.stringify(testUser),
	});

	// Query the registered user through the test database
	const client = new Client({
		connectionString: env.DB.connectionString,
	});
	const db = drizzle(client);
	const result = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
		})
		.from(users)
		.where(eq(users.email, testUser.email));

	expect(result[0]).toEqual({
		id: expect.any(Number),
		name: testUser.name,
		email: testUser.email,
	});
});
```
