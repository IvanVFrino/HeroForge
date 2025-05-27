import { CharacterSheet, CharacterAction, SavedCharacterCoreData, ABILITY_SCORE_NAMES_ORDERED } from '../types';
import { calculateAllDerivedStats } from '../utils/characterCalculations';
import { createInitialCharacterSheet } from '../utils/characterSheetInitializer';
import { 
  _handleSetClass, _handleSetBackground, _handleSetSpecies, 
  _handleAddInventoryItem, _handleApplyClassEquipmentChoices 
} from './characterReducerHelpers';

export const characterReducer = (state: CharacterSheet, action: CharacterAction): CharacterSheet => {
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
      
      newState = createInitialCharacterSheet(coreDataToUse, customDataForReconstruction);
      break;
    }
    case 'SET_CLASS': 
      newState = _handleSetClass(state, action.payload);
      break;
    case 'SET_BACKGROUND': 
      newState = _handleSetBackground(state, action.payload);
      break;
    case 'APPLY_CLASS_EQUIPMENT_CHOICES':
      newState = _handleApplyClassEquipmentChoices(state, action.payload);
      break;
    case 'SET_SPECIES':
      newState = _handleSetSpecies(state, action.payload);
      break;
    case 'SET_BASE_ABILITY_SCORES':
      newState = { ...state,
        _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, baseAbilityScores: action.payload }
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
              ...(newState._savedCoreDataHelper || {}), 
              id: newState._savedCoreDataHelper!.id, 
              backgroundAsiChoices: action.payload.choices 
            }
        };
        break;
    }
    case 'SET_ALIGNMENT':
      newState = { ...state, alignment: action.payload,
         _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, alignment: action.payload }
      };
      break;
    case 'SET_NAME':
      newState = { ...state, name: action.payload,
        _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, characterName: action.payload }
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
            ...(newState._savedCoreDataHelper || {}),
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
            ...(newState._savedCoreDataHelper || {}),
            id: newState._savedCoreDataHelper!.id,
            chosenClassSkillProficiencies: (newState._savedCoreDataHelper?.chosenClassSkillProficiencies || []).filter(s => s !== skillName)
        }
      };
      break;
    }
    case 'ADD_INVENTORY_ITEM': 
      newState = _handleAddInventoryItem(state, action.payload);
      break;
    case 'REMOVE_INVENTORY_ITEM': {
      const { instanceId } = action.payload;
      const updatedEquipment = state.equipment.filter(item => item.instanceId !== instanceId);
      newState = { ...state, equipment: updatedEquipment,
        _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
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
         _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, equipment: [...updatedEquipment] }
      };
      break;
    }
    case 'SET_GOLD':
      newState = { ...state, gold: action.payload,
        _savedCoreDataHelper: { ...(newState._savedCoreDataHelper || {}), id: newState._savedCoreDataHelper!.id, gold: action.payload }
      };
      break;
    case 'RECALCULATE_DERIVED_STATS': 
      return calculateAllDerivedStats(state); 
    case 'UPDATE_SAVED_CORE_DATA_HELPER':
      newState = {
        ...state,
        _savedCoreDataHelper: {
          ...(state._savedCoreDataHelper || {}),
          ...action.payload,
          id: action.payload.id || state._savedCoreDataHelper?.id || `new_${Date.now().toString()}`
        }
      };
      break;
    case 'UPDATE_CHARACTER_DETAILS':
      newState = { ...state, ...action.payload };
      break;
    default:
      // Ensure exhaustive check if action types are literals
      // const _exhaustiveCheck: never = action;
      return state; 
  }
  return calculateAllDerivedStats(newState);
};
