
// Basic Types
export type AbilityScoreName = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';
// Fix: Ensure ABILITY_SCORE_NAMES_ORDERED is exported
export const ABILITY_SCORE_NAMES_ORDERED: AbilityScoreName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

export type SkillName = 
  'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics' | 'Deception' | 'History' | 
  'Insight' | 'Intimidation' | 'Investigation' | 'Medicine' | 'Nature' | 'Perception' | 
  'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand' | 'Stealth' | 'Survival';
export type Alignment = 
  'Lawful Good' | 'Neutral Good' | 'Chaotic Good' | 
  'Lawful Neutral' | 'True Neutral' | 'Chaotic Neutral' | 
  'Lawful Evil' | 'Neutral Evil' | 'Chaotic Evil';
// Fix: Ensure ALIGNMENTS_LIST is exported
export const ALIGNMENTS_LIST: Alignment[] = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];


export type Size = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
// Fix: Ensure SIZES_LIST is exported
export const SIZES_LIST: Size[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export type Language = string; // e.g., "Common", "Elvish"

// Inventory Item Categories
export const ITEM_CATEGORIES = [
  'Weapon', 'Armor', 'Miscellaneous'
] as const;
export type ItemCategory = typeof ITEM_CATEGORIES[number];

// Item Specific Details
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
  damageDice: string; // e.g., "1d8", "2d6"
  damageType: DamageType;
  properties: WeaponProperty[];
  rangeNormal?: number; // For 'Range' or 'Thrown' property
  rangeLong?: number;   // For 'Range' or 'Thrown' property
  versatileDamage?: string; // e.g., "1d10" if 'Versatile'
}

export interface ArmorDetails {
  baseAC: number;
  addDexModifier: boolean;
  maxDexBonus?: number; // Relevant if addDexModifier is true and armor type is Medium
  armorType?: ArmorType; // Light, Medium, Heavy
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

// Character Parts
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
  source: string; // e.g. "Class", "Background", "Species", "ClassChoice"
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
  compatibleWeapons?: string[]; // Names of weapons
}

export interface CharacterWeaponMastery {
  weaponName: string; // e.g., "Longsword"
  masteryName: string; // e.g., "Cleave"
}

// Class related types
export interface ClassSpellcasting {
  ability: AbilityScoreName;
  knownCantrips?: number; // at level 1
  preparedSpells?: number; // at level 1
  spellSlotsLevel1?: number;
  spellList?: string[]; // list of available spell names
}

export interface StartingEquipmentItem {
  name: string;
  quantity: number;
  category?: ItemCategory; // Optional, can be derived
  description?: string;
  cost?: Item['cost']; // Re-use Item's cost type
  weight?: Item['weight']; // Re-use Item's weight type
  weaponDetails?: WeaponDetails;
  armorDetails?: ArmorDetails;
}

export interface EquipmentBundle {
    key: string; 
    description: string; 
    items: StartingEquipmentItem[]; 
    gold?: number; 
    isInstructional?: boolean; // Hint for UI rendering (e.g., "Choose one of the following:")
}

export interface DndClass {
  id: string; // e.g., "base-barbarian", "custom-chronomancer"
  name: string;
  hitDie: number; // e.g. 6 for d6, 8 for d8 etc.
  primaryAbilities: AbilityScoreName[];
  savingThrowProficiencies: AbilityScoreName[];
  armorProficiencies: string[]; // e.g. ["Light Armor", "Medium Armor", "Shields"]
  weaponProficiencies: string[]; // e.g. ["Simple Weapons", "Martial Weapons"]
  toolProficiencies?: { choices?: string[], count?: number, fixed?: string[] };
  skillProficiencies: { choices: SkillName[], count: number };
  startingEquipmentBundles?: EquipmentBundle[]; // Updated to use EquipmentBundle
  classFeaturesLevel1: Trait[];
  weaponMasteriesKnown?: number; // For martial classes
  spellcasting?: ClassSpellcasting;
  isCustom?: boolean;
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

export interface Item {
  id: string; 
  name: string;
  category: ItemCategory;
  description?: string;
  cost?: { quantity: number; unit: 'gp' | 'sp' | 'cp'; } | string; 
  weight?: { value: number; unit: 'lb'; } | string; 
  isCustom?: boolean;
  
  // Category-specific details
  weaponDetails?: WeaponDetails;
  armorDetails?: ArmorDetails;
}

export interface EquippedItem {
  instanceId: string; // Unique ID for this instance in the inventory
  definitionId: string; // Reference to the base Item.id (could be 'custom-adhoc-[timestamp]' or specific e.g. 'class-item-greataxe')
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

// Saved Character Core Data (for persistence)
export interface SavedCharacterCoreData {
  id: string; 
  characterName: string;
  playerName?: string;
  level: number;
  
  classId: string;
  backgroundId: string;
  speciesId: string;
  alignment?: Alignment;
  
  baseAbilityScores: AbilityScores; 
  backgroundAsiChoices?: Array<{ ability: AbilityScoreName; amount: number }>; 
  
  chosenClassSkillProficiencies?: SkillName[];
  chosenClassEquipmentBundleKey?: string; // For simple bundle choice
  chosenClassEquipmentSelections?: Record<string, string>; // For complex/grouped choices: groupKey -> optionKey
  
  chosenKnownCantrips?: string[];
  chosenPreparedSpells?: string[];

  equipment: EquippedItem[]; 
  gold?: number;

  notes?: string; 
}


// Character Sheet (Active in creator)
export interface CharacterSheet {
  name: string;
  playerName?: string;
  class?: DndClass;
  level: number;
  background?: DndBackground;
  species?: DndSpecies;
  alignment?: Alignment;
  
  abilityScores: AbilityScores; 
  abilityScoreModifiers: AbilityScoreModifiers;
  
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
    chosenClassEquipmentSelections?: Record<string, string>; // Added
  };
}

export type CharacterAction =
  | { type: 'RESET_CHARACTER_SHEET'; payload?: { 
        coreData: SavedCharacterCoreData; 
        customData?: { 
            classes?: DndClass[]; 
            species?: DndSpecies[]; 
            backgrounds?: DndBackground[]; 
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
  | { type: 'ADD_INVENTORY_ITEM'; payload: { itemDetails: Omit<EquippedItem, 'instanceId' | 'quantity' | 'definitionId'> & { definitionId?: string }; quantity: number; source?: EquippedItem['source'] } }
  | { type: 'REMOVE_INVENTORY_ITEM'; payload: { instanceId: string } }
  | { type: 'UPDATE_INVENTORY_ITEM_QUANTITY'; payload: { instanceId: string; newQuantity: number } }
  | { type: 'CHOOSE_CLASS_EQUIPMENT_BUNDLE'; payload: { bundleKey: string } }
  | { type: 'APPLY_CLASS_EQUIPMENT_CHOICES'; payload: { chosenItems: StartingEquipmentItem[], totalGold: number, selections: Record<string, string> } };


export interface CharacterContextState {
  character: CharacterSheet;
  dispatch: React.Dispatch<CharacterAction>;
}

// NPC / Monster Data
export interface NPCData {
  id: string;
  name: string;
  isCustom?: boolean;
  size: Size;
  type: string; // e.g., "Humanoid (human)", "Beast", "Fiend (devil)"
  alignment: Alignment;
  
  armorClass: number;
  acType?: string; // e.g., "Natural armor", "(Shield)", "Studded Leather"
  hitPoints: number;
  hitDice: string; // e.g., "4d8 + 4"
  
  speed: string; // e.g., "30 ft., fly 60 ft."
  
  abilityScores: AbilityScores;
  
  savingThrows?: Partial<Record<AbilityScoreName, number>>; // Modifier only, e.g., { Dexterity: 5, Wisdom: 3 }
  skills?: Partial<Record<SkillName, number>>; // Modifier only, e.g., { Stealth: 7, Perception: 5 }
  
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  
  senses?: string; // e.g., "Darkvision 60 ft., Passive Perception 12"
  languages?: string; // e.g., "Common, Elvish"
  
  challengeRating: string; // e.g., "1/4", "5"
  xp?: number; // Experience points
  
  specialAbilities?: Trait[];
  actions?: Trait[];
  reactions?: Trait[];
  legendaryActions?: Trait[];
  lairActions?: Trait[];
  
  description?: string; // General description, lore, appearance
  source?: string; // e.g., "Monster Manual", "Custom"
}

export interface ParsedNpcAttackActionDetails {
  bonus: number;
  reach?: string;
  range?: string;
  target?: string;
}

export interface ParsedNpcDamageDetails {
  averageDamage?: number;
  diceString: string; // e.g., "1d8+3"
  damageType: string; // Should ideally be DamageType, but parser might get other strings
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
  savingThrow?: SavingThrowDetails; // Added for save-based actions
}


// HeroForge Global Data Context
export interface HeroForgeData {
  characters: SavedCharacterCoreData[];
  customSpecies: DndSpecies[];
  customClasses: DndClass[];
  customBackgrounds: DndBackground[];
  customItems: Array<Omit<Item, 'quantity'>>; 
  customNPCs: NPCData[]; 
}

export type HeroForgeAction =
  | { type: 'LOAD_DATA'; payload: HeroForgeData }
  | { type: 'ADD_CHARACTER'; payload: SavedCharacterCoreData }
  | { type: 'UPDATE_CHARACTER'; payload: SavedCharacterCoreData }
  | { type: 'DELETE_CHARACTER'; payload: string } 
  | { type: 'UPDATE_CHARACTER_INVENTORY'; payload: { characterId: string; newEquipment: EquippedItem[] } }
  // Custom Content Add Actions
  | { type: 'ADD_CUSTOM_ITEM'; payload: Omit<Item, 'id' | 'isCustom' | 'quantity'> }
  | { type: 'ADD_CUSTOM_SPECIES'; payload: Omit<DndSpecies, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_CLASS'; payload: Omit<DndClass, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_BACKGROUND'; payload: Omit<DndBackground, 'id' | 'isCustom'> }
  | { type: 'ADD_CUSTOM_NPC'; payload: Omit<NPCData, 'id' | 'isCustom'> }
  // Custom Content Delete Actions
  | { type: 'DELETE_CUSTOM_ITEM'; payload: string } // ID of the item to delete
  | { type: 'DELETE_CUSTOM_SPECIES'; payload: string } // ID of the species
  | { type: 'DELETE_CUSTOM_CLASS'; payload: string } // ID of the class
  | { type: 'DELETE_CUSTOM_BACKGROUND'; payload: string } // ID of the background
  | { type: 'DELETE_CUSTOM_NPC'; payload: string } // ID of the NPC
  ;

export interface HeroForgeContextState {
  data: HeroForgeData;
  dispatch: React.Dispatch<HeroForgeAction>;
}