
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { CharacterSheet, SavedCharacterCoreData, AbilityScoreName, ItemCategory, EquippedItem, Trait, HeroForgeData, HeroForgeAction, Alignment, AttackRollMode, SubclassDefinition, DndClass } from '../../types';
import { reconstructSheetFromCoreData, convertSheetToCoreData } from '../../utils/characterConverter';
import { calculateAllDerivedStats, getPcWeaponAttackBonus, getPcWeaponDamageDetails } from '../../utils/characterCalculations';
import CharacterSummary from './CharacterSummary';
import InventoryTabContent from './sheet_tabs/InventoryTabContent';
import SpellsTabContent from './sheet_tabs/SpellsTabContent'; 
import NotesTabContent from './sheet_tabs/NotesTabContent';
import BackgroundTabContent from './sheet_tabs/BackgroundTabContent';
import TraitsTabContent from './sheet_tabs/TraitsTabContent';
import AbilitiesTabContent from './sheet_tabs/AbilitiesTabContent';
import LevelUpSummaryModal from './LevelUpSummaryModal'; // New Modal

import { InformationCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'; 
import { GiScrollQuill, GiBookCover, GiPerspectiveDiceSixFacesRandom, GiAwareness, GiBackpack } from 'react-icons/gi'; 
import { UserCircleIcon as SheetIconTab, SparklesIcon as SpellsIconTab } from '@heroicons/react/24/outline';


import { CLASSES_DATA } from '../../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../../constants/dndBackgrounds';
import { SPECIES_DATA } from '../../constants/dndSpecies';
import { performRoll, RollResult, parseNpcAttackAction, parseDiceString } from '../../utils/diceRoller'; 
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { ABILITY_SCORE_ES_MAP, DAMAGE_TYPE_ES_MAP } from '../../constants/displayMaps';


type ActiveMainView = 'characterSheet' | 'inventory' | 'spells' | 'notes' | 'background' | 'traits' | 'abilities';

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
}> = ({ label, isActive, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`flex items-center justify-start w-full p-3 text-sm font-medium transition-colors duration-150 focus:outline-none rounded-md
                ${isActive 
                    ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-lg' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
  >
    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
    {label}
  </button>
);

const ViewCharacterSheet: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const { data: heroForgeData, dispatch: heroForgeDispatch } = useHeroForge();
  const [characterSheet, setCharacterSheet] = useState<CharacterSheet | null>(null);
  const [activeView, setActiveView] = useState<ActiveMainView>('characterSheet');
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [attackRollMode, setAttackRollMode] = useState<AttackRollMode>('normal');

  const [activeTooltipTrait, setActiveTooltipTrait] = useState<Trait | null>(null);
  const [traitTooltipPosition, setTraitTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const traitTooltipRef = useRef<HTMLDivElement>(null);

  // State for Level Up Modal
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    oldSheet: CharacterSheet;
    newLevel: number;
    hpIncrease: number;
    newClassFeatures: Trait[];
    newSubclassFeatures: Trait[];
    proficiencyBonusChanged: boolean;
    newSpellSlots?: CharacterSheet['spellSlots'];
    newCantripsKnown?: number;
    newSpellsKnown?: number;
    availableSubclasses: SubclassDefinition[];
    isASIGainLevel: boolean;
  } | null>(null);
  

  useEffect(() => {
    if (characterId) {
      const coreData = heroForgeData.characters.find(c => c.id === characterId);
      if (coreData) {
        const sheet = reconstructSheetFromCoreData(
            coreData, 
            [...CLASSES_DATA, ...heroForgeData.customClasses], 
            [...BACKGROUNDS_DATA, ...heroForgeData.customBackgrounds],
            [...SPECIES_DATA, ...heroForgeData.customSpecies]
        );
        setCharacterSheet(calculateAllDerivedStats(sheet));
      }
    }
  }, [characterId, heroForgeData]);


  const handleLevelUpInitiate = () => {
    if (!characterSheet || !characterSheet.class || characterSheet.level >= 20) {
      alert(characterSheet && characterSheet.level >= 20 ? "El personaje ya está en el nivel máximo (20)." : "No se puede subir de nivel sin datos de clase.");
      return;
    }
  
    const oldSheetForModal = JSON.parse(JSON.stringify(characterSheet)) as CharacterSheet; // Deep copy for comparison
    const newLevel = characterSheet.level + 1;
  
    const hitDie = characterSheet.class.hitDie;
    const conMod = characterSheet.abilityScoreModifiers.Constitution;
    const hpIncrease = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  
    const newClassFeatures = characterSheet.class.classFeaturesByLevel[newLevel]?.map(f => ({...f, source: 'Class'})) || [];
    // Subclass features will be determined after potential subclass selection in modal

    const oldProfBonus = characterSheet.proficiencyBonus;
    const newProfBonus = ( newLevel >= 17 ? 6 : newLevel >= 13 ? 5 : newLevel >= 9 ? 4 : newLevel >= 5 ? 3 : 2 );
    const proficiencyBonusChanged = oldProfBonus !== newProfBonus;

    let newSpellSlotsData: CharacterSheet['spellSlots'] | undefined = undefined;
    let newCantripsKnownData: number | undefined = undefined;
    let newSpellsKnownData: number | undefined = undefined;

    if(characterSheet.class.spellcasting?.progression?.[newLevel]) {
        const levelProg = characterSheet.class.spellcasting.progression[newLevel];
        newSpellSlotsData = {};
        levelProg.spellSlots.forEach((numSlots, index) => {
            const spellLevelKey = (index + 1).toString();
            newSpellSlotsData![spellLevelKey] = {
                total: numSlots,
                used: characterSheet.spellSlots?.[spellLevelKey]?.used ?? 0 
            };
        });
        newCantripsKnownData = levelProg.cantripsKnown;
        newSpellsKnownData = levelProg.spellsKnown;
    }

    const availableSubclasses = heroForgeData.customSubclasses.filter(
      sc => sc.parentClassId === characterSheet.class?.id
    );
    
    const isASIGainLevel = [4, 8, 12, 16, 19].includes(newLevel);

    setLevelUpData({
      oldSheet: oldSheetForModal,
      newLevel,
      hpIncrease,
      newClassFeatures,
      newSubclassFeatures: [], // Will be populated if subclass is chosen/exists
      proficiencyBonusChanged,
      newSpellSlots: newSpellSlotsData,
      newCantripsKnown: newCantripsKnownData,
      newSpellsKnown: newSpellsKnownData,
      availableSubclasses,
      isASIGainLevel
    });
    setShowLevelUpModal(true);
  };

  const handleLevelUpConfirm = (selectedSubclassId?: string) => {
    if (!characterSheet || !characterSheet.class || !levelUpData) return;

    const sheetCopy: CharacterSheet = JSON.parse(JSON.stringify(characterSheet));
    const { newLevel, hpIncrease, newClassFeatures } = levelUpData;

    sheetCopy.level = newLevel;
    if (sheetCopy._savedCoreDataHelper) sheetCopy._savedCoreDataHelper.level = newLevel;

    sheetCopy.maxHp += hpIncrease;
    sheetCopy.currentHp += hpIncrease; 

    sheetCopy.hitDice.total = newLevel;
    sheetCopy.hitDice.remaining = Math.min(newLevel, (sheetCopy.hitDice.remaining || 0) + 1);

    newClassFeatures.forEach(feat => {
        if (!sheetCopy.featuresAndTraits.some(existingFeat => existingFeat.name === feat.name && existingFeat.source === 'Class')) {
            sheetCopy.featuresAndTraits.push(feat);
        }
    });
    
    let newSubclassFeaturesFromModal: Trait[] = [];

    // Handle subclass selection or existing subclass features
    if (selectedSubclassId) {
      const subclassDef = heroForgeData.customSubclasses.find(sc => sc.id === selectedSubclassId);
      if (subclassDef) {
        sheetCopy.subclassId = subclassDef.id;
        sheetCopy.subclassName = subclassDef.name;
        if(sheetCopy._savedCoreDataHelper) {
            sheetCopy._savedCoreDataHelper.subclassId = subclassDef.id;
            sheetCopy._savedCoreDataHelper.subclassName = subclassDef.name;
        }
        // Add all features from this subclass up to the new level
        for (let lvl = 1; lvl <= newLevel; lvl++) {
            const featuresForThisLevel = subclassDef.featuresByLevel[lvl] || [];
            featuresForThisLevel.forEach(feat => {
                const fullFeat = {...feat, source: 'Subclass'};
                if (!sheetCopy.featuresAndTraits.some(existingFeat => existingFeat.name === feat.name && existingFeat.source === 'Subclass')) {
                    sheetCopy.featuresAndTraits.push(fullFeat);
                }
                if (lvl === newLevel) { // Collect features gained at this specific new level for the modal
                    newSubclassFeaturesFromModal.push(fullFeat);
                }
            });
        }
      }
    } else if (sheetCopy.subclassId) { // If subclass already chosen, add its new features
        const subclassDef = heroForgeData.customSubclasses.find(sc => sc.id === sheetCopy.subclassId);
        if (subclassDef) {
            const featuresForThisLevel = subclassDef.featuresByLevel[newLevel] || [];
            featuresForThisLevel.forEach(feat => {
                 const fullFeat = {...feat, source: 'Subclass'};
                if (!sheetCopy.featuresAndTraits.some(existingFeat => existingFeat.name === feat.name && existingFeat.source === 'Subclass')) {
                    sheetCopy.featuresAndTraits.push(fullFeat);
                }
                newSubclassFeaturesFromModal.push(fullFeat); // Add to modal display list
            });
        }
    }
    
    const finalSheet = calculateAllDerivedStats(sheetCopy); // Recalculates prof bonus, spell slots, etc.
    setCharacterSheet(finalSheet);

    const coreDataToSave = convertSheetToCoreData(finalSheet);
    heroForgeDispatch({ type: 'UPDATE_CHARACTER', payload: coreDataToSave });

    setShowLevelUpModal(false);
    setLevelUpData(null); 
    // Optional: Could show a success alert or toast here.
  };


  const handleEquipmentChange = (newEquipment: EquippedItem[]) => {
    if (characterSheet && characterId) {
      const updatedSheet = { ...characterSheet, equipment: newEquipment };
      const finalSheet = calculateAllDerivedStats(updatedSheet); 
      setCharacterSheet(finalSheet);
      heroForgeDispatch({ type: 'UPDATE_CHARACTER_INVENTORY', payload: { characterId, newEquipment }});
    }
  };
  
  const handleSpellcastingUpdate = (updatedDetails: { knownCantrips?: string[]; preparedSpells?: string[]; spellSlots?: CharacterSheet['spellSlots']; }) => {
    if (characterSheet && characterId) {
      const newSheetState = { ...characterSheet, ...updatedDetails };
      const finalSheet = calculateAllDerivedStats(newSheetState); 
      setCharacterSheet(finalSheet); 
      const coreDataToSave = convertSheetToCoreData(finalSheet);
      heroForgeDispatch({ type: 'UPDATE_CHARACTER', payload: coreDataToSave }); 
    }
  };

  const handleNotesUpdate = (newNotes: string) => {
    if (characterSheet && characterId) {
        const updatedSheet = {...characterSheet, _savedCoreDataHelper: { ...(characterSheet._savedCoreDataHelper || {}), notes: newNotes }};
        setCharacterSheet(updatedSheet); 
        const updatedCoreData = convertSheetToCoreData(updatedSheet);
        heroForgeDispatch({type: 'UPDATE_CHARACTER', payload: updatedCoreData});
    }
  };

  const handlePerformRoll = (description: string, dice: number, sides: number, modifier: number, mode: AttackRollMode = attackRollMode) => {
    const result = performRoll(dice, sides, modifier, mode);
    setLastRoll({ ...result, description: `${description}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleWeaponAttackRoll = (weapon: EquippedItem) => {
    if (!characterSheet) return;
    const attackBonus = getPcWeaponAttackBonus(weapon, characterSheet);
    handlePerformRoll(`Ataque con ${weapon.name}`, 1, 20, attackBonus);
  };
  
  const handleWeaponDamageRoll = (weapon: EquippedItem, useVersatile: boolean) => {
    if (!characterSheet) return;
    const damageDetails = getPcWeaponDamageDetails(weapon, characterSheet, useVersatile);
    if (!damageDetails) return;
    const { dice, modifier, type } = damageDetails;
    const { numDice, dieSides, bonus: bonusFromDiceString } = parseDiceString(dice);
    
    if (numDice === 0 && modifier === 0 && !dice.match(/\d/)) { 
        setLastRoll({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${weapon.name}`});
        return;
    }
    handlePerformRoll(`Daño con ${weapon.name}${useVersatile ? ' (Versátil)' : ''} (${DAMAGE_TYPE_ES_MAP[type] || type})`, numDice, dieSides, modifier, 'normal');
  };
  
  const handleMouseEnterTrait = (trait: Trait, event: React.MouseEvent<HTMLElement>) => {
    setActiveTooltipTrait(trait);
    setTraitTooltipPosition({ top: event.clientY + 10, left: event.clientX + 10 });
  };

  const handleMouseMoveTrait = (event: React.MouseEvent<HTMLElement>) => {
    if (activeTooltipTrait && traitTooltipRef.current) {
      let newTop = event.clientY + 10;
      let newLeft = event.clientX + 10;
      const tooltipRect = traitTooltipRef.current.getBoundingClientRect();
      if (newLeft + tooltipRect.width > window.innerWidth - 5) newLeft = event.clientX - tooltipRect.width - 5;
      if (newTop + tooltipRect.height > window.innerHeight - 5) newTop = event.clientY - tooltipRect.height - 5;
      setTraitTooltipPosition({ top: newTop, left: newLeft });
    }
  };

  const handleMouseLeaveTrait = () => setActiveTooltipTrait(null);

  if (!characterSheet) {
    return <div className="p-8 text-center text-slate-600 dark:text-slate-400">Cargando personaje o personaje no encontrado...</div>;
  }
  
  const sheetTabs = [
    { id: 'characterSheet', label: 'Hoja Principal', icon: SheetIconTab },
    { id: 'inventory', label: 'Inventario', icon: GiBackpack },
    { id: 'spells', label: 'Conjuros', icon: SpellsIconTab, disabled: !characterSheet.class?.spellcasting },
    { id: 'abilities', label: 'Puntuaciones y Habilidades', icon: GiPerspectiveDiceSixFacesRandom },
    { id: 'traits', label: 'Rasgos y Atributos', icon: GiAwareness },
    { id: 'background', label: 'Trasfondo', icon: GiBookCover },
    { id: 'notes', label: 'Notas', icon: GiScrollQuill },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <aside className="w-full md:w-60 bg-slate-200 dark:bg-slate-800 p-3 space-y-1.5 overflow-y-auto custom-scrollbar-thin flex-shrink-0 shadow-md md:shadow-lg z-10">
        <div className="mb-3 px-1">
           <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 truncate" title={characterSheet.name}>{characterSheet.name}</h2>
           <p className="text-xs text-slate-600 dark:text-slate-400">{characterSheet.class?.name} Nivel {characterSheet.level}</p>
           {characterSheet.level < 20 && (
             <button 
                onClick={handleLevelUpInitiate}
                className="mt-1.5 w-full inline-flex items-center justify-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-green-500"
                title="Subir de nivel al personaje"
             >
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1.5"/>Subir Nivel
             </button>
           )}
        </div>
        {sheetTabs.filter(tab => !tab.disabled).map(tab => (
          <TabButton
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeView === tab.id}
            onClick={() => setActiveView(tab.id as ActiveMainView)}
          />
        ))}
        <div className="pt-3 mt-3 border-t border-slate-300 dark:border-slate-700">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5 px-1">Modo de Tirada d20:</label>
            <div className="flex rounded-md shadow-sm bg-slate-300 dark:bg-slate-700 p-0.5">
                {(['advantage', 'normal', 'disadvantage'] as AttackRollMode[]).map(mode => (
                    <button key={mode} onClick={() => setAttackRollMode(mode)}
                        className={`flex-1 px-1.5 py-0.5 text-2xs rounded-sm transition-colors
                            ${attackRollMode === mode 
                                ? (mode === 'advantage' ? 'bg-green-500 text-white' : mode === 'disadvantage' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white')
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-400 dark:hover:bg-slate-600'
                            }`}
                         aria-pressed={attackRollMode === mode}
                    >{mode === 'advantage' ? 'Vent.' : mode === 'disadvantage' ? 'Desv.' : 'Norm.'}</button>
                ))}
            </div>
        </div>
        {lastRoll && (
          <div className="mt-2 p-1.5 bg-slate-300 dark:bg-slate-700 rounded-md shadow text-center text-2xs" role="status" aria-live="polite">
              <p className="text-purple-700 dark:text-purple-300 font-medium">{lastRoll.description}</p>
              <p className="text-slate-800 dark:text-slate-100 text-base font-bold">Total: {lastRoll.total}</p>
              <p className="text-3xs text-slate-500 dark:text-slate-400">(Dados: [{lastRoll.individualRolls.join(', ')}] Suma: {lastRoll.diceSum} {lastRoll.modifier !== 0 ? `, Mod: ${lastRoll.modifier > 0 ? '+' : ''}${lastRoll.modifier}` : ''})</p>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
        {activeView === 'characterSheet' && (
          <div className="bg-white dark:bg-slate-800/80 shadow-xl rounded-lg p-3 md:p-5">
            <CharacterSummary 
                sheet={characterSheet} 
                onInitiativeClick={() => handlePerformRoll(`Iniciativa de ${characterSheet.name}`, 1, 20, characterSheet.initiative)}
                onSavingThrowClick={(ability) => handlePerformRoll(`Salvación de ${ABILITY_SCORE_ES_MAP[ability]} de ${characterSheet.name}`, 1, 20, characterSheet.savingThrows[ability]?.value ?? 0)}
                onSkillClick={(skill) => handlePerformRoll(`Prueba de ${SKILL_DEFINITIONS.find(s=>s.name===skill)?.nombre} de ${characterSheet.name}`, 1, 20, characterSheet.skills[skill]?.value ?? 0)}
                onAbilityScoreClick={(ability) => handlePerformRoll(`Prueba de ${ABILITY_SCORE_ES_MAP[ability]} de ${characterSheet.name}`, 1, 20, characterSheet.abilityScoreModifiers[ability])}
                onFeatureTraitMouseEnter={handleMouseEnterTrait}
                onFeatureTraitMouseMove={handleMouseMoveTrait}
                onFeatureTraitMouseLeave={handleMouseLeaveTrait}
                onWeaponAttackRoll={(weapon) => handleWeaponAttackRoll(weapon)}
                onWeaponDamageRoll={(weapon, useVersatile) => handleWeaponDamageRoll(weapon, useVersatile)}
            />
          </div>
        )}
        {activeView === 'inventory' && characterId && <InventoryTabContent characterSheet={characterSheet} heroForgeData={heroForgeData} characterId={characterId} heroForgeDispatch={heroForgeDispatch} onEquipmentChange={handleEquipmentChange} onPerformRoll={handlePerformRoll} attackRollMode={attackRollMode} />}
        {activeView === 'spells' && characterSheet.class?.spellcasting && <SpellsTabContent characterSheet={characterSheet} allSpells={heroForgeData.customSpells} onSpellcastingUpdate={handleSpellcastingUpdate} />}
        {activeView === 'notes' && <NotesTabContent characterSheet={characterSheet} onNotesUpdate={handleNotesUpdate} />}
        {activeView === 'background' && <BackgroundTabContent characterSheet={characterSheet} />}
        {activeView === 'traits' && <TraitsTabContent characterSheet={characterSheet} onMouseEnter={handleMouseEnterTrait} onMouseMove={handleMouseMoveTrait} onMouseLeave={handleMouseLeaveTrait} />}
        {activeView === 'abilities' && <AbilitiesTabContent characterSheet={characterSheet} onRoll={handlePerformRoll} currentRollMode={attackRollMode} />}
      </main>
      
      {activeTooltipTrait && (
            <div ref={traitTooltipRef} className="fixed bg-slate-50 dark:bg-slate-900 border border-purple-500 rounded-md shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 z-[1000] max-w-md pointer-events-none" style={{ top: traitTooltipPosition.top, left: traitTooltipPosition.left, transform: 'translateY(-100%)' }} role="tooltip" aria-live="polite">
                <h6 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1.5 flex items-center"><InformationCircleIcon className="h-4 w-4 mr-1 text-purple-500 dark:text-purple-400"/> {activeTooltipTrait.name}</h6>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{activeTooltipTrait.description}</p>
                {activeTooltipTrait.source && <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 italic">Fuente: {activeTooltipTrait.source}</p>}
            </div>
        )}
      
      {showLevelUpModal && levelUpData && (
        <LevelUpSummaryModal
            isOpen={showLevelUpModal}
            onClose={() => { setShowLevelUpModal(false); setLevelUpData(null); }}
            onConfirm={handleLevelUpConfirm}
            levelUpData={levelUpData}
            characterClass={characterSheet.class as DndClass}
        />
      )}

      <style>{`
        .btn-roll-small { padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 0.25rem; background-color: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; transition: all 0.15s ease-in-out; }
        .dark .btn-roll-small { background-color: #334155; color: #cbd5e1; border-color: #475569; }
        .btn-roll-small:hover { background-color: #cbd5e1; border-color: #94a3b8; }
        .dark .btn-roll-small:hover { background-color: #475569; border-color: #64748b; }
        .btn-roll-small.proficient { border-color: #10b981; color: #047857; } 
        .dark .btn-roll-small.proficient { border-color: #34d399; color: #a7f3d0; } 
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #e5e7eb; } 
        .dark .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 5px; } 
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; } 
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; } 
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #a1a1aa; border-radius: 3px; } 
        .dark .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #52525b; } 
        .text-3xs { font-size: 0.6rem; line-height: 0.8rem; }
        .text-2xs { font-size: 0.675rem; line-height: 0.875rem; }
      `}</style>
    </div>
  );
};

export default ViewCharacterSheet;
