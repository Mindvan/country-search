import { afterEach, expect, it, vi } from 'vitest';
import { createSearchController } from './createSearchController.js';
import type {
  SearchController,
  SearchState,
} from './createSearchController.js';

let controller: SearchController | undefined;
afterEach(() => {
  controller?.dispose();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(['success', 'empty', 'error'] as const)(
  'notifies subscribers of loading and %s',
  async (status) => {
    vi.useFakeTimers();
    const country = {
      name: 'Spain',
      flag: '',
      region: 'Europe',
      population: 1,
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          status === 'error'
            ? new Response('', { status: 500 })
            : Response.json(status === 'success' ? [country] : []),
        ),
    );
    controller = createSearchController();
    const listener = vi.fn<(state: SearchState) => void>();
    controller.subscribe(listener);
    expect(listener.mock.calls.map(([state]) => state.status)).toEqual([
      'idle',
    ]);
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    expect(listener.mock.calls.map(([state]) => state.status)).toEqual([
      'idle',
      'idle',
      'loading',
      status,
    ]);
    expect(listener).toHaveBeenLastCalledWith(controller.getState());
    controller.setQuery('');
    expect(listener).toHaveBeenLastCalledWith({
      status: 'idle',
      countries: [],
      error: null,
    });
  },
);

it('isolates snapshots and stops notifications after unsubscribe or dispose', () => {
  controller = createSearchController();
  controller.subscribe((state) => {
    state.status = 'error';
  });
  const listener = vi.fn();
  const unsubscribe = controller.subscribe(listener);
  expect(listener).toHaveBeenLastCalledWith({
    status: 'idle',
    countries: [],
    error: null,
  });
  expect(controller.getState().status).toBe('idle');
  unsubscribe();
  controller.setQuery('');
  expect(listener).toHaveBeenCalledTimes(1);
  controller.subscribe(listener);
  controller.dispose();
  controller.setQuery('spain');
  controller.subscribe(listener);
  expect(listener).toHaveBeenCalledTimes(2);
});
