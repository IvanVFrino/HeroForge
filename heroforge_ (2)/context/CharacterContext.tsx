import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { CharacterSheet, CharacterAction, CharacterContextState } from '../types';
import { calculateAllDerivedStats } from '../utils/characterCalculations';
import { convertSheetToCoreData } from '../utils/characterConverter';
import { createInitialCharacterSheet } from '../utils/characterSheetInitializer';
import { characterReducer } from './characterReducer'; // Import the reducer

const CharacterContext = createContext<CharacterContextState | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [character, dispatch] = useReducer(characterReducer, createInitialCharacterSheet());
  
  useEffect(() => {
    dispatch({ type: 'RECALCULATE_DERIVED_STATS' });
  }, [
    character.abilityScores, 
    character.proficiencies, 
    character.class, 
    character.level, 
    character.featuresAndTraits, 
    character.equipment, 
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

export const getFinalCoreData = (sheet: CharacterSheet) => {
    return convertSheetToCoreData(sheet);
};
