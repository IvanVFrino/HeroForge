
import React, { useState, useEffect } from 'react';
import { useCharacter } from '../../context/CharacterContext';
import { CLASSES_DATA } from '../../constants/dndClasses';
import { SKILL_DEFINITIONS } from '../../constants/skills'; // For Spanish skill names
// Fix: Import AbilityScoreName
import { DndClass, SkillName, AbilityScoreName } from '../../types';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useHeroForge } from '../../context/HeroForgeDataContext'; // Added

const ClassSelection: React.FC = () => {
  const { character, dispatch } = useCharacter();
  const { data: heroForgeData } = useHeroForge(); // Added
  const [selectedClassUI, setSelectedClassUI] = useState<DndClass | null>(character.class || null);
  const [skillChoices, setSkillChoices] = useState<SkillName[]>(character._savedCoreDataHelper?.chosenClassSkillProficiencies || []);

  const allClasses = [...CLASSES_DATA, ...heroForgeData.customClasses]; // Added

 useEffect(() => {
    if (character.class) {
      setSelectedClassUI(character.class);
      setSkillChoices(character._savedCoreDataHelper?.chosenClassSkillProficiencies || []);
    }
  }, [character.class, character._savedCoreDataHelper?.chosenClassSkillProficiencies]);


  const handleClassSelect = (charClass: DndClass) => {
    setSelectedClassUI(charClass);
    dispatch({ type: 'SET_CLASS', payload: charClass });
    setSkillChoices([]); 
  };

  const handleSkillToggle = (skillName: SkillName) => {
    if (!selectedClassUI) return;
    
    const isCurrentlyChosen = skillChoices.includes(skillName);
    let newSkillChoices;

    if (isCurrentlyChosen) {
      newSkillChoices = skillChoices.filter(s => s !== skillName);
      dispatch({ type: 'UNCHOOSE_CLASS_SKILL', payload: skillName });
    } else {
      if (skillChoices.length < selectedClassUI.skillProficiencies.count) {
        newSkillChoices = [...skillChoices, skillName];
        dispatch({ type: 'CHOOSE_CLASS_SKILL', payload: skillName });
      } else {
        return;
      }
    }
    setSkillChoices(newSkillChoices);
  };

  const getSkillDisplayName = (skillName: SkillName): string => {
    return SKILL_DEFINITIONS.find(s => s.name === skillName)?.nombre || skillName;
  };
  
  const getAbilityDisplayName = (abilityName: AbilityScoreName): string => {
    const map: Record<AbilityScoreName, string> = {
        Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
        Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
    };
    return map[abilityName] || abilityName;
  };


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-6">Elige tu Clase</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allClasses.map((charClass) => ( // Changed CLASSES_DATA to allClasses
          <button
            key={charClass.id}
            onClick={() => handleClassSelect(charClass)}
            className={`p-4 rounded-lg shadow-lg transition-all duration-200 border-2 ${
              selectedClassUI?.id === charClass.id
                ? 'bg-purple-600 border-purple-400 text-white scale-105'
                : `bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-purple-500 ${charClass.isCustom ? 'ring-1 ring-yellow-500 dark:ring-yellow-400' : ''}`
            }`}
          >
            <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{charClass.name}{charClass.isCustom ? ' (P)' : ''}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">Dado de Golpe: d{charClass.hitDie}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Características Primarias: {charClass.primaryAbilities.map(getAbilityDisplayName).join(', ')}</p>
          </button>
        ))}
      </div>

      {selectedClassUI && (
        <div className="mt-6 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3">Detalles de {selectedClassUI.name}{selectedClassUI.isCustom ? ' (Personalizada)' : ''}</h3>
          <p className="mb-2 text-sm text-slate-700 dark:text-slate-300"><strong className="font-medium text-slate-800 dark:text-slate-200">Dado de Golpe:</strong> d{selectedClassUI.hitDie}</p>
          <p className="mb-2 text-sm text-slate-700 dark:text-slate-300"><strong className="font-medium text-slate-800 dark:text-slate-200">Tiradas de Salvación:</strong> {selectedClassUI.savingThrowProficiencies.map(getAbilityDisplayName).join(', ')}</p>
          <p className="mb-2 text-sm text-slate-700 dark:text-slate-300"><strong className="font-medium text-slate-800 dark:text-slate-200">Armaduras:</strong> {selectedClassUI.armorProficiencies.join(', ')}</p>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300"><strong className="font-medium text-slate-800 dark:text-slate-200">Armas:</strong> {selectedClassUI.weaponProficiencies.join(', ')}</p>
          
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Competencias en Habilidades (Elige {selectedClassUI.skillProficiencies.count}):</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedClassUI.skillProficiencies.choices.map((skill) => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                disabled={skillChoices.length >= selectedClassUI.skillProficiencies.count && !skillChoices.includes(skill)}
                className={`flex items-center justify-between p-2 text-sm rounded-md border transition-colors ${
                  skillChoices.includes(skill)
                    ? 'bg-green-500 border-green-400 text-white'
                    : 'bg-slate-200 dark:bg-slate-600 border-slate-400 dark:border-slate-500 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {getSkillDisplayName(skill)}
                {skillChoices.includes(skill) && <CheckCircleIcon className="h-5 w-5 ml-2 text-white" />}
              </button>
            ))}
          </div>
           {selectedClassUI.spellcasting && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Lanzamiento de Hechizos</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">Característica: {getAbilityDisplayName(selectedClassUI.spellcasting.ability)}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Trucos Conocidos (N1): {selectedClassUI.spellcasting?.progression?.[1]?.cantripsKnown ?? 'N/A'}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Hechizos {selectedClassUI.spellcasting?.preparationType === 'known' ? 'Conocidos' : 'Preparados'} (N1): {selectedClassUI.spellcasting?.progression?.[1]?.spellsKnown ?? 'N/A'}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Espacios de Hechizo (N1): {selectedClassUI.spellcasting?.progression?.[1]?.spellSlots?.[0] ?? 'N/A'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassSelection;
