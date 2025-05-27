// types/spell.ts
import { AbilityScoreName } from "./common";
import { DamageType } from "./item"; // Corrected import path for DamageType

export const SPELL_SCHOOL_NAMES = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Universal'
] as const;
export type SpellSchoolName = typeof SPELL_SCHOOL_NAMES[number];

export interface SpellComponentDetails {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialDescription?: string;
}

export interface SpellDefinition {
  id: string; 
  name: string;
  level: number; 
  school: SpellSchoolName;
  castingTime?: string;
  range?: string;
  components?: SpellComponentDetails;
  duration?: string;
  description: string;
  higherLevelDescription?: string;
  requiresAttackRoll?: boolean;
  requiresSavingThrow?: boolean;
  savingThrowAbility?: AbilityScoreName;
  damageType?: DamageType; 
  isCustom?: boolean;
}

export interface CharacterSpellReference {
  spellId: string; 
}