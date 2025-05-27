
// types/characterSheet.ts
import { 
    AbilityScoreName, SkillName, Alignment, AbilityScores as BaseAbilityScores, Proficiency,
    Trait, CharacterWeaponMastery, EquippedItem 
} from "./index"; // Assuming types.ts will re-export these from sub-files
import { DndClass, DndBackground, DndSpecies } from "./dndContent";
import { SavedCharacterCoreData } from "./context";


export interface CharacterSheet {
  name: string;
  playerName?: string;
  class?: DndClass;
  subclassId?: string; 
  subclassName?: string; 
  level: number;
  background?: DndBackground;
  species?: DndSpecies;
  alignment?: Alignment;
  
  abilityScores: BaseAbilityScores; 
  abilityScoreModifiers: BaseAbilityScores; // Re-using for modifiers type
  
  maxHp: number;
  currentHp: number;
  temporaryHp: number;
  
  armorClass: number;
  initiative: number;
  speed: number;
  
  proficiencyBonus: number;
  proficiencies: Proficiency[];
  
  savingThrows: { [key in AbilityScoreName]?: { value: number, proficient: boolean } };
  skills: { [key in SkillName]?: { value: number, proficient: boolean, ability: AbilityScoreName } };
  
  passivePerception: number;
  
  hitDice: { total: number, type: number, remaining: number };
  
  attacksAndSpellcasting: any[]; 
  equipment: EquippedItem[]; 
  gold: number;

  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;

  featuresAndTraits: Trait[];
  weaponMasteries: CharacterWeaponMastery[];
  
  spellcastingAbility?: AbilityScoreName;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  knownCantrips: string[]; 
  preparedSpells: string[]; 
  spellSlots: { [level: string]: { total: number, used: number } }; 

  _savedCoreDataHelper?: Partial<SavedCharacterCoreData> & { 
    chosenClassEquipmentBundleKey?: string; 
    chosenClassEquipmentSelections?: Record<string, string>; 
  };
}
