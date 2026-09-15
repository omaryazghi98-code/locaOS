import { buildNaviContext } from './navi.context.js';

/** Read-only tool boundary for future model/tool-calling adapters. */
export const naviReadTools = {
  'reservation.get': buildNaviContext,
} as const;
