
import React, { useState, useMemo } from 'react';
import { CharacterSheet, SpellDefinition, SpellSchoolName } from '../../types';
import { SPELL_SCHOOLS_DATA, getSpellSchoolDisplayData } from '../../constants/spells';
import { PlusCircleIcon, TrashIcon, MinusIcon, PlusIcon, MagnifyingGlassIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface SpellsTabContentProps {
  characterSheet: CharacterSheet;
  allSpells: SpellDefinition[]; // All available spells (custom + base in future)
  onSpellcastingUpdate: (updatedDetails: {
    knownCantrips?: string[];
    preparedSpells?: string[];
    spellSlots?: CharacterSheet['spellSlots'];
  }) => void;
}

export const SPELL_LEVEL_DISPLAY: Record<number, string> = { 0: "Truco", 1: "Nivel 1", 2: "Nivel 2", 3: "Nivel 3", 4: "Nivel 4", 5: "Nivel 5", 6: "Nivel 6", 7: "Nivel 7", 8: "Nivel 8", 9: "Nivel 9" };

const SpellsTabContent: React.FC<SpellsTabContentProps> = ({ characterSheet, allSpells, onSpellcastingUpdate }) => {
  const [searchTermCantrips, setSearchTermCantrips] = useState('');
  const [searchTermSpells, setSearchTermSpells] = useState('');

  const { knownCantrips = [], preparedSpells = [], spellSlots = {}, class: charClass, abilityScoreModifiers, level: characterLevel } = characterSheet;
  const spellcastingDetails = charClass?.spellcasting;

  const currentLevelProgression = useMemo(() => {
    return spellcastingDetails?.progression?.[characterLevel];
  }, [spellcastingDetails, characterLevel]);

  const maxCantrips = useMemo(() => {
    return currentLevelProgression?.cantripsKnown ?? 0;
  }, [currentLevelProgression]);
  
  const maxLeveledSpells = useMemo(() => {
    if (!spellcastingDetails || !currentLevelProgression) return 0;

    if (spellcastingDetails.preparationType === 'known') {
      return currentLevelProgression.spellsKnown ?? 0;
    } else if (spellcastingDetails.preparationType === 'prepared') {
      const spellcastingAbilityMod = abilityScoreModifiers[spellcastingDetails.ability] || 0;
      // General formula for full casters like Cleric, Druid, Wizard.
      // Paladins/Artificers might need specific handling if their formula (e.g., Mod + Level/2) is different.
      // For now, Mod + Level is a common pattern.
      const calculatedMax = spellcastingAbilityMod + characterLevel;
      return Math.max(1, calculatedMax); // Minimum 1 prepared spell
    }
    return 0;
  }, [spellcastingDetails, currentLevelProgression, abilityScoreModifiers, characterLevel]);


  const classSpellListIdsOrNames = useMemo(() => {
    return spellcastingDetails?.spellList || [];
  }, [spellcastingDetails]);

  const availableSpellsForClass = useMemo(() => {
    // Filter allSpells by those whose ID or name is in the class's spellList
    return allSpells.filter(spell => 
        classSpellListIdsOrNames.includes(spell.id) || classSpellListIdsOrNames.includes(spell.name)
    );
  }, [allSpells, classSpellListIdsOrNames]);

  const learnableCantrips = useMemo(() => {
    return availableSpellsForClass.filter(spell => 
      spell.level === 0 && 
      !knownCantrips.includes(spell.id) && 
      (!searchTermCantrips || spell.name.toLowerCase().includes(searchTermCantrips.toLowerCase()))
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [availableSpellsForClass, knownCantrips, searchTermCantrips]);

  const learnableSpells = useMemo(() => {
    // Only show spells up to the character's highest castable slot level
    let maxSpellLevelCharacterCanCast = 0;
    if (currentLevelProgression?.spellSlots) {
        for (let i = currentLevelProgression.spellSlots.length - 1; i >= 0; i--) {
            if (currentLevelProgression.spellSlots[i] > 0) {
                maxSpellLevelCharacterCanCast = i + 1;
                break;
            }
        }
    }

    return availableSpellsForClass.filter(spell => 
      spell.level > 0 &&
      spell.level <= maxSpellLevelCharacterCanCast && // Filter by castable level
      !preparedSpells.includes(spell.id) &&
      (!searchTermSpells || spell.name.toLowerCase().includes(searchTermSpells.toLowerCase()))
    ).sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [availableSpellsForClass, preparedSpells, searchTermSpells, currentLevelProgression]);

  const handleAddSpell = (spellId: string, isCantrip: boolean) => {
    if (isCantrip) {
      if (knownCantrips.length < maxCantrips && !knownCantrips.includes(spellId)) {
        onSpellcastingUpdate({ knownCantrips: [...knownCantrips, spellId] });
      }
    } else {
      if (preparedSpells.length < maxLeveledSpells && !preparedSpells.includes(spellId)) {
        onSpellcastingUpdate({ preparedSpells: [...preparedSpells, spellId] });
      }
    }
  };

  const handleRemoveSpell = (spellId: string, isCantrip: boolean) => {
    if (isCantrip) {
      onSpellcastingUpdate({ knownCantrips: knownCantrips.filter(id => id !== spellId) });
    } else {
      onSpellcastingUpdate({ preparedSpells: preparedSpells.filter(id => id !== spellId) });
    }
  };
  
  const handleSlotChange = (levelKey: string, change: number) => {
    const currentLevelSlots = spellSlots[levelKey];
    if (currentLevelSlots) {
      const newUsed = Math.max(0, Math.min(currentLevelSlots.total, currentLevelSlots.used + change));
      onSpellcastingUpdate({ spellSlots: { ...spellSlots, [levelKey]: { ...currentLevelSlots, used: newUsed } } });
    }
  };

  const handleTotalSlotChange = (levelKey: string, newTotal: number) => {
     const currentLevelSlots = spellSlots[levelKey] || { total: 0, used: 0};
     if (newTotal >= 0) {
        const newUsed = Math.min(newTotal, currentLevelSlots.used);
        onSpellcastingUpdate({ spellSlots: { ...spellSlots, [levelKey]: { total: newTotal, used: newUsed }}});
     }
  };

  const renderSpellListItem = (spellDef: SpellDefinition, isLearned: boolean, onToggle: () => void) => {
    const schoolDisplay = getSpellSchoolDisplayData(spellDef.school);
    return (
      <li className={`border-b border-slate-700 dark:border-gray-700 last:border-b-0 py-2 ${isLearned ? 'opacity-60' : ''}`}>
        <div className="flex items-start">
          <div className="flex-grow">
              <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100 dark:text-gray-100">{spellDef.name}</span>
                  <button onClick={onToggle} className={`p-0.5 rounded-md shadow-sm text-white ${isLearned ? 'bg-red-500 hover:bg-red-400' : 'bg-green-600 hover:bg-green-500'}`} aria-label={isLearned ? `Quitar ${spellDef.name}` : `Añadir ${spellDef.name}`}>
                      {isLearned ? <TrashIcon className="h-3.5 w-3.5" /> : <PlusCircleIcon className="h-3.5 w-3.5" />}
                  </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 text-2xs text-slate-400 dark:text-gray-400 mt-0.5">
                  <span>{SPELL_LEVEL_DISPLAY[spellDef.level]}</span>
                  {schoolDisplay && ( <span className={`px-1 py-0.5 text-3xs rounded-sm ${schoolDisplay.color} ${schoolDisplay.textColor} border ${schoolDisplay.borderColor || 'border-transparent'}`}>{schoolDisplay.nombre}</span> )}
                  {spellDef.castingTime && <span>&bull; {spellDef.castingTime}</span>}
                  {spellDef.range && <span>&bull; Alcance: {spellDef.range}</span>}
                  {spellDef.duration && <span>&bull; Duración: {spellDef.duration}</span>}
                  {spellDef.components && (
                    <span>&bull; Comp:
                      {spellDef.components.verbal && ' V'}
                      {spellDef.components.somatic && ' S'}
                      {spellDef.components.material && ` M (${spellDef.components.materialDescription || 'ver desc.'})`}
                    </span>
                  )}
              </div>
              <p className="text-xs text-slate-300 dark:text-gray-300 mt-1 whitespace-pre-line">{spellDef.description.length > 150 ? spellDef.description.substring(0, 147) + "..." : spellDef.description}</p>
              {spellDef.higherLevelDescription && <p className="text-2xs text-slate-400 dark:text-gray-400 mt-0.5 italic">A niveles sup.: {spellDef.higherLevelDescription.substring(0,100)}...</p>}
          </div>
        </div>
      </li>
    );
  };

  if (!spellcastingDetails) {
    return <p className="text-slate-400 dark:text-gray-500 italic text-sm p-2">Este personaje no tiene lanzamiento de conjuros definido por su clase.</p>;
  }
  
  const knownCantripObjects = knownCantrips.map(idOrName => allSpells.find(s => s.id === idOrName || s.name === idOrName)).filter(Boolean) as SpellDefinition[];
  const preparedSpellObjects = preparedSpells.map(idOrName => allSpells.find(s => s.id === idOrName || s.name === idOrName)).filter(Boolean) as SpellDefinition[];


  return (
    <div className="space-y-3 text-slate-200 dark:text-gray-300 text-sm">
      {/* Spell Slots Management */}
      {Object.keys(spellSlots).length > 0 && (
        <div className="p-2 md:p-3 bg-slate-750 dark:bg-gray-800/70 rounded-lg shadow-sm">
          <h4 className="text-md font-semibold text-slate-100 dark:text-gray-100 mb-1.5">Gestión de Espacios de Conjuro</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {Object.entries(spellSlots)
              .sort(([keyA], [keyB]) => parseInt(keyA.replace('level','')) - parseInt(keyB.replace('level','')))
              .map(([levelKey, slotsData]) => (
              <div key={levelKey} className="p-1.5 bg-slate-700 dark:bg-gray-700/80 rounded shadow-sm">
                <p className="text-xs font-medium text-slate-200 dark:text-gray-200 mb-0.5">Nivel {levelKey.replace('level','')}</p>
                <div className="flex items-center justify-between text-2xs"> <span className="text-slate-300 dark:text-gray-300">Usados:</span> <div className="flex items-center"> <button onClick={() => handleSlotChange(levelKey, -1)} className="p-0.5 text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30" disabled={slotsData.used <= 0} aria-label={`Reducir espacios usados Nivel ${levelKey.replace('level','')}`}> <MinusIcon className="h-3 w-3"/> </button> <span className="mx-1 w-3 text-center text-slate-100 dark:text-gray-100">{slotsData.used}</span> <button onClick={() => handleSlotChange(levelKey, 1)} className="p-0.5 text-green-400 hover:text-green-300 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-30" disabled={slotsData.used >= slotsData.total} aria-label={`Aumentar espacios usados Nivel ${levelKey.replace('level','')}`}> <PlusIcon className="h-3 w-3"/> </button> </div> </div>
                 <div className="flex items-center justify-between text-2xs mt-0.5"> <span className="text-slate-300 dark:text-gray-300">Total:</span> <input type="number" min="0" value={slotsData.total} onChange={e => handleTotalSlotChange(levelKey, parseInt(e.target.value) || 0)} className="w-8 p-0.5 text-3xs text-center bg-slate-600 dark:bg-gray-600 border border-slate-500 dark:border-gray-500 rounded text-white dark:text-gray-100" aria-label={`Total de espacios Nivel ${levelKey.replace('level','')}`}/> </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cantrips Section */}
      <div className="p-2 md:p-3 bg-slate-750 dark:bg-gray-800/70 rounded-lg shadow-sm">
        <h4 className="text-md font-semibold text-slate-100 dark:text-gray-100 mb-1.5">Trucos ({knownCantrips.length} / {maxCantrips})</h4>
        {knownCantripObjects.length > 0 && (
          <ul className="space-y-0 mb-2 max-h-48 overflow-y-auto custom-scrollbar-spells pr-1">{knownCantripObjects.map(c => renderSpellListItem(c, true, () => handleRemoveSpell(c.id, true)))}</ul>
        )}
        {knownCantrips.length < maxCantrips && (
          <div>
            <div className="relative mb-1.5">
              <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 dark:text-gray-400 absolute top-1/2 left-1.5 transform -translate-y-1/2 pointer-events-none" />
              <input type="text" value={searchTermCantrips} onChange={e => setSearchTermCantrips(e.target.value)} placeholder="Buscar trucos para aprender..." className="w-full p-1 pl-6 text-xs input-spell-search" />
            </div>
            {learnableCantrips.length > 0 ? (
                <ul className="space-y-0 max-h-40 overflow-y-auto custom-scrollbar-spells pr-1 border-t border-slate-700 dark:border-gray-700 pt-1.5">{learnableCantrips.map(c => renderSpellListItem(c, false, () => handleAddSpell(c.id, true)))}</ul>
            ) : <p className="text-2xs italic text-slate-400 dark:text-gray-400 pt-1.5 border-t border-slate-700 dark:border-gray-700">No hay más trucos disponibles para aprender o que coincidan con la búsqueda.</p>}
          </div>
        )}
      </div>

      {/* Prepared/Known Spells Section */}
      <div className="p-2 md:p-3 bg-slate-750 dark:bg-gray-800/70 rounded-lg shadow-sm">
        <h4 className="text-md font-semibold text-slate-100 dark:text-gray-100 mb-1.5">Conjuros Nivel 1+ ({preparedSpells.length} / {maxLeveledSpells})</h4>
        {preparedSpellObjects.length > 0 && (
            <ul className="space-y-0 mb-2 max-h-60 overflow-y-auto custom-scrollbar-spells pr-1">{preparedSpellObjects.map(s => renderSpellListItem(s, true, () => handleRemoveSpell(s.id, false)))}</ul>
        )}
        {preparedSpells.length < maxLeveledSpells && (
            <div>
              <div className="relative mb-1.5">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 dark:text-gray-400 absolute top-1/2 left-1.5 transform -translate-y-1/2 pointer-events-none" />
                  <input type="text" value={searchTermSpells} onChange={e => setSearchTermSpells(e.target.value)} placeholder="Buscar conjuros para preparar/aprender..." className="w-full p-1 pl-6 text-xs input-spell-search"/>
              </div>
              {learnableSpells.length > 0 ? (
                <ul className="space-y-0 max-h-48 overflow-y-auto custom-scrollbar-spells pr-1 border-t border-slate-700 dark:border-gray-700 pt-1.5">{learnableSpells.map(s => renderSpellListItem(s, false, () => handleAddSpell(s.id, false)))}</ul>
              ) : <p className="text-2xs italic text-slate-400 dark:text-gray-400 pt-1.5 border-t border-slate-700 dark:border-gray-700">No hay más conjuros disponibles o que coincidan con la búsqueda.</p>}
            </div>
        )}
      </div>
      <style>{`
            .bg-slate-750 { background-color: #283347; } 
            .dark .bg-gray-800\/70 { background-color: rgba(31, 41, 55, 0.7); } 
            .dark .bg-gray-700\/80 { background-color: rgba(55, 65, 81, 0.8); }
            .text-3xs { font-size: 0.55rem; line-height: 0.7rem; }
            .input-spell-search { background-color: #4A5568; border: 1px solid #2D3748; border-radius: 0.375rem; color: #E2E8F0; }
            .dark .input-spell-search { background-color: #2D3748; border-color: #4A5568; color: #CBD5E0; }
            .input-spell-search::placeholder { color: #A0AEC0; }
            .dark .input-spell-search::placeholder { color: #718096; }
            .custom-scrollbar-spells::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar-spells::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar-spells::-webkit-scrollbar-thumb { background: #4A5568; border-radius: 3px; }
            .dark .custom-scrollbar-spells::-webkit-scrollbar-thumb { background: #2D3748; }
       `}</style>
    </div>
  );
};

export default SpellsTabContent;
