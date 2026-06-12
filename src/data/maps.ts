import type { MapDef } from '@/game/types';

export const MAPS: MapDef[] = [
  {
    id: 'bridge',
    name: 'Bridge of Giants',
    irish: 'Droichead na bhFathach',
    desc: 'Small · aggressive. Two shores divided by a cold river, joined by a single span. Hold the bridge or die on it.',
    size: 96,
    starts: [{ x: 14, y: 48 }, { x: 82, y: 48 }],
    mines: [
      { x: 10, y: 40, gold: 12500 },
      { x: 86, y: 56, gold: 12500 },
      { x: 47, y: 14, gold: 12500 },
      { x: 47, y: 82, gold: 12500 },
    ],
    camps: [
      { x: 47, y: 20, creeps: ['torc', 'damhanalla', 'faolchu'], dropTier: 2 },
      { x: 47, y: 76, creeps: ['torc', 'damhanalla', 'faolchu'], dropTier: 2 },
      { x: 34, y: 32, creeps: ['faolchu', 'faolchu', 'torc'], dropTier: 1 },
      { x: 62, y: 64, creeps: ['faolchu', 'faolchu', 'torc'], dropTier: 1 },
    ],
    shops: [{ x: 60, y: 44 }],
  },
  {
    id: 'meadow',
    name: 'Meadow of Kings',
    irish: 'Cluain na Ríthe',
    desc: 'Medium · balanced. Cross-corner thrones around a haunted central barrow where a great serpent coils about an artifact.',
    size: 128,
    starts: [{ x: 20, y: 20 }, { x: 108, y: 108 }],
    mines: [
      { x: 13, y: 13, gold: 12500 },
      { x: 115, y: 115, gold: 12500 },
      { x: 104, y: 24, gold: 9000 },
      { x: 24, y: 104, gold: 9000 },
    ],
    camps: [
      { x: 64, y: 64, creeps: ['oilliphéist', 'gruagach', 'bananach'], dropTier: 3 },
      { x: 99, y: 29, creeps: ['bodach', 'feardearg', 'feardearg'], dropTier: 2 },
      { x: 29, y: 99, creeps: ['bodach', 'feardearg', 'feardearg'], dropTier: 2 },
      { x: 64, y: 32, creeps: ['faolchu', 'faolchu', 'torc'], dropTier: 1 },
      { x: 64, y: 96, creeps: ['faolchu', 'faolchu', 'torc'], dropTier: 1 },
      { x: 32, y: 64, creeps: ['torc', 'torc', 'faolchu'], dropTier: 1 },
      { x: 96, y: 64, creeps: ['torc', 'torc', 'faolchu'], dropTier: 1 },
    ],
    shops: [{ x: 46, y: 82 }, { x: 82, y: 46 }],
  },
  {
    id: 'plain',
    name: 'The Battle Plain',
    irish: 'Machaire an Chatha',
    desc: 'Large · sprawling. The storied plain itself: many seams of gold, winding woods, and a merchant who sells to both sides.',
    size: 160,
    starts: [{ x: 22, y: 80 }, { x: 138, y: 80 }],
    mines: [
      { x: 15, y: 72, gold: 12500 },
      { x: 145, y: 88, gold: 12500 },
      { x: 24, y: 26, gold: 9000 },
      { x: 136, y: 134, gold: 9000 },
      { x: 24, y: 134, gold: 9000 },
      { x: 136, y: 26, gold: 9000 },
      { x: 66, y: 44, gold: 7000 },
      { x: 94, y: 116, gold: 7000 },
    ],
    camps: [
      { x: 80, y: 80, creeps: ['oilliphéist', 'gruagach', 'bananach', 'bodach'], dropTier: 3 },
      { x: 29, y: 31, creeps: ['bodach', 'damhanalla', 'feardearg'], dropTier: 2 },
      { x: 131, y: 129, creeps: ['bodach', 'damhanalla', 'feardearg'], dropTier: 2 },
      { x: 29, y: 129, creeps: ['gruagach', 'feardearg', 'feardearg'], dropTier: 2 },
      { x: 131, y: 31, creeps: ['gruagach', 'feardearg', 'feardearg'], dropTier: 2 },
      { x: 61, y: 49, creeps: ['torc', 'torc', 'faolchu'], dropTier: 1 },
      { x: 99, y: 111, creeps: ['torc', 'torc', 'faolchu'], dropTier: 1 },
      { x: 80, y: 40, creeps: ['damhanalla', 'faolchu', 'faolchu'], dropTier: 1 },
      { x: 80, y: 120, creeps: ['damhanalla', 'faolchu', 'faolchu'], dropTier: 1 },
    ],
    shops: [{ x: 80, y: 70 }],
  },
];

export function getMap(id: string): MapDef {
  return MAPS.find(m => m.id === id) ?? MAPS[1];
}
