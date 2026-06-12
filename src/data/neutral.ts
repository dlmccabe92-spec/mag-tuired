import type { BuildingDef } from '@/game/types';

export const NEUTRAL_SHOP: BuildingDef = {
  id: 'neutral_shop',
  name: 'Tráchtálaí',
  epithet: 'Crossroads Merchant',
  race: 'neutral',
  role: 'shop',
  tier: 1,
  gold: 0, lumber: 0, buildTime: 0,
  hp: 1200, armor: 5, size: 2, sight: 200,
  desc: 'A traveling merchant who sells draughts and trinkets to any hero with coin.',
};
