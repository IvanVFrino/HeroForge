
import React, { useState, useMemo, useEffect } from 'react';
import { CharacterSheet, Trait, SubclassDefinition, DndClass, SpellSchoolName, AbilityScoreName } from '../types';
import { SPELL_LEVEL_DISPLAY } from './sheet_tabs/SpellsTabContent'; 
import { getSpellSchoolDisplayData } from '../constants/spells';
import { ABILITY_SCORE_ES_MAP } from '../constants/displayMaps';
import { CheckCircleIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface LevelUpSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSubclassId?: string) => void;
  levelUpData: {
    oldSheet: CharacterSheet;
    newLevel: number;
    hpIncrease: number;
    newClassFeatures: Trait[];
    newSubclassFeatures: Trait[]; // Initially empty, populated if subclass chosen/exists
    proficiencyBonusChanged: boolean;
    newSpellSlots?: CharacterSheet['spellSlots'];
    newCantripsKnown?: number;
    newSpellsKnown?: number;
    availableSubclasses: SubclassDefinition[];
    isASIGainLevel: boolean;
  };
  characterClass: DndClass; 
}

const LevelUpSummaryModal: React.FC<LevelUpSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  levelUpData,
  characterClass
}) => {
  const [selectedSubclassId, setSelectedSubclassId] = useState<string | undefined>(undefined);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hp: true, features: true, spells: false, asi: false, subclass: false
  });

  useEffect(() => {
    // Reset selected subclass when modal re-opens or data changes, if no subclass previously chosen.
    if (isOpen && !levelUpData.oldSheet.subclassId) {
      setSelectedSubclassId(undefined);
    }
    // Auto-expand subclass choice section if it's time to choose
    if (isOpen && characterClass.subclassChoiceLevel === levelUpData.newLevel && !levelUpData.oldSheet.subclassId && levelUpData.availableSubclasses.length > 0) {
        setExpandedSections(prev => ({...prev, subclass: true}));
    }
  }, [isOpen, levelUpData, characterClass]);

  if (!isOpen || !levelUpData) return null;

  const {
    oldSheet, newLevel, hpIncrease, newClassFeatures,
    proficiencyBonusChanged, newSpellSlots, newCantripsKnown, newSpellsKnown,
    availableSubclasses, isASIGainLevel
  } = levelUpData;

  const oldProfBonus = oldSheet.proficiencyBonus;
  const newProfBonus = ( newLevel >= 17 ? 6 : newLevel >= 13 ? 5 : newLevel >= 9 ? 4 : newLevel >= 5 ? 3 : 2 );

  const canChooseSubclass = characterClass.subclassChoiceLevel === newLevel && !oldSheet.subclassId && availableSubclasses.length > 0;
  
  let featuresToShowInModal = [...newClassFeatures];
  if (selectedSubclassId) {
      const chosenSubDef = availableSubclasses.find(sc => sc.id === selectedSubclassId);
      if (chosenSubDef) {
          for (let lvl = 1; lvl <= newLevel; lvl++) {
              const featuresForLvl = chosenSubDef.featuresByLevel[lvl] || [];
              featuresForLvl.forEach(f => featuresToShowInModal.push({...f, source: 'Subclass'}));
          }
      }
  } else if (oldSheet.subclassId) { // If already has a subclass, show its new features
      const existingSubDef = availableSubclasses.find(sc => sc.id === oldSheet.subclassId);
      if (existingSubDef) {
          const featuresForThisLevel = existingSubDef.featuresByLevel[newLevel] || [];
          featuresForThisLevel.forEach(f => featuresToShowInModal.push({...f, source: 'Subclass'}));
      }
  }


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const renderSectionHeader = (title: string, sectionKey: string, hasContent: boolean = true) => (
    <button onClick={() => toggleSection(sectionKey)} className={`w-full flex justify-between items-center py-2 px-3 rounded-t-md ${expandedSections[sectionKey] ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`} disabled={!hasContent}>
      <span className="font-semibold">{title}</span>
      {hasContent && (expandedSections[sectionKey] ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />)}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1001]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar-level-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300">¡Subida de Nivel!</h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>
        <p className="text-lg text-slate-700 dark:text-slate-200 mb-4">
          ¡<strong className="text-purple-500">{oldSheet.name}</strong> ha alcanzado el <strong className="text-yellow-500">Nivel {newLevel}</strong>!
        </p>

        <div className="space-y-3 text-sm">
          {/* HP Increase */}
          <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
            {renderSectionHeader("Puntos de Golpe", "hp")}
            {expandedSections.hp && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300">
                <p>Puntos de Golpe Máximos: <span className="line-through text-slate-500 dark:text-slate-400">{oldSheet.maxHp}</span> <span className="font-semibold text-green-600 dark:text-green-400">➔ {oldSheet.maxHp + hpIncrease}</span> (+{hpIncrease})</p>
              </div>
            )}
          </div>

          {/* Proficiency Bonus */}
          {proficiencyBonusChanged && (
            <div className="p-3 bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-200 rounded-md border border-green-300 dark:border-green-600">
              <InformationCircleIcon className="h-5 w-5 inline mr-1.5 align-text-bottom" />
              ¡Tu Bonificador de Competencia ha aumentado a <strong className="font-bold">+{newProfBonus}</strong>!
            </div>
          )}

          {/* New Features */}
          {(featuresToShowInModal.length > 0) && (
             <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                {renderSectionHeader(`Nuevos Rasgos (${featuresToShowInModal.length})`, "features", featuresToShowInModal.length > 0)}
                {expandedSections.features && featuresToShowInModal.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 space-y-2 max-h-48 overflow-y-auto custom-scrollbar-level-up">
                        {featuresToShowInModal.map(feat => (
                            <div key={feat.name} className="border-l-2 border-purple-500 pl-2">
                                <strong className="text-purple-600 dark:text-purple-400">{feat.name}</strong> ({feat.source || 'Clase'}):
                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{feat.description}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

          {/* Spellcasting Changes */}
          {(newSpellSlots || newCantripsKnown !== undefined || newSpellsKnown !== undefined) && (
             <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                {renderSectionHeader("Lanzamiento de Conjuros", "spells", !!(newSpellSlots || newCantripsKnown !== undefined || newSpellsKnown !== undefined))}
                {expandedSections.spells && (newSpellSlots || newCantripsKnown !== undefined || newSpellsKnown !== undefined) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 space-y-1">
                    {newCantripsKnown !== undefined && oldSheet.class?.spellcasting?.progression?.[oldSheet.level]?.cantripsKnown !== newCantripsKnown && (
                        <p>Trucos Conocidos: <span className="line-through text-slate-500 dark:text-slate-400">{oldSheet.class?.spellcasting?.progression?.[oldSheet.level]?.cantripsKnown ?? 0}</span> <span className="font-semibold text-sky-600 dark:text-sky-400">➔ {newCantripsKnown}</span></p>
                    )}
                    {newSpellsKnown !== undefined && oldSheet.class?.spellcasting?.progression?.[oldSheet.level]?.spellsKnown !== newSpellsKnown && (
                        <p>Conjuros {oldSheet.class?.spellcasting?.preparationType === 'known' ? 'Conocidos' : 'Máx. Preparados'}: <span className="line-through text-slate-500 dark:text-slate-400">{oldSheet.class?.spellcasting?.progression?.[oldSheet.level]?.spellsKnown ?? 0}</span> <span className="font-semibold text-sky-600 dark:text-sky-400">➔ {newSpellsKnown}</span></p>
                    )}
                    {newSpellSlots && Object.keys(newSpellSlots).length > 0 && (
                        <div>
                            <p className="font-medium mb-0.5 text-slate-600 dark:text-slate-200">Nuevos Espacios de Conjuro:</p>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                                {Object.entries(newSpellSlots).map(([lvl, data]) => {
                                    const oldSlots = oldSheet.spellSlots?.[lvl]?.total ?? 0;
                                    if (data.total > 0 && data.total !== oldSlots) {
                                        return (<div key={lvl} className="p-1 bg-slate-100 dark:bg-slate-600 rounded">Nivel {lvl}: {data.total} {oldSlots !== 0 ? `(antes ${oldSlots})` : ''}</div>);
                                    }
                                    return null;
                                }).filter(Boolean)}
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>
          )}

          {/* ASI Gain */}
          {isASIGainLevel && (
            <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                {renderSectionHeader("Mejora de Puntuación de Característica", "asi", isASIGainLevel)}
                {expandedSections.asi && isASIGainLevel && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300">
                        <p>¡Has ganado una Mejora de Puntuación de Característica! Podrás asignarla en la pestaña de Habilidades o mediante una opción dedicada en el futuro.</p>
                    </div>
                )}
            </div>
          )}

          {/* Subclass Choice */}
          {canChooseSubclass && (
            <div className="border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                {renderSectionHeader("Elección de Subclase", "subclass", canChooseSubclass)}
                {expandedSections.subclass && canChooseSubclass && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300">
                        <p className="mb-2 font-medium">Elige tu {characterClass.name === 'Bardo' ? 'Colegio' : characterClass.name === 'Bárbaro' ? 'Camino' : 'Arquetipo/Dominio/etc.'}:</p>
                        <select value={selectedSubclassId || ''} onChange={(e) => setSelectedSubclassId(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500">
                            <option value="">-- Seleccionar Subclase --</option>
                            {availableSubclasses.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        </select>
                        {selectedSubclassId && availableSubclasses.find(sc => sc.id === selectedSubclassId)?.description && (
                            <p className="text-xs mt-1.5 p-1.5 bg-slate-100 dark:bg-slate-600 rounded italic">{availableSubclasses.find(sc => sc.id === selectedSubclassId)!.description}</p>
                        )}
                    </div>
                )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selectedSubclassId)}
            disabled={canChooseSubclass && !selectedSubclassId}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Confirmar Nivel {newLevel}
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar-level-up::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-level-up::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-level-up::-webkit-scrollbar-thumb { background: #a1a1aa; border-radius: 3px; } 
        .dark .custom-scrollbar-level-up::-webkit-scrollbar-thumb { background: #52525b; }
      `}</style>
    </div>
  );
};

export default LevelUpSummaryModal;
