import { Context, Next } from 'hono';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'json' | 'query' | 'param' = 'json') {
  return async (c: Context, next: Next) => {
    let data: unknown;

    switch (source) {
      case 'json':
        data = await c.req.json();
        break;
      case 'query':
        data = Object.fromEntries(new URL(c.req.url).searchParams);
        break;
      case 'param':
        data = c.req.param();
        break;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: result.error.flatten().fieldErrors,
        },
      }, 400);
    }

    c.set('validatedData', result.data);
    await next();
  };
}
