import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not call the callback before the delay expires', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the callback exactly once when the delay expires', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();
    vi.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('restarts the full delay after every call', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(299);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('passes all arguments from the latest call to the callback', () => {
    const callback = vi.fn<(query: string, limit: number) => void>();
    const debounced = debounce(callback, 300);

    debounced('sp', 5);
    vi.advanceTimersByTime(100);
    debounced('spain', 10);
    vi.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledExactlyOnceWith('spain', 10);
  });

  it('can schedule a new call after the previous one completes', () => {
    const callback = vi.fn<(query: string) => void>();
    const debounced = debounce(callback, 300);

    debounced('spain');
    vi.advanceTimersByTime(300);
    debounced('france');
    vi.advanceTimersByTime(299);

    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'spain');
    expect(callback).toHaveBeenNthCalledWith(2, 'france');
  });

  it('keeps timers independent between wrappers of the same callback', () => {
    const callback = vi.fn<(query: string) => void>();
    const first = debounce(callback, 300);
    const second = debounce(callback, 100);

    first('spain');
    second('france');
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledExactlyOnceWith('france');
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(2, 'spain');
  });

  it('defers a zero-delay callback until timers run', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 0);

    debounced();

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
