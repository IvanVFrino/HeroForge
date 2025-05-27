
// utils/characterSheetInitializer.ts
import { 
  CharacterSheet, SavedCharacterCoreData, DndClass, DndBackground, DndSpecies, 
  AbilityScores, ItemCategory, ITEM_CATEGORIES
} from '../types';
import { SKILL_DEFINITIONS } from '../constants/skills';
import { calculateAbilityModifier, calculateAllDerivedStats } from './characterCalculations';
import { reconstructSheetFromCoreData } from './characterConverter';
import { CLASSES_DATA } from '../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../constants/dndBackgrounds';
import { SPECIES_DATA } from '../constants/dndSpecies';

const initialAbilityScores: AbilityScores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

export const determineCategoryFromName = (itemName: string): ItemCategory => {
    const nameLower = itemName.toLowerCase();
    const weaponKeywords = [
        'sword', 'axe', 'dagger', 'bow', 'mace', 'hammer', 'spear', 'sling', 'club', 'scimitar', 'rapier', 'javelin', 'handaxe', 'greataxe', 'greatsword', 'shortbow', 'longbow', 'dart', 'staff', 'quarterstaff', 'warhammer', 'morningstar', 'flail', 'trident', 'whip', 'blowgun', 'net', 'crossbow',
        'espada', 'hacha', 'daga', 'arco', 'maza', 'martillo', 'lanza', 'honda', 'garrote', 'cimitarra', 'estoque', 'jabalina', 'baculo', 'ballesta', 'rodela'
    ];
    if (weaponKeywords.some(keyword => nameLower.includes(keyword))) {
        return 'Weapon';
    }
    const armorKeywords = [
        'armor', 'plate', 'mail', 'leather', 'shield', 'padded', 'chain', 'breastplate', 'half plate', 'ring mail', 'scale mail', 'splint',
        'armadura', 'placas', 'malla', 'cuero', 'escudo', 'acolchada', 'cota', 'coraza', 'media placa', 'anillas', 'escamas'
    ];
    if (armorKeywords.some(keyword => nameLower.includes(keyword))) {
        return 'Armor';
    }
    if (nameLower.includes('pack') || nameLower.includes('kit') || nameLower.includes("thieves' tools") || nameLower.includes("herramientas de ladrón")) {
        return 'Miscellaneous'; 
    }
    return 'Miscellaneous';
};

export const createInitialCharacterSheet = (
  coreData?: SavedCharacterCoreData,
  customData?: {
    classes?: DndClass[];
    species?: DndSpecies[];
    backgrounds?: DndBackground[];
  }
): CharacterSheet => {
  if (coreData) {
    const allClassesToSearch = [...CLASSES_DATA, ...(customData?.classes || [])];
    const allBackgroundsToSearch = [...BACKGROUNDS_DATA, ...(customData?.backgrounds || [])];
    const allSpeciesToSearch = [...SPECIES_DATA, ...(customData?.species || [])];
    
    const reconstructedSheet = reconstructSheetFromCoreData(coreData, allClassesToSearch, allBackgroundsToSearch, allSpeciesToSearch);
    reconstructedSheet._savedCoreDataHelper = { 
      ...coreData, 
      id: coreData.id, 
      equipment: coreData.equipment || [], 
      gold: coreData.gold || 0, 
      chosenClassEquipmentBundleKey: coreData.chosenClassEquipmentBundleKey,
      chosenClassEquipmentSelections: coreData.chosenClassEquipmentSelections || {}, 
    };
    return calculateAllDerivedStats(reconstructedSheet);
  }

  const sheet: CharacterSheet = {
    name: '',
    level: 1,
    abilityScores: { ...initialAbilityScores },
    abilityScoreModifiers: { Strength: 0, Dexterity: 0, Constitution: 0, Intelligence: 0, Wisdom: 0, Charisma: 0 },
    maxHp: 0,
    currentHp: 0,
    temporaryHp: 0,
    armorClass: 10,
    initiative: 0,
    speed: 30,
    proficiencyBonus: 2,
    proficiencies: [],
    savingThrows: {},
    skills: {},
    passivePerception: 10,
    hitDice: { total: 1, type: 0, remaining: 1 },
    attacksAndSpellcasting: [],
    equipment: [], 
    gold: 0, 
    featuresAndTraits: [],
    weaponMasteries: [],
    knownCantrips: [],
    preparedSpells: [],
    spellSlots: {},
    _savedCoreDataHelper: { 
      id: `new_${Date.now().toString()}`, 
      characterName: '',
      level: 1,
      classId: '',
      backgroundId: '',
      speciesId: '',
      baseAbilityScores: { ...initialAbilityScores },
      equipment: [], 
      gold: 0, 
      chosenClassEquipmentBundleKey: undefined,
      chosenClassEquipmentSelections: {}, 
    }
  };

  SKILL_DEFINITIONS.forEach(skillDef => {
    sheet.skills[skillDef.name] = {
      value: calculateAbilityModifier(initialAbilityScores[skillDef.ability]),
      proficient: false,
      ability: skillDef.ability,
    };
  });

  (Object.keys(initialAbilityScores) as Array<keyof AbilityScores>).forEach(abilityName => {
    sheet.savingThrows[abilityName] = {
      value: calculateAbilityModifier(initialAbilityScores[abilityName]),
      proficient: false,
    };
  });
  return calculateAllDerivedStats(sheet);
};
