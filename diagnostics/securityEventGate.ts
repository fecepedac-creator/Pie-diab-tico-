export const T6_CANARY_ORIGIN = 'https://pie-diabetico-canary-2026.web.app';

export function isApprovedT6CanaryOrigin(origin: string): boolean {
  return origin === T6_CANARY_ORIGIN;
}
