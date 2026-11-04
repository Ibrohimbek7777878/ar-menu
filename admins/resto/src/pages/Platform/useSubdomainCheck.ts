import { useEffect, useState } from 'react';
import { checkSubdomain } from './api';
import { validateSubdomain } from './subdomain';
import type { SubdomainProblem } from './subdomain';

export type CheckState =
  | { status: 'idle' }
  | { status: 'invalid'; problem: SubdomainProblem }
  | { status: 'checking' }
  | { status: 'available'; normalized: string }
  | { status: 'taken'; reason: string }
  | { status: 'error' };

const DEBOUNCE_MS = 400;

/**
 * Subdomen yozilganda jonli tekshiruv: avval mijoz tomonida (format, band so'zlar), keyin 400 ms to'xtab turilsa serverdan.
 * Eskirgan so'rov bekor qilinadi, kechikib kelgan javob yangisini bosib ketmaydi.
 */
export function useSubdomainCheck(value: string): CheckState {
  const [state, setState] = useState<CheckState>({ status: 'idle' });

  useEffect(() => {
    if (!value) {
      setState({ status: 'idle' });
      return undefined;
    }
    const problem = validateSubdomain(value);
    if (problem) {
      setState({ status: 'invalid', problem });
      return undefined;
    }
    setState({ status: 'checking' });
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkSubdomain(value, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setState(result.available ? { status: 'available', normalized: result.normalized || value } : { status: 'taken', reason: result.reason });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: 'error' });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return state;
}
