export const VIEW = Object.freeze({ width: 1280, height: 720 });
export const CITY = Object.freeze({ left: 48, right: 1232, top: 136, bottom: 624, grid: 40 });
export const COLORS = Object.freeze({
  background: '#070b19', panel: '#0d1428', grid: '#18243b',
  cyan: '#5cf3ed', magenta: '#fa65c8', yellow: '#f9de70',
  red: '#ff6374', orange: '#ff9b65', white: '#edf6ff', muted: '#7e91ae',
});
export const PARCEL_TYPES = Object.freeze([
  { name: 'ROSE', color: COLORS.magenta, symbol: 'A' },
  { name: 'GOLD', color: COLORS.yellow, symbol: 'B' },
  { name: 'ICE', color: COLORS.cyan, symbol: 'C' },
]);
export const TUNING = Object.freeze({
  speed: 248, acceleration: 16, playerRadius: 14,
  dashSpeed: 850, dashDuration: 0.18, dashCooldown: 1.6,
  hitGrace: 1.8, startGrace: 2.5, trafficRadius: 15,
  trafficSpeed: 78, trafficIncrease: 13, trafficStart: 5,
  chaseRange: 205, turnRate: 2.1, parcelInterval: 3.7,
  parcelLimit: 6, powerInterval: 13, powerDuration: 6,
  magnetRange: 155, deliveryRadius: 38, pickupRadius: 26,
  shiftDeliveries: 10, comboLimit: 8, basePoints: 100, shiftBonus: 500,
  expressSeconds: 8, expressBonus: 25, droppedPickupDelay: 0.65,
});
export const FIXED_STEP = 1 / 120;
