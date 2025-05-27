
// types/context.ts
import { AbilityScoreName, SkillName, Alignment } from "./types/common";
import { AbilityScores, Proficiency, CharacterWeaponMastery, WeaponDetails, ArmorDetails } from "./types/characterParts"; // Added WeaponDetails, ArmorDetails
import { EquippedItem, Item, StartingEquipmentItem } from "./types/item";
import { CharacterSheet } from "./types/characterSheet";
import { DndClass, DndSpecies, DndBackground, SubclassDefinition } from "./types/dndContent";
import { NPCData } from "./types/npc";
import { SpellDefinition } from "./types/spell";


// Saved Character Core Data (for persistence)
export interface SavedCharacterCoreData {
  id: string; 
  characterName: string;
  playerName?: string;
  level: number;
  
  classId: string;
  subclassId?: string; 
  subclassName?: string; 
  backgroundId: string;
  speciesId: string;
  alignment?: Alignment;
  
  baseAbilityScores: AbilityScores; 
  backgroundAsiChoices?: Array<{ ability: AbilityScoreName; amount: number }>; 
  
  chosenClassSkillProficiencies?: SkillName[];
  chosenClassEquipmentBundleKey?: string; 
  chosenClassEquipmentSelections?: Record<string, string>; 
  
  knownCantrips?: string[]; 
  preparedSpells?: string[]; 
  spellSlotsUsed?: Record<string, number>;

  equipment: EquippedItem[]; 
  gold?: number;
  notes?: string; 
  maxHp: number; // Added for HP persistence
  currentHp: number; // Added for HP persistence
}

export type CharacterAction =
  | { type: 'RESET_CHARACTER_SHEET'; payload?: { 
        coreData: SavedCharacterCoreData; 
        customData?: { 
            classes?: DndClass[]; 
            species?: DndSpecies[]; 
            backgrounds?: DndBackground[];
            subclasses?: SubclassDefinition[]; 
        } 
      } | SavedCharacterCoreData 
    }
  | { type: 'SET_CLASS'; payload: DndClass }
  | { type: 'SET_BACKGROUND'; payload: DndBackground }
  | { type: 'SET_SPECIES'; payload: DndSpecies }
  | { type: 'SET_BASE_ABILITY_SCORES'; payload: AbilityScores } 
  | { type: 'APPLY_BACKGROUND_ASIS'; payload: { choices: Array<{ ability: AbilityScoreName; amount: number }> } }
  | { type: 'SET_ALIGNMENT'; payload: Alignment }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'ADD_PROFICIENCY'; payload: Proficiency }
  | { type: 'REMOVE_PROFICIENCY'; payload: { name: string; type: Proficiency['type']; source: string } } 
  | { type: 'SET_GOLD'; payload: number }
  | { type: 'UPDATE_CHARACTER_DETAILS'; payload: Partial<CharacterSheet> } 
  | { type: 'RECALCULATE_DERIVED_STATS' }
  | { type: 'CHOOSE_CLASS_SKILL'; payload: SkillName }
  | { type: 'UNCHOOSE_CLASS_SKILL'; payload: SkillName }
  | { type: 'ADD_WEAPON_MASTERY'; payload: CharacterWeaponMastery }
  | { type: 'SET_LANGUAGES'; payload: string[] } 
  | { type: 'SET_SPELLCASTING_DETAILS'; payload: { ability?: AbilityScoreName, saveDC?: number, attackBonus?: number, knownCantrips?: string[], preparedSpells?: string[], spellSlots?: CharacterSheet['spellSlots'] } }
  | { type: 'UPDATE_SAVED_CORE_DATA_HELPER'; payload: Partial<SavedCharacterCoreData> }
  | { 
      type: 'ADD_INVENTORY_ITEM'; 
      payload: { 
        itemDetails: { 
            name: string; 
            category?: EquippedItem['category']; 
            description?: string; 
            cost?: Item['cost']; 
            weight?: Item['weight']; 
            weaponDetails?: WeaponDetails; 
            armorDetails?: ArmorDetails; 
            equipped?: boolean; 
            attunement?: boolean;
            definitionId?: string; 
        }; 
        quantity: number; 
        source?: EquippedItem['source'];
      } 
    }
  | { type: 'REMOVE_INVENTORY_ITEM'; payload: { instanceId: string } }
  | { type: 'UPDATE_INVENTORY_ITEM_QUANTITY'; payload: { instanceId: string; newQuantity: number } }
  | { type: 'CHOOSE_CLASS_EQUIPMENT_BUNDLE'; payload: { bundleKey: string } }
  | { type: 'APPLY_CLASS_EQUIPMENT_CHOICES'; payload: { chosenItems: StartingEquipmentItem[], totalGold: number, selections: Record<string, string> } };

export interface CharacterContextState {
  character: CharacterSheet;
  dispatch: React.Dispatch<CharacterAction>;
}

// HeroForge Global Data Context
export interface HeroForgeData {
  characters: SavedCharacterCoreData[];
  customSpecies: DndSpecies[];
  customClasses: DndClass[];
  customSubclasses: SubclassDefinition[]; 
  customBackgrounds: DndBackground[];
  customItems: Item[]; 
  customNPCs: NPCData[]; 
  customSpells: SpellDefinition[]; 
}

export type HeroForgeAction =
  | { type: 'LOAD_DATA'; payload: HeroForgeData }
  | { type: 'ADD_CHARACTER'; payload: SavedCharacterCoreData }
  | { type: 'UPDATE_CHARACTER'; payload: SavedCharacterCoreData }
  | { type: 'DELETE_CHARACTER'; payload: string } 
  | { type: 'UPDATE_CHARACTER_INVENTORY'; payload: { characterId: string; newEquipment: EquippedItem[] } }
  // Add Custom Content
  | { type: 'ADD_CUSTOM_ITEM'; payload: Omit<Item, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_SPECIES'; payload: Omit<DndSpecies, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_CLASS'; payload: Omit<DndClass, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_SUBCLASS'; payload: Omit<SubclassDefinition, 'id' | 'isCustom'> } 
  | { type: 'ADD_CUSTOM_BACKGROUND'; payload: Omit<DndBackground, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_NPC'; payload: Omit<NPCData, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_SPELL'; payload: Omit<SpellDefinition, 'id' | 'isCustom'> } 
  // Update Custom Content
  | { type: 'UPDATE_CUSTOM_ITEM'; payload: Item }
  | { type: 'UPDATE_CUSTOM_SPECIES'; payload: DndSpecies }
  | { type: 'UPDATE_CUSTOM_CLASS'; payload: DndClass }
  | { type: 'UPDATE_CUSTOM_SUBCLASS'; payload: SubclassDefinition }
  | { type: 'UPDATE_CUSTOM_BACKGROUND'; payload: DndBackground }
  | { type: 'UPDATE_CUSTOM_NPC'; payload: NPCData }
  | { type: 'UPDATE_CUSTOM_SPELL'; payload: SpellDefinition }
  // Delete Custom Content
  | { type: 'DELETE_CUSTOM_ITEM'; payload: string } 
  | { type: 'DELETE_CUSTOM_SPECIES'; payload: string } 
  | { type: 'DELETE_CUSTOM_CLASS'; payload: string } 
  | { type: 'DELETE_CUSTOM_SUBCLASS'; payload: string } 
  | { type: 'DELETE_CUSTOM_BACKGROUND'; payload: string } 
  | { type: 'DELETE_CUSTOM_NPC'; payload: string } 
  | { type: 'DELETE_CUSTOM_SPELL'; payload: string } 
  ;

export interface HeroForgeContextState {
  data: HeroForgeData;
  dispatch: React.Dispatch<HeroForgeAction>;
}
