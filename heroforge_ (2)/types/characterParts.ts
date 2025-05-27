
// types/characterParts.ts
import { AbilityScoreName } from "./common";
import { ParsedNpcAttackAction } from "./npc";

export interface AbilityScores {
  Strength: number;
  Dexterity: number;
  Constitution: number;
  Intelligence: number;
  Wisdom: number;
  Charisma: number;
}

export interface AbilityScoreModifiers {
  Strength: number;
  Dexterity: number;
  Constitution: number;
  Intelligence: number;
  Wisdom: number;
  Charisma: number;
}

export interface Proficiency {
  name: string;
  type: 'skill' | 'tool' | 'weapon' | 'armor' | 'savingThrow' | 'language';
  source: string; 
}

export interface Trait {
  name: string;
  description: string;
  source?: string;
  parsedAttack?: ParsedNpcAttackAction; 
}

export interface Feat extends Trait {}

export interface WeaponMasteryInfo {
  name: string;
  description: string;
  compatibleWeapons?: string[]; 
}

export interface CharacterWeaponMastery {
  weaponName: string; 
  masteryName: string; 
}
