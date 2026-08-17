"use client";

import { useEffect, useState } from "react";

/**
 * Delays propagating a rapidly-changing value (typing, filter sliders).
 *
 * The setState runs inside the timeout callback, not synchronously in the
 * effect body — the latter causes cascading renders and is rejected by the
 * React Compiler lint rules.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
