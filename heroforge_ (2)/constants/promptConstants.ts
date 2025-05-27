
// constants/promptConstants.ts
// This file is to avoid direct complex type imports into prompt string generation files,
// which might be problematic for some environments or if prompts are stored/processed differently.

import { SKILL_DEFINITIONS } from './skills'; // Assuming this path is correct relative to constants dir
import { ITEM_CATEGORIES as ITEM_CATEGORIES_TYPE, DAMAGE_TYPES_CONST, WEAPON_PROPERTIES_CONST, ARMOR_TYPES_CONST } from '../types'; // These are simple arrays/consts

export const HIT_DICE_OPTIONS = [4, 6, 8, 10, 12];
export const ALL_SKILL_NAMES_OBJECT = SKILL_DEFINITIONS.map(skill => ({ name: skill.name, nombre: skill.nombre }));

export const ITEM_CATEGORIES = [...ITEM_CATEGORIES_TYPE];
export const DAMAGE_TYPES_LIST = [...DAMAGE_TYPES_CONST];
export const WEAPON_PROPERTIES_LIST = [...WEAPON_PROPERTIES_CONST];
export const ARMOR_TYPES_LIST = [...ARMOR_TYPES_CONST];
