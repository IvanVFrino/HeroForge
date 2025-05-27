
// types/npc.ts
import { Size, Alignment, AbilityScoreName, SkillName } from "./common";
import { AbilityScores, Trait } from "./characterParts";

export interface NPCData {
  id: string;
  name: string;
  isCustom?: boolean;
  size: Size;
  type: string; 
  alignment: Alignment;
  
  armorClass: number;
  acType?: string; 
  hitPoints: number;
  hitDice: string; 
  
  speed: string; 
  
  abilityScores: AbilityScores;
  
  savingThrows?: Partial<Record<AbilityScoreName, number>>; 
  skills?: Partial<Record<SkillName, number>>; 
  
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  
  senses?: string; 
  languages?: string; 
  
  challengeRating: string; 
  xp?: number; 
  
  specialAbilities?: Trait[];
  actions?: Trait[];
  reactions?: Trait[];
  legendaryActions?: Trait[];
  lairActions?: Trait[];
  
  description?: string; 
  source?: string; 
}

export interface ParsedNpcAttackActionDetails {
  bonus: number;
  reach?: string;
  range?: string;
  target?: string;
}

export interface ParsedNpcDamageDetails {
  averageDamage?: number;
  diceString: string; 
  damageType: string; 
  fullText: string;
}

export interface SavingThrowDetails {
  dc: number;
  ability: AbilityScoreName;
}

export interface ParsedNpcAttackAction {
  attack?: ParsedNpcAttackActionDetails;
  hit?: ParsedNpcDamageDetails;
  versatile?: ParsedNpcDamageDetails;
  savingThrow?: SavingThrowDetails; 
}
