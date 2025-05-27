
// types/dndContent.ts
import { AbilityScoreName, SkillName, Size, Language } from "./common";
import { Trait } from "./characterParts";
import { StartingEquipmentItem, EquipmentBundle } from "./item";

// Class related types
export interface ClassSpellcastingProgressionEntry {
  cantripsKnown?: number;
  spellsKnown?: number; 
  spellSlots: number[]; 
}

export interface ClassSpellcasting {
  ability: AbilityScoreName;
  preparationType: 'known' | 'prepared'; 
  spellList?: string[]; 
  progression: Record<number, ClassSpellcastingProgressionEntry>; 
}

export interface DndClass {
  id: string; 
  name: string;
  hitDie: number; 
  primaryAbilities: AbilityScoreName[];
  savingThrowProficiencies: AbilityScoreName[];
  armorProficiencies: string[]; 
  weaponProficiencies: string[]; 
  toolProficiencies?: { choices?: string[], count?: number, fixed?: string[] };
  skillProficiencies: { choices: SkillName[], count: number };
  startingEquipmentBundles?: EquipmentBundle[];
  classFeaturesByLevel: Record<number, Trait[]>; 
  subclassChoiceLevel: number;
  availableSubclassIds: string[];
  weaponMasteriesKnown?: number; 
  spellcasting?: ClassSpellcasting;
  isCustom?: boolean;
}

// Subclass Definition
export interface SubclassDefinition {
  id: string;
  name: string;
  description: string;
  parentClassId: string; 
  featuresByLevel: Record<number, Trait[]>; 
  spellcastingAugments?: Partial<ClassSpellcasting>; 
  isCustom: boolean;
}

// Background related types
export interface BackgroundASI {
  options: AbilityScoreName[]; 
}
export interface DndBackground {
  id: string;
  name: string;
  skillProficiencies: SkillName[];
  toolProficiencies?: string[]; 
  languages?: string[];
  startingEquipment: { items: StartingEquipmentItem[], gold: number };
  originFeat: string; 
  asi: BackgroundASI;
  isCustom?: boolean;
}

// Species related types
export interface DndSpecies {
  id: string;
  name: string;
  size: Size;
  speed: number; 
  languages: Language[]; 
  traits: Trait[];
  isCustom?: boolean;
}
