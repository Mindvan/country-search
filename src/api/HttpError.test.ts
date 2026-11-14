import { describe, expect, it } from 'vitest';
import { HttpError } from './HttpError.js';

describe('HttpError', () => {
  it('is an Error with a distinct name', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
  });

  it.each([400, 429, 500, 503])('preserves HTTP status %i', (status) => {
    const error = new HttpError(status);

    expect(error.status).toBe(status);
    expect(error.message).toContain(String(status));
  });
});
