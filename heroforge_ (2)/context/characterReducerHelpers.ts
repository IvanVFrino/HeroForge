import { 
  CharacterSheet, DndClass, DndBackground, DndSpecies, 
  EquippedItem, AbilityScoreName, StartingEquipmentItem, Item, WeaponDetails, ArmorDetails
} from '../types';
import { determineCategoryFromName } from '../utils/characterSheetInitializer';
import { getStandardItemDetails } from '../constants/standardEquipment';


export const _handleSetClass = (state: CharacterSheet, newClass: DndClass): CharacterSheet => {
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
  
  const features = (newClass.classFeaturesByLevel[1] || []).map(f => ({...f, source: 'Class'}));
  updatedFeatures.push(...features);
  
  return {
    ...state,
    class: newClass,
    hitDice: { ...state.hitDice, type: newClass.hitDie },
    proficiencies: updatedProficiencies,
    featuresAndTraits: updatedFeatures,
    equipment: updatedEquipment, 
    gold: updatedGold, 
    _savedCoreDataHelper: {
      ...(state._savedCoreDataHelper || {}),
      id: state._savedCoreDataHelper!.id,
      classId: newClass.id,
      chosenClassSkillProficiencies: [], 
      chosenClassEquipmentBundleKey: undefined, 
      chosenClassEquipmentSelections: {}, 
    }
  };
};

export const _handleSetBackground = (state: CharacterSheet, newBackground: DndBackground): CharacterSheet => {
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

  return {
    ...state,
    background: newBackground,
    proficiencies: updatedProficiencies,
    featuresAndTraits: updatedFeatures,
    equipment: updatedEquipment,
    gold: updatedGold,
    _savedCoreDataHelper: {
        ...(state._savedCoreDataHelper || {}),
        id: state._savedCoreDataHelper!.id,
        backgroundId: newBackground.id,
        backgroundAsiChoices: [], 
    }
  };
};

export const _handleSetSpecies = (state: CharacterSheet, newSpecies: DndSpecies): CharacterSheet => {
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

  return { ...state, species: newSpecies, speed: newSpecies.speed, proficiencies, featuresAndTraits: features,
    _savedCoreDataHelper: { ...(state._savedCoreDataHelper || {}), id: state._savedCoreDataHelper!.id, speciesId: newSpecies.id}
  };
};

export const _handleAddInventoryItem = (
    state: CharacterSheet, 
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
): CharacterSheet => {
    const { itemDetails, quantity, source } = payload;

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
          return { ...state, equipment: updatedEquipment, 
              _savedCoreDataHelper: { ...(state._savedCoreDataHelper || {}), id: state._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
          };
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
    
    return { ...state, equipment: updatedEquipment,
        _savedCoreDataHelper: { ...(state._savedCoreDataHelper || {}), id: state._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
    };
};

export const _handleApplyClassEquipmentChoices = (state: CharacterSheet, payload: { chosenItems: StartingEquipmentItem[], totalGold: number, selections: Record<string, string> }): CharacterSheet => {
    const { chosenItems, totalGold: goldFromClassChoices, selections } = payload;
    
    let updatedEquipment = state.equipment.filter(eq => eq.source !== 'ClassEquipment');
    
    const goldFromBackground = state.background?.startingEquipment.gold || 0;
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

    return {
      ...state,
      equipment: updatedEquipment,
      gold: updatedGold,
      _savedCoreDataHelper: {
          ...(state._savedCoreDataHelper || {}),
          id: state._savedCoreDataHelper!.id,
          chosenClassEquipmentBundleKey: undefined, 
          chosenClassEquipmentSelections: selections 
      }
    };
};
