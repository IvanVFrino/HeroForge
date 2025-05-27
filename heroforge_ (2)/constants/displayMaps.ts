
import { AbilityScoreName, DamageType, ItemCategory } from '../types';

export const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = {
    Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
    Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
};

export const ABILITY_SCORE_ES_SHORT: Record<AbilityScoreName, string> = {
    Strength: "Fue", Dexterity: "Des", Constitution: "Con",
    Intelligence: "Int", Wisdom: "Sab", Charisma: "Car"
};

export const DAMAGE_TYPE_ES_MAP: Record<DamageType, string> = {
  Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'
};

export const ITEM_CATEGORY_ES: Record<ItemCategory, string> = {
  Weapon: 'Arma',
  Armor: 'Armadura',
  Miscellaneous: 'Misceláneo'
};

export const WEAPON_PROPERTY_ES: Record<string, string> = { // String key for flexibility if WeaponProperty type is too restrictive for some uses
  Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera',
  Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial',
  Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil'
};

export const ARMOR_TYPE_ES: Record<string, string> = { // String key for flexibility
  Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada'
};
