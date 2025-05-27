
// constants/standardEquipment.ts
import { ItemCategory, WeaponDetails, ArmorDetails, StartingEquipmentItem, DamageType } from '../types';

export interface StandardItemData extends Omit<StartingEquipmentItem, 'name' | 'quantity'> {
  id: string; // Canonical definition ID for the standard item
  name: string; // Make name non-optional for lookup
}

export const STANDARD_EQUIPMENT_STATS: StandardItemData[] = [
  // Armor
  {
    id: "std-shield",
    name: "Shield",
    category: "Armor",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 6, unit: 'lb' },
    armorDetails: {
      baseAC: 2,
      addDexModifier: false,
      stealthDisadvantage: false,
    }
  },
  {
    id: "std-escudo", // Spanish alias for Shield
    name: "Escudo",
    category: "Armor",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 6, unit: 'lb' },
    armorDetails: {
      baseAC: 2,
      addDexModifier: false,
      stealthDisadvantage: false,
    }
  },
  {
    id: "std-leather-armor",
    name: "Leather Armor",
    category: "Armor",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 10, unit: 'lb' },
    armorDetails: {
      baseAC: 11,
      addDexModifier: true,
      armorType: "Light",
    }
  },
  {
    id: "std-armadura-de-cuero", // Spanish alias for Leather Armor
    name: "Armadura de Cuero",
    category: "Armor",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 10, unit: 'lb' },
    armorDetails: {
      baseAC: 11,
      addDexModifier: true,
      armorType: "Light",
    }
  },
  // Weapons
  {
    id: "std-dagger",
    name: "Dagger",
    category: "Weapon",
    cost: { quantity: 2, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d4",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse", "Light", "Thrown"],
      rangeNormal: 20,
      rangeLong: 60,
    }
  },
   {
    id: "std-daga", // Spanish alias
    name: "Daga",
    category: "Weapon",
    cost: { quantity: 2, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d4",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse", "Light", "Thrown"],
      rangeNormal: 20,
      rangeLong: 60,
    }
  },
  {
    id: "std-greataxe",
    name: "Greataxe",
    category: "Weapon",
    cost: { quantity: 30, unit: 'gp'},
    weight: { value: 7, unit: 'lb'},
    weaponDetails: {
      damageDice: "1d12",
      damageType: "Slashing" as DamageType,
      properties: ["Heavy", "Two-Handed"],
    }
  },
  {
    id: "std-handaxe",
    name: "Handaxe",
    category: "Weapon",
    cost: { quantity: 5, unit: 'gp'},
    weight: { value: 2, unit: 'lb'},
    weaponDetails: {
        damageDice: "1d6",
        damageType: "Slashing" as DamageType,
        properties: ["Light", "Thrown"],
        rangeNormal: 20,
        rangeLong: 60,
    }
  },
  {
    id: "std-rapier",
    name: "Rapier",
    category: "Weapon",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d8",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse"],
    }
  },
  {
    id: "std-estoque", // Spanish alias
    name: "Estoque",
    category: "Weapon",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d8",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse"],
    }
  },
  {
    id: "std-shortsword",
    name: "Shortsword",
    category: "Weapon",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d6",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse", "Light"],
    }
  },
  {
    id: "std-espada-corta", // Spanish alias
    name: "Espada Corta",
    category: "Weapon",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d6",
      damageType: "Piercing" as DamageType,
      properties: ["Finesse", "Light"],
    }
  },
  {
    id: "std-shortbow",
    name: "Shortbow",
    category: "Weapon",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d6",
      damageType: "Piercing" as DamageType,
      properties: ["Ammunition", "Range", "Two-Handed"],
      rangeNormal: 80,
      rangeLong: 320,
    }
  },
  {
    id: "std-arco-corto", // Spanish alias
    name: "Arco Corto",
    category: "Weapon",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    weaponDetails: {
      damageDice: "1d6",
      damageType: "Piercing" as DamageType,
      properties: ["Ammunition", "Range", "Two-Handed"],
      rangeNormal: 80,
      rangeLong: 320,
    }
  },
  // Miscellaneous & Packs
  {
    id: "std-quiver",
    name: "Quiver",
    category: "Miscellaneous",
    cost: { quantity: 1, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    description: "Holds up to 20 arrows or bolts."
  },
  {
    id: "std-carcaj", // Spanish alias
    name: "Carcaj",
    category: "Miscellaneous",
    cost: { quantity: 1, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    description: "Puede contener hasta 20 flechas o virotes."
  },
  {
    id: "std-arrows-20", // Example for the bundle, but quiver is the main item
    name: "Arrows (20)",
    category: "Miscellaneous", // Ammunition often is misc or a sub-category of weapon
    cost: { quantity: 1, unit: 'gp' }, // For 20 arrows
    weight: { value: 1, unit: 'lb' }, // For 20 arrows
    description: "A bundle of 20 arrows."
  },
  {
    id: "std-flechas-20", // Spanish alias
    name: "Flechas (20)",
    category: "Miscellaneous",
    cost: { quantity: 1, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    description: "Un paquete de 20 flechas."
  },
  {
    id: "std-thieves-tools",
    name: "Thieves' Tools",
    category: "Miscellaneous",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    description: "This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers."
  },
  {
    id: "std-herramientas-ladron", // Spanish alias
    name: "Herramientas de Ladrón",
    category: "Miscellaneous",
    cost: { quantity: 25, unit: 'gp' },
    weight: { value: 1, unit: 'lb' },
    description: "Este conjunto de herramientas incluye una pequeña lima, un juego de ganzúas, un pequeño espejo montado en un mango de metal, un juego de tijeras de hojas estrechas y un par de alicates."
  },
  {
    id: "std-explorers-pack",
    name: "Explorer's Pack",
    category: "Miscellaneous",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 59, unit: 'lb' },
    description: "Includes a backpack, a bedroll, a mess kit, a tinderbox, 10 torches, 10 days of rations, and a waterskin. The pack also has 50 feet of hempen rope strapped to the side of it."
  },
  {
    id: "std-paquete-explorador", // Spanish alias
    name: "Paquete de Explorador",
    category: "Miscellaneous",
    cost: { quantity: 10, unit: 'gp' },
    weight: { value: 59, unit: 'lb' },
    description: "Incluye una mochila, un saco de dormir, un petate, una caja de yesca, 10 antorchas, 10 días de raciones y un odre. El paquete también tiene 50 pies de cuerda de cáñamo atada a un lado."
  },
  {
    id: "std-dungeoneers-pack",
    name: "Dungeoneer's Pack",
    category: "Miscellaneous",
    cost: { quantity: 12, unit: 'gp' },
    weight: { value: 61.5, unit: 'lb' }, // Weight can vary based on exact contents
    description: "Includes a backpack, a crowbar, a hammer, 10 pitons, 10 torches, a tinderbox, 10 days of rations, and a waterskin. The pack also has 50 feet of hempen rope."
  },
  {
    id: "std-paquete-dungeonero", // Spanish alias
    name: "Paquete de Dungeonero",
    category: "Miscellaneous",
    cost: { quantity: 12, unit: 'gp' },
    weight: { value: 61.5, unit: 'lb' },
    description: "Incluye una mochila, una palanca, un martillo, 10 pitones, 10 antorchas, una caja de yesca, 10 días de raciones y un odre. El paquete también tiene 50 pies de cuerda de cáñamo."
  },
  {
    id: "std-burglars-pack",
    name: "Burglar's Pack",
    category: "Miscellaneous",
    cost: { quantity: 16, unit: 'gp' },
    weight: { value: 47.5, unit: 'lb' }, // Weight can vary
    description: "Includes a backpack, a bag of 1,000 ball bearings, 10 feet of string, a bell, 5 candles, a crowbar, a hammer, 10 pitons, a hooded lantern, 2 flasks of oil, 5 days rations, a tinderbox, and a waterskin. The pack also has 50 feet of hempen rope."
  },
  {
    id: "std-paquete-ladron", // Spanish alias
    name: "Paquete de Ladrón",
    category: "Miscellaneous",
    cost: { quantity: 16, unit: 'gp' },
    weight: { value: 47.5, unit: 'lb' },
    description: "Incluye una mochila, una bolsa con 1,000 rodamientos de bolas, 10 pies de cuerda, una campana, 5 velas, una palanca, un martillo, 10 pitones, una linterna con capucha, 2 frascos de aceite, 5 días de raciones, una caja de yesca y un odre. El paquete también tiene 50 pies de cuerda de cáñamo."
  },
  {
    id: "std-lute",
    name: "Lute", 
    category: "Miscellaneous",
    cost: { quantity: 35, unit: 'gp' },
    weight: { value: 2, unit: 'lb' },
    description: "A musical instrument."
  },
  {
    id: "std-artists-pack",
    name: "Artist's Pack", 
    category: "Miscellaneous",
    cost: { quantity: 10, unit: 'gp' }, 
    weight: { value: 12, unit: 'lb'}, 
    description: "Includes a backpack, a bedroll, 2 costumes, 5 candles, 5 days of rations, a waterskin, and a disguise kit."
  },
  { id: "std-holy-symbol", name: "A holy symbol (a gift to you when you entered the priesthood)", category: "Miscellaneous", cost: {quantity: 5, unit: 'gp'}, weight: {value: 1, unit: 'lb'} },
  { id: "std-prayer-book", name: "A prayer book or prayer wheel", category: "Miscellaneous", cost: {quantity:5, unit: 'gp'}, weight: {value:5, unit: 'lb'} },
  { id: "std-incense-sticks", name: "5 sticks of incense", category: "Miscellaneous", cost: {quantity:1, unit: 'cp' }, weight: {value:0, unit: 'lb'} },
  { id: "std-vestments", name: "Vestments", category: "Miscellaneous", cost: {quantity:5, unit: 'gp'}, weight: {value:4, unit: 'lb'} },
  { id: "std-common-clothes", name: "A set of common clothes", category: "Miscellaneous", cost: {quantity:5, unit: 'sp'}, weight: {value:3, unit: 'lb'} },
  { id: "std-artisan-tools", name: "A set of artisan's tools (one of your choice)", category: "Miscellaneous", cost: {quantity:15, unit: 'gp' }, weight: {value:5, unit: 'lb' } },
  { id: "std-guild-letter", name: "A letter of introduction from your guild", category: "Miscellaneous", cost: {quantity:0, unit: 'cp'}, weight: {value:0, unit: 'lb'} },
  { id: "std-travelers-clothes", name: "A set of traveler's clothes", category: "Miscellaneous", cost: {quantity:2, unit: 'gp'}, weight: {value:4, unit: 'lb'} }
];

export const getStandardItemDetails = (itemName: string): Partial<StandardItemData> => {
  const found = STANDARD_EQUIPMENT_STATS.find(item => item.name.toLowerCase() === itemName.toLowerCase());
  if (found) {
    return { ...found };
  }
  // Attempt a partial match if full name isn't found, e.g., "Dagger" from "Two Daggers"
  const partialMatch = STANDARD_EQUIPMENT_STATS.find(item => itemName.toLowerCase().includes(item.name.toLowerCase()));
  if (partialMatch) {
    return { ...partialMatch };
  }
  return {};
};