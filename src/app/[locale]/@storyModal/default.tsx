/**
 * Nothing in the slot unless a story route is intercepted.
 *
 * Next 16 requires an explicit `default` for every parallel slot — a build
 * fails without it.
 */
export default function Default() {
  return null;
}
