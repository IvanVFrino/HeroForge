
import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { HeroForgeData, HeroForgeAction, HeroForgeContextState, SavedCharacterCoreData, DndSpecies, DndClass, DndBackground, Item, EquippedItem, NPCData } from '../types';

const initialHeroForgeData: HeroForgeData = {
  characters: [],
  customSpecies: [],
  customClasses: [],
  customBackgrounds: [],
  customItems: [],
  customNPCs: [],
};

const HeroForgeContext = createContext<HeroForgeContextState | undefined>(undefined);

const heroForgeReducer = (state: HeroForgeData, action: HeroForgeAction): HeroForgeData => {
  switch (action.type) {
    case 'LOAD_DATA': {
      const loadedData = action.payload;
      // Ensure all arrays are properly initialized and items are new objects with string IDs
      return {
        ...initialHeroForgeData, // Start with defaults to ensure all keys exist
        characters: loadedData.characters?.map(c => ({ ...c, id: String(c.id) })) || [],
        customSpecies: loadedData.customSpecies?.map(s => ({ ...s, id: String(s.id) })) || [],
        customClasses: loadedData.customClasses?.map(c => ({ ...c, id: String(c.id) })) || [],
        customBackgrounds: loadedData.customBackgrounds?.map(b => ({ ...b, id: String(b.id) })) || [],
        customItems: loadedData.customItems?.map(i => ({ ...i, id: String(i.id) })) || [],
        customNPCs: loadedData.customNPCs?.map(npc => ({ ...npc, id: String(npc.id) })) || [],
      };
    }
    case 'ADD_CHARACTER': {
      const existingIndex = state.characters.findIndex(char => char.id === action.payload.id);
      if (existingIndex !== -1) {
        // Update existing character
        const updatedCharacters = [...state.characters];
        updatedCharacters[existingIndex] = action.payload;
        return { ...state, characters: updatedCharacters };
      }
      // Add new character
      return { ...state, characters: [...state.characters, action.payload] };
    }
    case 'UPDATE_CHARACTER': {
        const updatedCharacters = state.characters.map(char =>
            char.id === action.payload.id ? action.payload : char
        );
        return { ...state, characters: updatedCharacters };
    }
    case 'DELETE_CHARACTER': {
        return { ...state, characters: state.characters.filter(char => char.id !== action.payload) };
    }
    case 'UPDATE_CHARACTER_INVENTORY': {
      return {
        ...state,
        characters: state.characters.map(char =>
          char.id === action.payload.characterId
            ? { ...char, equipment: action.payload.newEquipment }
            : char
        ),
      };
    }
    case 'ADD_CUSTOM_ITEM': {
      const newItemDefinition: Omit<Item, 'quantity'> = {
        ...action.payload, 
        id: `custom-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        isCustom: true,
      };
      return {
        ...state,
        customItems: [...state.customItems, newItemDefinition],
      };
    }
    case 'ADD_CUSTOM_SPECIES': {
      const newSpecies: DndSpecies = { 
        ...action.payload, 
        id: `custom-species-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
        isCustom: true 
      };
      return { ...state, customSpecies: [...state.customSpecies, newSpecies] };
    }
    case 'ADD_CUSTOM_CLASS': {
      const newClass: DndClass = { 
        ...action.payload, 
        id: `custom-class-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
        isCustom: true 
      };
      return { ...state, customClasses: [...state.customClasses, newClass] };
    }
    case 'ADD_CUSTOM_BACKGROUND': {
      const newBackground: DndBackground = { 
        ...action.payload, 
        id: `custom-background-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
        isCustom: true 
      };
      return { ...state, customBackgrounds: [...state.customBackgrounds, newBackground] };
    }
    case 'ADD_CUSTOM_NPC': {
      const newNpc: NPCData = {
        ...action.payload,
        id: `custom-npc-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        isCustom: true
      };
      return { ...state, customNPCs: [...state.customNPCs, newNpc] };
    }
    case 'DELETE_CUSTOM_ITEM':
      return {
        ...state,
        customItems: state.customItems.filter(item => item.id !== action.payload),
      };
    case 'DELETE_CUSTOM_SPECIES':
      return {
        ...state,
        customSpecies: state.customSpecies.filter(species => species.id !== action.payload),
      };
    case 'DELETE_CUSTOM_CLASS':
      return {
        ...state,
        customClasses: state.customClasses.filter(cls => cls.id !== action.payload),
      };
    case 'DELETE_CUSTOM_BACKGROUND':
      return {
        ...state,
        customBackgrounds: state.customBackgrounds.filter(bg => bg.id !== action.payload),
      };
    case 'DELETE_CUSTOM_NPC':
      return {
        ...state,
        customNPCs: state.customNPCs.filter(npc => npc.id !== action.payload),
      };
    default:
      return state;
  }
};

interface HeroForgeProviderProps {
  children: ReactNode;
}

export const HeroForgeProvider: React.FC<HeroForgeProviderProps> = ({ children }) => {
  const [data, dispatch] = useReducer(heroForgeReducer, initialHeroForgeData);

  return (
    <HeroForgeContext.Provider value={{ data, dispatch }}>
      {children}
    </HeroForgeContext.Provider>
  );
};

export const useHeroForge = (): HeroForgeContextState => {
  const context = useContext(HeroForgeContext);
  if (!context) {
    throw new Error('useHeroForge must be used within a HeroForgeProvider');
  }
  return context;
};