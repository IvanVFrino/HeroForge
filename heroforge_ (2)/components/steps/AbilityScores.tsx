import React, { useState, useEffect } from 'react';
import { useCharacter } from '../../context/CharacterContext';
// Fix: Import ABILITY_SCORE_NAMES_ORDERED from types.ts
import { AbilityScores, AbilityScoreName, ABILITY_SCORE_NAMES_ORDERED } from '../../types';
import { calculateAbilityModifier } from '../../utils/characterCalculations';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8].sort((a,b) => b-a); 

const AbilityScoresStep: React.FC = () => {
  const { character, dispatch } = useCharacter();
  
  const determineInitialMethod = (): 'standardArray' | 'pointBuy' | 'roll' => {
    if (character.abilityScores && character._savedCoreDataHelper?.baseAbilityScores) {
        const baseScores = character._savedCoreDataHelper.baseAbilityScores;
        if (baseScores && Object.keys(baseScores).length === ABILITY_SCORE_NAMES_ORDERED.length) {
            const sortedSavedBase = Object.values(baseScores).sort((a: number, b: number) => b - a).join(',');
            const sortedStandardArray = [...STANDARD_ARRAY].sort((a: number, b: number) => b - a).join(',');
            if (sortedSavedBase === sortedStandardArray) return 'standardArray';
        }
    }
    return 'standardArray'; 
  };

  const [method, setMethod] = useState<'standardArray' | 'pointBuy' | 'roll'>(determineInitialMethod());
  
  const [baseScoresForDisplay, setBaseScoresForDisplay] = useState<AbilityScores>(
    character._savedCoreDataHelper?.baseAbilityScores || character.abilityScores 
  );

  const [availableArrayScores, setAvailableArrayScores] = useState<number[]>(() => {
    if (character._savedCoreDataHelper?.baseAbilityScores) {
      const assigned = Object.values(character._savedCoreDataHelper.baseAbilityScores);
      return STANDARD_ARRAY.filter(s => !assigned.includes(s));
    }
    return [...STANDARD_ARRAY];
  });

  const [assignedArrayScores, setAssignedArrayScores] = useState<Partial<Record<AbilityScoreName, number>>>(() => {
     const initial: Partial<Record<AbilityScoreName, number>> = {};
     if (character._savedCoreDataHelper?.baseAbilityScores) {
        for (const key of ABILITY_SCORE_NAMES_ORDERED) {
            const score = character._savedCoreDataHelper.baseAbilityScores[key as AbilityScoreName];
            if (score !== undefined && STANDARD_ARRAY.includes(score)) {
                initial[key as AbilityScoreName] = score;
            }
        }
     }
     return initial;
  });

  useEffect(() => {
    setBaseScoresForDisplay(character._savedCoreDataHelper?.baseAbilityScores || character.abilityScores);
    
    const initialAssigned: Partial<Record<AbilityScoreName, number>> = {};
    let newAvailable = [...STANDARD_ARRAY];
    if (character._savedCoreDataHelper?.baseAbilityScores) {
        const currentBaseScores = character._savedCoreDataHelper.baseAbilityScores;
        ABILITY_SCORE_NAMES_ORDERED.forEach(absName => {
            const scoreVal = currentBaseScores[absName];
            if (scoreVal !== undefined && newAvailable.includes(scoreVal)) {
                initialAssigned[absName] = scoreVal;
                newAvailable.splice(newAvailable.indexOf(scoreVal), 1);
            }
        });
    }
    setAssignedArrayScores(initialAssigned);
    setAvailableArrayScores(newAvailable.sort((a,b) => b-a));
    setMethod(determineInitialMethod());

  }, [character._savedCoreDataHelper?.baseAbilityScores, character.abilityScores]);

  const getAbilityDisplayName = (abilityName: AbilityScoreName): string => {
    const map: Record<AbilityScoreName, string> = {
        Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
        Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
    };
    return map[abilityName] || abilityName;
  };

  const handleAssignScore = (ability: AbilityScoreName, scoreToAssign: number | null) => {
    const newAssigned = { ...assignedArrayScores };
    const oldAssignedScore = newAssigned[ability];
    let newAvailable = [...availableArrayScores];

    if (oldAssignedScore !== undefined) {
      newAvailable.push(oldAssignedScore);
    }

    if (scoreToAssign !== null) {
      for (const key in newAssigned) {
        if (newAssigned[key as AbilityScoreName] === scoreToAssign) {
          delete newAssigned[key as AbilityScoreName];
        }
      }
      newAssigned[ability] = scoreToAssign;
      newAvailable = newAvailable.filter(s => s !== scoreToAssign);
    } else { 
      delete newAssigned[ability];
    }
    
    newAvailable.sort((a, b) => b - a);
    setAssignedArrayScores(newAssigned);
    setAvailableArrayScores(newAvailable);

    if (Object.keys(newAssigned).length === ABILITY_SCORE_NAMES_ORDERED.length) {
      const finalBaseScores = {} as AbilityScores;
      let allScoresAssigned = true;
      ABILITY_SCORE_NAMES_ORDERED.forEach(absName => {
        if (newAssigned[absName] === undefined) {
            allScoresAssigned = false;
        }
        finalBaseScores[absName] = newAssigned[absName] || 0; 
      });
      if (allScoresAssigned) {
        setBaseScoresForDisplay(finalBaseScores);
        dispatch({ type: 'SET_BASE_ABILITY_SCORES', payload: finalBaseScores });
      }
    }
  };

  const renderStandardArray = () => (
    <div className="space-y-4">
      <p className="text-slate-700 dark:text-slate-300">Asigna estas puntuaciones: <span className="font-semibold text-purple-700 dark:text-purple-300">{STANDARD_ARRAY.join(', ')}</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {ABILITY_SCORE_NAMES_ORDERED.map((ability) => (
          <div key={ability} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <span className="font-medium text-slate-800 dark:text-slate-200 w-28">{getAbilityDisplayName(ability)}:</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {[...availableArrayScores, assignedArrayScores[ability]].filter(s => s !== undefined).sort((a,b)=> (b || 0) - (a || 0)).map(scoreValue => (
                <button
                    key={`${ability}-${scoreValue}`}
                    onClick={() => handleAssignScore(ability, scoreValue!)}
                    className={`px-2 py-1 rounded transition-colors text-xs min-w-[36px] ${
                    assignedArrayScores[ability] === scoreValue
                        ? 'bg-green-500 text-white ring-2 ring-green-300'
                        : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100'
                    }`}
                >
                    {scoreValue}
                </button>
              ))}
              {assignedArrayScores[ability] !== undefined && (
                <button onClick={() => handleAssignScore(ability, null)} 
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded min-w-[30px]">X</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderPointBuy = () => <p className="text-slate-600 dark:text-slate-400">Método de Compra por Puntos (Aún no implementado). Presupuesto: 27 puntos. Puntuaciones 8-15.</p>;
  const renderRoll = () => <p className="text-slate-600 dark:text-slate-400">Método de Tirada de Dados (4d6, se descarta el más bajo) (Aún no implementado).</p>;
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-6">Determinar Puntuaciones de Característica</h2>
      <div className="mb-4">
        <label htmlFor="method-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Método de Generación:</label>
        <select
          id="method-select"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as any);
            setAssignedArrayScores({});
            setAvailableArrayScores([...STANDARD_ARRAY]);
            const resetScores = {} as AbilityScores;
            ABILITY_SCORE_NAMES_ORDERED.forEach(name => resetScores[name as AbilityScoreName] = 10); // Default to 10
            dispatch({ type: 'SET_BASE_ABILITY_SCORES', payload: resetScores });
          }}
          className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100"
        >
          <option value="standardArray">Conjunto Estándar</option>
          <option value="pointBuy" disabled>Compra por Puntos (Próximamente)</option>
          <option value="roll" disabled>Tirada de Dados (Próximamente)</option>
        </select>
      </div>

      {method === 'standardArray' && renderStandardArray()}
      {method === 'pointBuy' && renderPointBuy()}
      {method === 'roll' && renderRoll()}

      <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">Puntuaciones y Modificadores Actuales (Tras IPC de Trasfondo)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ABILITY_SCORE_NAMES_ORDERED.map((ability) => (
            <div key={ability} className="p-2 bg-slate-200 dark:bg-slate-600 rounded">
              <span className="font-medium text-slate-800 dark:text-slate-200">{getAbilityDisplayName(ability)}: </span>
              <span className="text-purple-700 dark:text-purple-300">{character.abilityScores[ability] || 'N/A'}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1"> (Mod: {character.abilityScores[ability] ? calculateAbilityModifier(character.abilityScores[ability]) : 'N/A'})</span>
            </div>
          ))}
        </div>
        {character.background && character._savedCoreDataHelper?.backgroundAsiChoices && character._savedCoreDataHelper.backgroundAsiChoices.length > 0 &&
         <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">* Incluye IPC del trasfondo {character.background.name}.</p>}
      </div>
    </div>
  );
};

export default AbilityScoresStep;