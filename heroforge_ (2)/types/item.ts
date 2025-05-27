// types/item.ts

export const ITEM_CATEGORIES = [
  'Weapon', 'Armor', 'Miscellaneous'
] as const;
export type ItemCategory = typeof ITEM_CATEGORIES[number];

export const DAMAGE_TYPES_CONST = [
    'Slashing', 'Piercing', 'Bludgeoning', 'Fire', 'Cold', 'Acid', 'Poison', 
    'Radiant', 'Necrotic', 'Lightning', 'Thunder', 'Force', 'Psychic'
] as const;
export type DamageType = typeof DAMAGE_TYPES_CONST[number];

export const WEAPON_PROPERTIES_CONST = [
    'Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Range', 
    'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile'
] as const;
export type WeaponProperty = typeof WEAPON_PROPERTIES_CONST[number];

export const ARMOR_TYPES_CONST = ['Light', 'Medium', 'Heavy'] as const;
export type ArmorType = typeof ARMOR_TYPES_CONST[number];

export interface WeaponDetails {
  damageDice: string; 
  damageType: DamageType;
  properties: WeaponProperty[];
  rangeNormal?: number; 
  rangeLong?: number;   
  versatileDamage?: string; 
}

export interface ArmorDetails {
  baseAC?: number; 
  addDexModifier?: boolean;
  maxDexBonus?: number; 
  armorType?: ArmorType; 
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

export interface Item {
  id: string; 
  name: string;
  category: ItemCategory;
  description?: string;
  cost?: { quantity: number; unit: 'gp' | 'sp' | 'cp'; } | string; 
  weight?: { value: number; unit: 'lb'; } | string; 
  isCustom?: boolean;
  
  weaponDetails?: WeaponDetails;
  armorDetails?: ArmorDetails;
}

export interface EquippedItem {
  instanceId: string; 
  definitionId: string; 
  name: string;
  category: ItemCategory;
  quantity: number;
  description?: string; 
  cost?: Item['cost']; 
  weight?: Item['weight']; 
  weaponDetails?: WeaponDetails; 
  armorDetails?: ArmorDetails; 
  equipped?: boolean; 
  attunement?: boolean; 
  source?: 'ClassEquipment' | 'BackgroundEquipment' | 'CustomAddedCreator' | 'CustomAddedSheet';
}

export interface StartingEquipmentItem {
  name: string;
  quantity: number;
  category?: ItemCategory; 
  description?: string;
  cost?: Item['cost']; 
  weight?: Item['weight']; 
  weaponDetails?: WeaponDetails;
  armorDetails?: ArmorDetails;
}

export interface EquipmentBundle {
    key: string; 
    description: string; 
    items: StartingEquipmentItem[]; 
    gold?: number; 
    isInstructional?: boolean; 
}