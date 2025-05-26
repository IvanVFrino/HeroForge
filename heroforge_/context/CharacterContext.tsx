
import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { 
  CharacterSheet, CharacterAction, CharacterContextState, AbilityScores, AbilityScoreModifiers, 
  SkillName, Proficiency, DndClass, DndBackground, DndSpecies, SavedCharacterCoreData, 
  EquippedItem, AbilityScoreName,
  ItemCategory, 
  ITEM_CATEGORIES,
  StartingEquipmentItem, 
  WeaponDetails, ArmorDetails,
  EquipmentBundle
} from '../types';
import { SKILL_DEFINITIONS } from '../constants/skills';
import { calculateAbilityModifier, calculateProficiencyValue, calculateAllDerivedStats } from '../utils/characterCalculations';
import { convertSheetToCoreData, reconstructSheetFromCoreData } from '../utils/characterConverter';
import { CLASSES_DATA } from '../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../constants/dndBackgrounds';
import { SPECIES_DATA } from '../constants/dndSpecies';
import { getStandardItemDetails } from '../constants/standardEquipment';


const initialAbilityScores: AbilityScores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

const determineCategoryFromName = (itemName: string): ItemCategory => {
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
    // Defaulting to miscellaneous if not weapon or armor. Consider 'Adventuring Gear' or similar based on D&D terms.
    if (nameLower.includes('pack') || nameLower.includes('kit') || nameLower.includes("thieves' tools") || nameLower.includes("herramientas de ladrón")) {
        return 'Miscellaneous'; // common type for these
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
    // Ensure _savedCoreDataHelper matches the structure
    reconstructedSheet._savedCoreDataHelper = { 
      ...coreData, 
      id: coreData.id, 
      equipment: coreData.equipment || [], 
      gold: coreData.gold || 0, 
      chosenClassEquipmentBundleKey: coreData.chosenClassEquipmentBundleKey, // Keep for potential legacy data, but new system uses selections
      chosenClassEquipmentSelections: coreData.chosenClassEquipmentSelections || {}, 
    };
    return calculateAllDerivedStats(reconstructedSheet);
  }

  // For a brand new character
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

const CharacterContext = createContext<CharacterContextState | undefined>(undefined);

const characterReducer = (state: CharacterSheet, action: CharacterAction): CharacterSheet => {
  let newState = { ...state };
  if (!newState._savedCoreDataHelper) { 
      const initialHelper = createInitialCharacterSheet()._savedCoreDataHelper!;
      newState._savedCoreDataHelper = { ...initialHelper, id: newState._savedCoreDataHelper?.id || `new_${Date.now().toString()}` };
  }
  if (!newState._savedCoreDataHelper.equipment) newState._savedCoreDataHelper.equipment = [];
  if (!newState.equipment) newState.equipment = [];
  if (newState._savedCoreDataHelper.gold === undefined) newState._savedCoreDataHelper.gold = 0;
  if (newState.gold === undefined) newState.gold = 0;
  if (!newState._savedCoreDataHelper.chosenClassEquipmentSelections) newState._savedCoreDataHelper.chosenClassEquipmentSelections = {}; 


  switch (action.type) {
    case 'RESET_CHARACTER_SHEET': {
      let coreDataToUse: SavedCharacterCoreData | undefined;
      let customDataForReconstruction: Parameters<typeof createInitialCharacterSheet>[1] | undefined;

      if (action.payload && 'coreData' in action.payload) { 
        coreDataToUse = action.payload.coreData;
        customDataForReconstruction = action.payload.customData;
      } else if (action.payload) { 
        coreDataToUse = action.payload as SavedCharacterCoreData;
      }
      
      const newSheetFromReset = createInitialCharacterSheet(coreDataToUse, customDataForReconstruction);
      return newSheetFromReset;
    }
    case 'SET_CLASS': {
      const newClass = action.payload;
      let updatedProficiencies = state.proficiencies.filter(p => p.source !== 'Class' && p.source !== 'ClassChoice');
      let updatedFeatures = state.featuresAndTraits.filter(f => f.source !== 'Class' && f.source !== 'ClassChoice');
      
      let updatedEquipment = state.equipment.filter(eq => eq.source !== 'ClassEquipment');
      let updatedGold = state.gold;
      
      const previousSelectionsComplex = state._savedCoreDataHelper?.chosenClassEquipmentSelections;
      const previousClass = state.class; 

      if (previousClass?.startingEquipmentBundles && previousSelectionsComplex && Object.keys(previousSelectionsComplex).length > 0) {
          const allOldBundles = previousClass.startingEquipmentBundles;
          Object.values(previousSelectionsComplex).forEach(selectedKey => {
              const prevSelectedBundle = allOldBundles.find(b => b.key === selectedKey);
              if (prevSelectedBundle?.gold) {
                  updatedGold = Math.max(0, updatedGold - prevSelectedBundle.gold);
              }
          });
      } else if (previousClass?.startingEquipmentBundles && state._savedCoreDataHelper?.chosenClassEquipmentBundleKey) {
          const previousBundle = previousClass.startingEquipmentBundles.find(b => b.key === state._savedCoreDataHelper.chosenClassEquipmentBundleKey);
          if (previousBundle?.gold) {
              updatedGold = Math.max(0, updatedGold - previousBundle.gold);
          }
      }
      
      newClass.armorProficiencies.forEach(ap => updatedProficiencies.push({ name: ap, type: 'armor', source: 'Class'}));
      newClass.weaponProficiencies.forEach(wp => updatedProficiencies.push({ name: wp, type: 'weapon', source: 'Class'}));
      newClass.savingThrowProficiencies.forEach(stName => updatedProficiencies.push({ name: stName as AbilityScoreName, type: 'savingThrow', source: 'Class'}));
      
      const features = newClass.classFeaturesLevel1.map(f => ({...f, source: 'Class'})) || [];
      updatedFeatures.push(...features);
      
      newState = {
        ...state,
        class: newClass,
        hitDice: { ...state.hitDice, type: newClass.hitDie },
        proficiencies: updatedProficiencies,
        featuresAndTraits: updatedFeatures,
        equipment: updatedEquipment, 
        gold: updatedGold, 
        _savedCoreDataHelper: {
          ...newState._savedCoreDataHelper,
          id: newState._savedCoreDataHelper!.id,
          classId: newClass.id,
          chosenClassSkillProficiencies: [], 
          chosenClassEquipmentBundleKey: undefined, 
          chosenClassEquipmentSelections: {}, 
        }
      };
      break;
    }
    case 'SET_BACKGROUND': {
      const newBackground = action.payload;
      let updatedProficiencies = state.proficiencies.filter(p => p.source !== 'Background');
      let updatedFeatures = state.featuresAndTraits.filter(f => f.source !== 'Background');
      let updatedEquipment = state.equipment.filter(eq => eq.source !== 'BackgroundEquipment');
      let updatedGold = state.gold;

      if (state.background?.startingEquipment?.gold) {
          updatedGold = Math.max(0, updatedGold - state.background.startingEquipment.gold);
      }

      newBackground.skillProficiencies.forEach(sp => updatedProficiencies.push({ name: sp, type: 'skill', source: 'Background'}));
      if(newBackground.toolProficiencies) newBackground.toolProficiencies.forEach(tp => updatedProficiencies.push({ name: tp, type: 'tool', source: 'Background'}));
      if(newBackground.languages) {
        newBackground.languages.forEach(lang => {
          if (lang.toLowerCase().startsWith("any") || lang.toLowerCase().startsWith("cualquier")) {
            updatedProficiencies.push({ name: lang, type: 'language', source: 'Background' });
          } else {
            updatedProficiencies.push({ name: lang, type: 'language', source: 'Background' });
          }
        });
      }
      
      if (newBackground.originFeat) {
        updatedFeatures.push({name: newBackground.originFeat, description: `Dote de Origen de ${newBackground.name}.`, source: 'Background'})
      }

      newBackground.startingEquipment.items.forEach(itemDef => {
        const standardDetails = getStandardItemDetails(itemDef.name);
        const definitionId = standardDetails.id || `background-item-${itemDef.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString().slice(-5)}`;
        
        const newItem: EquippedItem = {
          instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}-bg-${itemDef.name.replace(/\s+/g, '-')}`,
          definitionId: definitionId,
          name: itemDef.name,
          quantity: itemDef.quantity,
          category: itemDef.category || standardDetails.category || determineCategoryFromName(itemDef.name),
          description: itemDef.description || standardDetails.description,
          cost: itemDef.cost || standardDetails.cost,
          weight: itemDef.weight || standardDetails.weight,
          weaponDetails: itemDef.weaponDetails || standardDetails.weaponDetails,
          armorDetails: itemDef.armorDetails || standardDetails.armorDetails,
          source: 'BackgroundEquipment'
        };
        updatedEquipment.push(newItem);
      });
      updatedGold += newBackground.startingEquipment.gold || 0;

      newState = {
        ...state,
        background: newBackground,
        proficiencies: updatedProficiencies,
        featuresAndTraits: updatedFeatures,
        equipment: updatedEquipment,
        gold: updatedGold,
        _savedCoreDataHelper: {
            ...newState._savedCoreDataHelper,
            id: newState._savedCoreDataHelper!.id,
            backgroundId: newBackground.id,
            backgroundAsiChoices: [], 
        }
      };
      break;
    }
    case 'CHOOSE_CLASS_EQUIPMENT_BUNDLE': {
        // This case is largely superseded by APPLY_CLASS_EQUIPMENT_CHOICES.
        // However, if it's ever called, ensure it updates the new selections structure.
        const { bundleKey } = action.payload;
        if (!state.class || !state.class.startingEquipmentBundles) return state;

        const selectedBundle = state.class.startingEquipmentBundles.find(b => b.key === bundleKey);
        if (!selectedBundle) return state;

        let updatedEquipment = state.equipment.filter(eq => eq.source !== 'ClassEquipment');
        let updatedGold = state.gold;
        
        // Clear gold/items from ANY previous class equipment decision
        const previousBundleKeySimple = state._savedCoreDataHelper?.chosenClassEquipmentBundleKey;
        const previousSelectionsComplex = state._savedCoreDataHelper?.chosenClassEquipmentSelections;

        if (previousBundleKeySimple && state.class?.startingEquipmentBundles) {
            const previousBundle = state.class.startingEquipmentBundles.find(b => b.key === previousBundleKeySimple);
            if (previousBundle?.gold) updatedGold = Math.max(0, updatedGold - previousBundle.gold);
        } else if (previousSelectionsComplex && Object.keys(previousSelectionsComplex).length > 0 && state.class?.startingEquipmentBundles) {
             const allBundles = state.class.startingEquipmentBundles;
            Object.values(previousSelectionsComplex).forEach(selectedKey => {
                const prevSelectedBundle = allBundles.find(b => b.key === selectedKey);
                if (prevSelectedBundle?.gold) updatedGold = Math.max(0, updatedGold - prevSelectedBundle.gold);
            });
        }
        
        selectedBundle.items.forEach(itemDef => {
            const standardDetails = getStandardItemDetails(itemDef.name);
            const definitionId = standardDetails.id || `class-item-${itemDef.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString().slice(-5)}`;

            const newItem: EquippedItem = {
                instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}-class-${itemDef.name.replace(/\s+/g, '-')}`,
                definitionId: definitionId,
                name: itemDef.name,
                quantity: itemDef.quantity,
                category: itemDef.category || standardDetails.category || determineCategoryFromName(itemDef.name),
                description: itemDef.description || standardDetails.description,
                cost: itemDef.cost || standardDetails.cost,
                weight: itemDef.weight || standardDetails.weight,
                weaponDetails: itemDef.weaponDetails || standardDetails.weaponDetails,
                armorDetails: itemDef.armorDetails || standardDetails.armorDetails,
                source: 'ClassEquipment'
            };
            updatedEquipment.push(newItem);
        });
        updatedGold += selectedBundle.gold || 0;

        // If this legacy action is used, it implies a simple choice structure.
        // We reflect this in chosenClassEquipmentSelections by creating a single "group" for this bundle.
        const pseudoGroupId = `legacy_bundle_group_${selectedBundle.key}`;
        const newSelections = { [pseudoGroupId]: bundleKey };

        newState = {
            ...state,
            equipment: updatedEquipment,
            gold: updatedGold,
            _savedCoreDataHelper: {
                ...state._savedCoreDataHelper,
                id: state._savedCoreDataHelper!.id,
                chosenClassEquipmentBundleKey: bundleKey, // Keep for reference if needed, but selections is primary
                chosenClassEquipmentSelections: newSelections 
            }
        };
        break;
    }
    case 'APPLY_CLASS_EQUIPMENT_CHOICES': {
      const { chosenItems, totalGold: goldFromClassChoices, selections } = action.payload;
      
      let updatedEquipment = state.equipment.filter(eq => eq.source !== 'ClassEquipment');
      
      const goldFromBackground = state.background?.startingEquipment.gold || 0;
      // The `goldFromClassChoices` is the definitive amount of gold contributed by the current class equipment.
      // The character's new total gold will be gold from other sources (e.g., background) + this new class gold.
      let updatedGold = goldFromBackground + goldFromClassChoices;

      chosenItems.forEach(itemDef => {
        const standardDetails = getStandardItemDetails(itemDef.name);
        const definitionId = standardDetails.id || `class-item-choice-${itemDef.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString().slice(-5)}`;
        const newItem: EquippedItem = {
            instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}-class-choice-${itemDef.name.replace(/\s+/g, '-')}`,
            definitionId: definitionId,
            name: itemDef.name,
            quantity: itemDef.quantity,
            category: itemDef.category || standardDetails.category || determineCategoryFromName(itemDef.name),
            description: itemDef.description || standardDetails.description,
            cost: itemDef.cost || standardDetails.cost,
            weight: itemDef.weight || standardDetails.weight,
            weaponDetails: itemDef.weaponDetails || standardDetails.weaponDetails,
            armorDetails: itemDef.armorDetails || standardDetails.armorDetails,
            source: 'ClassEquipment'
        };
        updatedEquipment.push(newItem);
      });

      newState = {
        ...state,
        equipment: updatedEquipment,
        gold: updatedGold,
        _savedCoreDataHelper: {
            ...state._savedCoreDataHelper,
            id: state._savedCoreDataHelper!.id,
            chosenClassEquipmentBundleKey: undefined, 
            chosenClassEquipmentSelections: selections 
        }
      };
      break;
    }
    case 'SET_SPECIES': {
      const newSpecies = action.payload;
      const proficiencies = state.proficiencies.filter(p => p.source !== 'Species');
      newSpecies.languages.forEach(lang => {
        if (lang !== "Common" && !lang.toLowerCase().startsWith("one extra") && !lang.toLowerCase().startsWith("un idioma adicional")) { 
             proficiencies.push({ name: lang, type: 'language', source: 'Species' });
        } else if (lang.toLowerCase().startsWith("one extra") || lang.toLowerCase().startsWith("un idioma adicional")) {
             proficiencies.push({ name: lang, type: 'language', source: 'Species' }); 
        }
      });
      newSpecies.traits.forEach(trait => {
        if (trait.name === "Keen Senses" && trait.description.includes("Perception skill")) { 
            if (!proficiencies.some(p => p.name === "Perception" && p.type === "skill")) {
                 proficiencies.push({name: "Perception", type: "skill", source: "Species"});
            }
        }
      });
      
      const features = [...state.featuresAndTraits.filter(f => f.source !== 'Species'), ...newSpecies.traits.map(t => ({...t, source: 'Species'}))];

      newState = { ...state, species: newSpecies, speed: newSpecies.speed, proficiencies, featuresAndTraits: features,
        _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, speciesId: newSpecies.id}
      };
      break;
    }
    case 'SET_BASE_ABILITY_SCORES':
      newState = { ...state,
        _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, baseAbilityScores: action.payload }
      };
      if (newState._savedCoreDataHelper?.backgroundAsiChoices && newState._savedCoreDataHelper.backgroundAsiChoices.length > 0) {
        const baseScoresToUse = { ...action.payload };
        const newScoresApplied = { ...baseScoresToUse };
        newState._savedCoreDataHelper.backgroundAsiChoices.forEach(inc => {
            newScoresApplied[inc.ability] = Math.min(20, (newScoresApplied[inc.ability] || 0) + inc.amount);
        });
        newState.abilityScores = newScoresApplied;
      } else {
        newState.abilityScores = { ...action.payload };
      }
      break;
    case 'APPLY_BACKGROUND_ASIS': {
        const baseScoresToUse = newState._savedCoreDataHelper?.baseAbilityScores || state.abilityScores;
        const newScoresApplied = { ...baseScoresToUse };
        
        action.payload.choices.forEach(inc => {
            newScoresApplied[inc.ability] = Math.min(20, (newScoresApplied[inc.ability] || 0) + inc.amount);
        });
        newState = { ...state, abilityScores: newScoresApplied, 
            _savedCoreDataHelper: { 
              ...newState._savedCoreDataHelper, 
              id: newState._savedCoreDataHelper!.id, 
              backgroundAsiChoices: action.payload.choices 
            }
        };
        break;
    }
    case 'SET_ALIGNMENT':
      newState = { ...state, alignment: action.payload,
         _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, alignment: action.payload }
      };
      break;
    case 'SET_NAME':
      newState = { ...state, name: action.payload,
        _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, characterName: action.payload }
      };
      break;
    case 'ADD_PROFICIENCY':
      if (!state.proficiencies.find(p => p.name === action.payload.name && p.type === action.payload.type && p.source === action.payload.source)) {
        newState = { ...state, proficiencies: [...state.proficiencies, action.payload] };
      }
      break;
    case 'REMOVE_PROFICIENCY': {
      const { name, type, source } = action.payload;
      newState = { ...state, proficiencies: state.proficiencies.filter(p => !(p.name === name && p.type === type && p.source === source)) };
      break;
    }
    case 'CHOOSE_CLASS_SKILL': {
      const skillName = action.payload;
      const proficiencies = [...state.proficiencies];
      if (!proficiencies.some(p => p.name === skillName && p.type === 'skill' && p.source === 'ClassChoice')) {
        proficiencies.push({ name: skillName, type: 'skill', source: 'ClassChoice' });
      }
      newState = { ...state, proficiencies,
        _savedCoreDataHelper: {
            ...newState._savedCoreDataHelper,
            id: newState._savedCoreDataHelper!.id,
            chosenClassSkillProficiencies: Array.from(new Set([...(newState._savedCoreDataHelper?.chosenClassSkillProficiencies || []), skillName]))
        }
      };
      break;
    }
    case 'UNCHOOSE_CLASS_SKILL': {
      const skillName = action.payload;
      newState = { ...state, 
        proficiencies: state.proficiencies.filter(p => !(p.name === skillName && p.type === 'skill' && p.source === 'ClassChoice')),
        _savedCoreDataHelper: {
            ...newState._savedCoreDataHelper,
            id: newState._savedCoreDataHelper!.id,
            chosenClassSkillProficiencies: (newState._savedCoreDataHelper?.chosenClassSkillProficiencies || []).filter(s => s !== skillName)
        }
      };
      break;
    }
    case 'ADD_INVENTORY_ITEM': { 
      const { itemDetails, quantity, source } = action.payload;

      if (!itemDetails || typeof itemDetails.name !== 'string') {
        console.error('ADD_INVENTORY_ITEM Error: Invalid itemDetails or name provided.', { itemDetails, quantity });
        return state; 
      }
      const itemCategory = itemDetails.category || determineCategoryFromName(itemDetails.name);

      let updatedEquipment = [...state.equipment];
      
      const isStackableSource = source === 'CustomAddedCreator' || source === 'CustomAddedSheet';
      
      if (isStackableSource) { 
        const existingItemIndex = updatedEquipment.findIndex(invItem => 
            invItem.definitionId === itemDetails.definitionId && 
            invItem.name.toLowerCase() === itemDetails.name.toLowerCase() && 
            invItem.category === itemCategory &&
            invItem.source === source 
        );
        if (existingItemIndex !== -1) {
            updatedEquipment[existingItemIndex] = {
                ...updatedEquipment[existingItemIndex],
                quantity: updatedEquipment[existingItemIndex].quantity + quantity,
            };
             newState = { ...state, equipment: updatedEquipment, 
                _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
            };
            break; 
        }
      }

      const newItemToAdd: EquippedItem = {
        instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}`,
        definitionId: itemDetails.definitionId || `${source || 'adhoc'}-${itemDetails.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        name: itemDetails.name, 
        category: itemCategory, 
        quantity,
        description: itemDetails.description,
        cost: itemDetails.cost,
        weight: itemDetails.weight,
        weaponDetails: itemDetails.weaponDetails,
        armorDetails: itemDetails.armorDetails,
        equipped: itemDetails.equipped,
        attunement: itemDetails.attunement,
        source: source
      };
      updatedEquipment.push(newItemToAdd);
      
      newState = { ...state, equipment: updatedEquipment,
         _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
      };
      break;
    }
    case 'REMOVE_INVENTORY_ITEM': {
      const { instanceId } = action.payload;
      const updatedEquipment = state.equipment.filter(item => item.instanceId !== instanceId);
      newState = { ...state, equipment: updatedEquipment,
        _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
      };
      break;
    }
    case 'UPDATE_INVENTORY_ITEM_QUANTITY': {
      const { instanceId, newQuantity } = action.payload;
      let updatedEquipment = state.equipment.map(item =>
        item.instanceId === instanceId ? { ...item, quantity: newQuantity } : item
      );
      updatedEquipment = updatedEquipment.filter(item => item.quantity > 0); 
      newState = { ...state, equipment: updatedEquipment,
         _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
      };
      break;
    }
    case 'SET_GOLD':
      newState = { ...state, gold: action.payload,
        _savedCoreDataHelper: { ...newState._savedCoreDataHelper, id: newState._savedCoreDataHelper!.id, gold: action.payload }
      };
      break;
    case 'RECALCULATE_DERIVED_STATS': {
      return calculateAllDerivedStats(state);
    }
     case 'UPDATE_SAVED_CORE_DATA_HELPER':
      newState = {
        ...state,
        _savedCoreDataHelper: {
          ...state._savedCoreDataHelper,
          ...action.payload,
          id: action.payload.id || state._savedCoreDataHelper?.id || `new_${Date.now().toString()}`
        }
      };
      break;
    case 'UPDATE_CHARACTER_DETAILS':
      newState = { ...state, ...action.payload };
      break;
    default:
      return state; 
  }
  return calculateAllDerivedStats(newState);
};

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [character, dispatch] = useReducer(characterReducer, createInitialCharacterSheet());
  
  useEffect(() => {
    // This effect specifically recalculates derived stats when critical data changes.
    // It's kept separate from any character save/load logic to ensure UI updates promptly.
    dispatch({ type: 'RECALCULATE_DERIVED_STATS' });
  }, [
    character.abilityScores, 
    character.proficiencies, 
    character.class, 
    character.level, 
    character.featuresAndTraits, 
    character.equipment, // Equipment affects AC, encumbrance etc.
    // Gold is not directly used in calculateAllDerivedStats, but equipment can have gold value.
    // However, direct changes to character.gold don't trigger recalculation of stats like AC/HP.
  ]);


  return (
    <CharacterContext.Provider value={{ character, dispatch }}>
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = (): CharacterContextState => {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
};

export const getFinalCoreData = (sheet: CharacterSheet): SavedCharacterCoreData => {
    return convertSheetToCoreData(sheet);
};