import { buildNaviContext } from './navi.context.js';

/** Read-only tool boundary for future model/tool-calling adapters. */
export const naviReadTools = {
  'reservation.get': buildNaviContext,
  // Additional read tools will be added behind this boundary as their
  // domain-safe query contracts are established.
} as const;
