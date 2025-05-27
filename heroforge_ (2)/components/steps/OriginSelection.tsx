
import React, { useState, useEffect } from 'react';
import { useCharacter } from '../../context/CharacterContext';
import { BACKGROUNDS_DATA } from '../../constants/dndBackgrounds';
import { SPECIES_DATA } from '../../constants/dndSpecies';
// Comment: Import Size type from types
import { DndBackground, DndSpecies, AbilityScoreName, Size } from '../../types'; 
import { useHeroForge } from '../../context/HeroForgeDataContext'; 
import { SKILL_DEFINITIONS } from '../../constants/skills'; // SKILL_DEFINITIONS for display names


const getSizeDisplayName = (sizeValue: Size): string => {
  const map: Record<Size, string> = {
      Tiny: "Diminuta",
      Small: "Pequeña",
      Medium: "Mediana",
      Large: "Grande",
      Huge: "Enorme",
      Gargantuan: "Gargantuesca"
  };
  return map[sizeValue] || sizeValue;
};

const OriginSelection: React.FC = () => {
  const { character, dispatch } = useCharacter();
  const { data: heroForgeData } = useHeroForge(); 
  const [selectedBackgroundUI, setSelectedBackgroundUI] = useState<DndBackground | null>(character.background || null);
  const [selectedSpeciesUI, setSelectedSpeciesUI] = useState<DndSpecies | null>(character.species || null);
  
  const [asiChoices, setAsiChoices] = useState<Array<{ability: AbilityScoreName, amount: number}>>(character._savedCoreDataHelper?.backgroundAsiChoices || []);
  const [canApplyAsi, setCanApplyAsi] = useState(false);

  const allBackgrounds = [...BACKGROUNDS_DATA, ...heroForgeData.customBackgrounds]; 
  const allSpecies = [...SPECIES_DATA, ...heroForgeData.customSpecies]; 

  useEffect(() => {
    if (character.background) {
      setSelectedBackgroundUI(character.background);
      setAsiChoices(character._savedCoreDataHelper?.backgroundAsiChoices || []);
    }
    if (character.species) {
      setSelectedSpeciesUI(character.species);
    }
  }, [character.background, character.species, character._savedCoreDataHelper?.backgroundAsiChoices]);

  const handleBackgroundSelect = (bg: DndBackground) => {
    setSelectedBackgroundUI(bg);
    dispatch({ type: 'SET_BACKGROUND', payload: bg });
    setAsiChoices([]); 
    setCanApplyAsi(false);
  };

  const handleSpeciesSelect = (sp: DndSpecies) => {
    setSelectedSpeciesUI(sp);
    dispatch({ type: 'SET_SPECIES', payload: sp });
  };

  const getAbilityDisplayName = (abilityName: AbilityScoreName): string => {
    const map: Record<AbilityScoreName, string> = {
        Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
        Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
    };
    return map[abilityName] || abilityName;
  };

  const handleAsiToggle = (ability: AbilityScoreName, value: number) => {
    if (!selectedBackgroundUI) return;

    let newChoices = [...asiChoices];
    const existingChoiceIndex = newChoices.findIndex(c => c.ability === ability);

    if (existingChoiceIndex !== -1) { 
        if (newChoices[existingChoiceIndex].amount === value) { 
            newChoices.splice(existingChoiceIndex, 1);
        } else { 
            newChoices[existingChoiceIndex].amount = value;
        }
    } else { 
        newChoices.push({ ability, amount: value });
    }
    setAsiChoices(newChoices);
  };
  
  useEffect(() => {
    if (!selectedBackgroundUI) {
        setCanApplyAsi(false);
        return;
    }
    const totalPoints = asiChoices.reduce((sum, choice) => sum + choice.amount, 0);
    const uniqueAbilitiesCount = new Set(asiChoices.map(c => c.ability)).size;

    const option1Valid = asiChoices.length === 2 && totalPoints === 3 && uniqueAbilitiesCount === 2 && 
                         asiChoices.some(c => c.amount === 2) && asiChoices.some(c => c.amount === 1);
    const option2Valid = asiChoices.length === 3 && totalPoints === 3 && uniqueAbilitiesCount === 3 && 
                         asiChoices.every(c => c.amount === 1);
    
    setCanApplyAsi(option1Valid || option2Valid);

  }, [asiChoices, selectedBackgroundUI]);


  const applyAsiChanges = () => {
    if(canApplyAsi && selectedBackgroundUI) {
        dispatch({type: 'APPLY_BACKGROUND_ASIS', payload: {choices: asiChoices}});
        dispatch({type: 'UPDATE_SAVED_CORE_DATA_HELPER', payload: { backgroundAsiChoices: asiChoices }});
    }
  };

  const isAsiApplied = character._savedCoreDataHelper?.backgroundAsiChoices && 
                       character._savedCoreDataHelper.backgroundAsiChoices.length > 0 &&
                       JSON.stringify(character._savedCoreDataHelper.backgroundAsiChoices.sort((a,b) => a.ability.localeCompare(b.ability))) === JSON.stringify(asiChoices.sort((a,b) => a.ability.localeCompare(b.ability)));


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-4">Elige tu Trasfondo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBackgrounds.map((bg) => ( 
            <button
              key={bg.id}
              onClick={() => handleBackgroundSelect(bg)}
              className={`p-4 rounded-lg shadow-lg transition-all duration-200 border-2 ${
                selectedBackgroundUI?.id === bg.id
                  ? 'bg-purple-600 border-purple-400 text-white scale-105'
                  : `bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-purple-500 ${bg.isCustom ? 'ring-1 ring-yellow-500 dark:ring-yellow-400' : ''}`
              }`}
            >
              <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{bg.name}{bg.isCustom ? ' (P)' : ''}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">Dote: {bg.originFeat}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Habilidades: {bg.skillProficiencies.map(s => SKILL_DEFINITIONS.find(sd => sd.name === s)?.nombre || s).join(', ')}</p>
            </button>
          ))}
        </div>
        {selectedBackgroundUI && (
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-inner">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Incrementos de Puntuación de Característica de {selectedBackgroundUI.name}{selectedBackgroundUI.isCustom ? ' (Personalizado)' : ''}</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">Elige: (+2 a una y +1 a otra) O (+1 a tres).</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Elegibles: {selectedBackgroundUI.asi.options.map(getAbilityDisplayName).join(', ')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {selectedBackgroundUI.asi.options.map(ability => (
                <div key={ability} className="p-2 bg-slate-200 dark:bg-slate-600 rounded-md">
                     <span className="text-sm font-medium mb-1 block text-center text-slate-800 dark:text-slate-200">{getAbilityDisplayName(ability)}</span>
                     <div className="flex justify-center gap-1 mt-1">
                        {[1,2].map(val => (
                             <button 
                                key={val}
                                onClick={() => handleAsiToggle(ability, val)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                    asiChoices.find(c=>c.ability === ability && c.amount === val) 
                                        ? 'bg-green-500 text-white ring-2 ring-green-300' 
                                        : 'bg-slate-400 dark:bg-slate-500 hover:bg-slate-500 dark:hover:bg-slate-400 text-slate-900 dark:text-slate-100'
                                }`}
                             >
                                +{val}
                             </button>
                        ))}
                     </div>
                </div>
              ))}
            </div>
            {asiChoices.length > 0 && <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">Seleccionado: {asiChoices.map(c => `+${c.amount} ${getAbilityDisplayName(c.ability)}`).join(', ')}</p>}
             <button 
                onClick={applyAsiChanges}
                disabled={!canApplyAsi || isAsiApplied}
                className={`font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out ${
                    isAsiApplied 
                        ? 'bg-green-700 text-white cursor-default' 
                        : canApplyAsi 
                            ? 'bg-green-600 hover:bg-green-500 text-white' 
                            : 'bg-slate-400 dark:bg-slate-500 text-slate-100 dark:text-slate-300 opacity-50 cursor-not-allowed'
                }`}
            >
                {isAsiApplied ? 'IPC Aplicado' : 'Aplicar IPC'}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-4">Elige tu Especie</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSpecies.map((sp) => ( 
            <button
              key={sp.id}
              onClick={() => handleSpeciesSelect(sp)}
              className={`p-4 rounded-lg shadow-lg transition-all duration-200 border-2 ${
                selectedSpeciesUI?.id === sp.id
                  ? 'bg-purple-600 border-purple-400 text-white scale-105'
                  : `bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-purple-500 ${sp.isCustom ? 'ring-1 ring-yellow-500 dark:ring-yellow-400' : ''}`
              }`}
            >
              <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{sp.name}{sp.isCustom ? ' (P)' : ''}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">Tamaño: {getSizeDisplayName(sp.size)}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Velocidad: {sp.speed} pies</p>
            </button>
          ))}
        </div>
         {selectedSpeciesUI && (
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-inner">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Rasgos de {selectedSpeciesUI.name}{selectedSpeciesUI.isCustom ? ' (Personalizada)' : ''}:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {selectedSpeciesUI.traits.map(trait => <li key={trait.name}><strong>{trait.name}:</strong> {trait.description}</li>)}
            </ul>
             <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Idiomas: {selectedSpeciesUI.languages.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginSelection;
