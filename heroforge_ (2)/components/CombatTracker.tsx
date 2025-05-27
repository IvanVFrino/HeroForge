
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { CharacterSheet, NPCData, SavedCharacterCoreData, AbilityScoreName, SkillName, Trait, AttackRollMode, EquippedItem, ParsedNpcAttackAction, DamageType } from '../../types';
import { reconstructSheetFromCoreData, convertSheetToCoreData } from '../../utils/characterConverter';
import { calculateAllDerivedStats, calculateAbilityModifier, getPcWeaponAttackBonus, getPcWeaponDamageDetails } from '../../utils/characterCalculations';
import { performRoll, RollResult, parseDiceString, parseNpcAttackAction as parseNpcActionForRoll } from '../../utils/diceRoller';
import { PlusCircleIcon, ShieldExclamationIcon, UserCircleIcon, ArrowPathIcon, PlayIcon, StopIcon, ChevronDownIcon, ChevronRightIcon, HeartIcon, UsersIcon, ShieldCheckIcon, MinusCircleIcon, PlusIcon, SparklesIcon, DocumentTextIcon, InformationCircleIcon, TrashIcon, ChevronUpIcon, ListBulletIcon as LogIcon, PaintBrushIcon } from '@heroicons/react/24/outline';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { CLASSES_DATA } from '../../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../../constants/dndBackgrounds';
import { SPECIES_DATA } from '../../constants/dndSpecies';
import CombatantDetailRenderer from './combat_tracker/CombatantDetailRenderer';
import { ABILITY_SCORE_ES_MAP, DAMAGE_TYPE_ES_MAP } from '../../constants/displayMaps';

const MAX_LOG_SIZE = 50;

type CombatantType = 'PC' | 'NPC';
interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  entityData: CharacterSheet | NPCData;
  initiative: number;
  currentHp: number;
  maxHp: number;
  isActiveTurn: boolean;
  isExpanded?: boolean;
}

const CombatTracker: React.FC = () => {
  const { data: heroForgeData, dispatch: heroForgeDispatch } = useHeroForge();
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [selectedPcId, setSelectedPcId] = useState<string>('');
  const [selectedNpcId, setSelectedNpcId] = useState<string>('');
  const [npcInstanceCount, setNpcInstanceCount] = useState<Record<string, number>>({});

  const [isCombatActive, setIsCombatActive] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [roundCount, setRoundCount] = useState(1);

  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  const [attackRollMode, setAttackRollMode] = useState<AttackRollMode>('normal');
  const [diceRollLog, setDiceRollLog] = useState<RollResult[]>([]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);


  const [activeTooltipTrait, setActiveTooltipTrait] = useState<Trait | null>(null);
  const [traitTooltipPosition, setTraitTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const traitTooltipRef = useRef<HTMLDivElement>(null);
  const combatantListRef = useRef<HTMLDivElement>(null);

  const updateLastRollAndLog = (newRoll: RollResult) => {
    setLastRollResult(newRoll);
    setDiceRollLog(prevLog => [newRoll, ...prevLog.slice(0, MAX_LOG_SIZE - 1)]);
  };

  const clearDiceLog = () => {
    setDiceRollLog([]);
    setLastRollResult(null); 
  };


  const addPcToCombat = () => {
    if (!selectedPcId) return;
    const pcCoreData = heroForgeData.characters.find(c => c.id === selectedPcId);
    if (!pcCoreData) return;

    const pcSheet = reconstructSheetFromCoreData(
      pcCoreData,
      [...CLASSES_DATA, ...heroForgeData.customClasses],
      [...BACKGROUNDS_DATA, ...heroForgeData.customBackgrounds],
      [...SPECIES_DATA, ...heroForgeData.customSpecies]
    );
    const fullPcSheet = calculateAllDerivedStats(pcSheet);

    const newCombatant: Combatant = {
      id: `pc-${fullPcSheet._savedCoreDataHelper!.id}-${Date.now()}`,
      name: fullPcSheet.name,
      type: 'PC',
      entityData: fullPcSheet,
      initiative: 0,
      currentHp: fullPcSheet.maxHp,
      maxHp: fullPcSheet.maxHp,
      isActiveTurn: false,
    };
    setCombatants(prev => [...prev, newCombatant].sort((a,b) => b.initiative - a.initiative || a.name.localeCompare(b.name)));
    setSelectedPcId('');
  };

  const addNpcToCombat = () => {
    if (!selectedNpcId) return;
    const npcDefinition = heroForgeData.customNPCs.find(n => n.id === selectedNpcId);
    if (!npcDefinition) return;

    const instanceNum = (npcInstanceCount[selectedNpcId] || 0) + 1;
    setNpcInstanceCount(prev => ({ ...prev, [selectedNpcId]: instanceNum }));

    const newCombatant: Combatant = {
      id: `npc-${npcDefinition.id}-${instanceNum}-${Date.now()}`,
      name: `${npcDefinition.name} #${instanceNum}`,
      type: 'NPC',
      entityData: npcDefinition,
      initiative: 0,
      currentHp: npcDefinition.hitPoints,
      maxHp: npcDefinition.hitPoints,
      isActiveTurn: false,
    };
    setCombatants(prev => [...prev, newCombatant].sort((a,b) => b.initiative - a.initiative || a.name.localeCompare(b.name)));
  };

  const rollInitiativeForAll = () => {
    const updatedCombatants = combatants.map(c => {
      let modifier = 0;
      if (c.type === 'PC') {
        modifier = (c.entityData as CharacterSheet).initiative;
      } else {
        modifier = calculateAbilityModifier((c.entityData as NPCData).abilityScores.Dexterity);
      }
      const initiativeRoll = performRoll(1, 20, modifier, 'normal');
      updateLastRollAndLog({ ...initiativeRoll, description: `Iniciativa para ${c.name}: ${initiativeRoll.description}` });
      return { ...c, initiative: initiativeRoll.total };
    });
    setCombatants(updatedCombatants.sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name)));
  };

  const startCombat = () => {
    if (combatants.length === 0) { alert("Añade combatientes antes de empezar."); return; }
    if (combatants.some(c => c.initiative === 0 && combatants.length > 1)) {
        if (!window.confirm("Algunos combatientes tienen iniciativa 0. ¿Deseas continuar y tirar iniciativa para ellos individualmente o usar 0? Se recomienda tirar iniciativa para todos primero.")) return;
    }
    const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    setIsCombatActive(true); setCurrentTurnIndex(0); setRoundCount(1);
    setCombatants(sortedCombatants.map((c, index) => ({ ...c, isActiveTurn: index === 0 })));
    setDiceRollLog([]); setLastRollResult(null);
  };

  const endCombat = () => {
    setIsCombatActive(false); setCombatants([]); setNpcInstanceCount({});
    setCurrentTurnIndex(0); setRoundCount(1); setLastRollResult(null);
  };

  const nextTurn = () => {
    if (!isCombatActive || combatants.length === 0) return;
    let newIndex = (currentTurnIndex + 1) % combatants.length;
    if (newIndex === 0) setRoundCount(prev => prev + 1);
    setCurrentTurnIndex(newIndex);
    setCombatants(prev => prev.map((c, index) => ({ ...c, isActiveTurn: index === newIndex })));

    if (combatants.length > 0 && combatants[newIndex]) {
        const activeCombatantElement = document.getElementById(`combatant-${combatants[newIndex].id}`);
        if (activeCombatantElement && combatantListRef.current) {
            const listRect = combatantListRef.current.getBoundingClientRect();
            const elementRect = activeCombatantElement.getBoundingClientRect();
            const scrollOffset = elementRect.top - listRect.top - (listRect.height / 3) + combatantListRef.current.scrollTop;
            combatantListRef.current.scrollTo({ top: scrollOffset, behavior: 'smooth' });
        }
    }
  };

  const updateHp = (combatantId: string, amount: number) => {
    setCombatants(prev => prev.map(c => c.id === combatantId ? { ...c, currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + amount)) } : c));
  };

  const removeCombatant = (combatantId: string) => {
    const combatantToRemove = combatants.find(c => c.id === combatantId);
    if (!combatantToRemove) return;
    const wasActiveCombatant = combatantToRemove.isActiveTurn;
    const remainingCombatants = combatants.filter(c => c.id !== combatantId);
    if (remainingCombatants.length === 0) { endCombat(); return; }
    if (isCombatActive) {
        let newTurnIndex = currentTurnIndex;
        const removedCombatantOldIndex = combatants.findIndex(c => c.id === combatantId);
        if (wasActiveCombatant) {
            newTurnIndex = removedCombatantOldIndex;
            if (newTurnIndex >= remainingCombatants.length) {
                newTurnIndex = 0; if (remainingCombatants.length > 0 && combatants.length > 1) setRoundCount(prev => prev + 1);
            }
        } else {
            const activeCombatantOriginalId = combatants[currentTurnIndex]?.id;
            const newIndexOfOldActive = remainingCombatants.findIndex(c => c.id === activeCombatantOriginalId);
            newTurnIndex = newIndexOfOldActive !== -1 ? newIndexOfOldActive : 0;
        }
        setCurrentTurnIndex(newTurnIndex);
        setCombatants(remainingCombatants.map((c, index) => ({ ...c, isActiveTurn: index === newTurnIndex })));
    } else {
        setCombatants(remainingCombatants);
    }
  };

  const toggleCombatantExpand = (combatantId: string) => {
    setCombatants(prev => prev.map(c => c.id === combatantId ? { ...c, isExpanded: !c.isExpanded } : c));
  };

    const handleCombatantAbilityCheck = (combatant: Combatant, ability: AbilityScoreName) => {
        const modifier = combatant.type === 'PC'
            ? (combatant.entityData as CharacterSheet).abilityScoreModifiers[ability]
            : calculateAbilityModifier((combatant.entityData as NPCData).abilityScores[ability]);
        const result = performRoll(1, 20, modifier, attackRollMode);
        updateLastRollAndLog({ ...result, description: `Prueba de ${ABILITY_SCORE_ES_MAP[ability]} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
    };

    const handleCombatantSavingThrow = (combatant: Combatant, ability: AbilityScoreName) => {
        let modifier;
        if (combatant.type === 'PC') {
            modifier = (combatant.entityData as CharacterSheet).savingThrows[ability]?.value ?? (combatant.entityData as CharacterSheet).abilityScoreModifiers[ability];
        } else {
            modifier = (combatant.entityData as NPCData).savingThrows?.[ability] ?? calculateAbilityModifier((combatant.entityData as NPCData).abilityScores[ability]);
        }
        const result = performRoll(1, 20, modifier, attackRollMode);
        updateLastRollAndLog({ ...result, description: `Salvación de ${ABILITY_SCORE_ES_MAP[ability]} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
    };
    
    const handlePcWeaponAttackRoll = (combatant: Combatant, weapon: EquippedItem) => {
        if (combatant.type !== 'PC') return;
        const sheet = combatant.entityData as CharacterSheet;
        const attackBonus = getPcWeaponAttackBonus(weapon, sheet);
        const result = performRoll(1, 20, attackBonus, attackRollMode);
        updateLastRollAndLog({ ...result, description: `Ataque de ${combatant.name} con ${weapon.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
    };

    const handlePcWeaponDamageRoll = (combatant: Combatant, weapon: EquippedItem, useVersatile: boolean = false) => {
        if (combatant.type !== 'PC') return;
        const sheet = combatant.entityData as CharacterSheet;
        const damageDetails = getPcWeaponDamageDetails(weapon, sheet, useVersatile);
        if (!damageDetails) return;
        const { dice, modifier, type } = damageDetails;
        const { numDice, dieSides, bonus: bonusFromDiceString } = parseDiceString(dice);
        if (numDice === 0 && modifier === 0 && !dice.match(/\d/)) { 
            updateLastRollAndLog({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${weapon.name}`});
            return;
        }
        const result = performRoll(numDice, dieSides, modifier);
        updateLastRollAndLog({ ...result, description: `Daño de ${combatant.name} con ${weapon.name}${useVersatile ? ' (Versátil)' : ''} (${DAMAGE_TYPE_ES_MAP[type] || type}): ${result.description}` });
    };
    
    const handleNpcTraitAttackRoll = (combatant: Combatant, traitName: string, parsedAttackDetails: NonNullable<Trait['parsedAttack']>['attack']) => {
        if (!parsedAttackDetails) return;
        const result = performRoll(1, 20, parsedAttackDetails.bonus, attackRollMode);
        updateLastRollAndLog({ ...result, description: `Ataque de ${combatant.name} con ${traitName}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
    };

    const handleNpcTraitDamageRoll = (combatant: Combatant, traitName: string, damageDetails: NonNullable<Trait['parsedAttack']>['hit'] | NonNullable<Trait['parsedAttack']>['versatile'], context: 'attack' | 'save_fail' | 'versatile' = 'attack') => {
        if (!damageDetails) return;
        const { numDice, dieSides, bonus } = parseDiceString(damageDetails.diceString);
         if (numDice === 0 && bonus === 0 && !damageDetails.diceString.match(/\d/)) { 
            updateLastRollAndLog({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${traitName}`});
            return;
        }
        const result = performRoll(numDice, dieSides, bonus, 'normal');
        let descriptionPrefix = `Daño de ${combatant.name} con ${traitName}`;
        if (context === 'save_fail') descriptionPrefix = `Daño en fallo de salvación por ${traitName}`;
        else if (context === 'versatile') descriptionPrefix += " (Versátil)";
        const damageTypeDisplay = DAMAGE_TYPE_ES_MAP[damageDetails.damageType as DamageType] || damageDetails.damageType;
        updateLastRollAndLog({ ...result, description: `${descriptionPrefix} (${damageTypeDisplay}): ${result.description}` });
    };


  const handleMouseEnterTrait = (trait: Trait, event: React.MouseEvent<HTMLElement>) => {
    setActiveTooltipTrait(trait);
    setTraitTooltipPosition({ top: event.clientY + 15, left: event.clientX + 15 });
  };
  const handleMouseMoveTrait = (event: React.MouseEvent<HTMLElement>) => {
    if (activeTooltipTrait && traitTooltipRef.current) {
      let newTop = event.clientY + 15; let newLeft = event.clientX + 15;
      const tooltipRect = traitTooltipRef.current.getBoundingClientRect();
      if (newLeft + tooltipRect.width > window.innerWidth - 10) newLeft = event.clientX - tooltipRect.width - 15;
      if (newTop + tooltipRect.height > window.innerHeight - 10) newTop = event.clientY - tooltipRect.height - 15;
      setTraitTooltipPosition({ top: newTop, left: newLeft });
    }
  };
  const handleMouseLeaveTrait = () => setActiveTooltipTrait(null);


  return (
    <div className="container mx-auto p-4 md:p-6 max-w-full">
      <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-6 text-center flex items-center justify-center">
        <ShieldCheckIcon className="h-10 w-10 mr-3 text-green-500 dark:text-green-400" />
        Gestor de Combate
      </h1>

      {!isCombatActive ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl mb-6 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-3">Preparación del Combate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pcSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Añadir Personaje Jugador:</label>
              <select id="pcSelect" value={selectedPcId} onChange={e => setSelectedPcId(e.target.value)} className="mt-1 input-field">
                <option value="">-- Seleccionar PC --</option>
                {heroForgeData.characters.map(pc => <option key={pc.id} value={pc.id}>{pc.characterName}</option>)}
              </select>
              <button onClick={addPcToCombat} disabled={!selectedPcId} className="mt-2 btn-secondary w-full"><PlusCircleIcon className="h-5 w-5 mr-1"/>Añadir PC</button>
            </div>
            <div>
              <label htmlFor="npcSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Añadir PNJ/Monstruo:</label>
              <select id="npcSelect" value={selectedNpcId} onChange={e => setSelectedNpcId(e.target.value)} className="mt-1 input-field">
                <option value="">-- Seleccionar PNJ --</option>
                {heroForgeData.customNPCs.map(npc => <option key={npc.id} value={npc.id}>{npc.name}</option>)}
              </select>
              <button onClick={addNpcToCombat} disabled={!selectedNpcId} className="mt-2 btn-secondary w-full"><PlusCircleIcon className="h-5 w-5 mr-1"/>Añadir PNJ</button>
            </div>
          </div>
          {combatants.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button onClick={rollInitiativeForAll} className="btn-primary flex-1"><UserCircleIcon className="h-5 w-5 mr-1"/>Tirar Iniciativa para Todos</button>
              <button onClick={startCombat} className="btn-success flex-1"><PlayIcon className="h-5 w-5 mr-1"/>Empezar Combate</button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg shadow-xl mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
                    Combate Activo - Ronda {roundCount} - Turno de: <span className="text-purple-600 dark:text-purple-300">{combatants[currentTurnIndex]?.name || 'N/A'}</span>
                </h2>
                <button onClick={endCombat} className="btn-danger"><StopIcon className="h-5 w-5 mr-1"/>Terminar Combate</button>
            </div>
             <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Modo de Tirada d20:</label>
                <div className="flex rounded-md shadow-sm bg-slate-100 dark:bg-slate-700 p-0.5 max-w-xs">
                    {(['advantage', 'normal', 'disadvantage'] as AttackRollMode[]).map(mode => (
                        <button key={mode} onClick={() => setAttackRollMode(mode)}
                            className={`flex-1 px-2 py-1 text-xs rounded-sm transition-colors
                                ${attackRollMode === mode 
                                    ? (mode === 'advantage' ? 'bg-green-500 text-white' : mode === 'disadvantage' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white')
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                             aria-pressed={attackRollMode === mode}
                        >{mode === 'advantage' ? 'Ventaja' : mode === 'disadvantage' ? 'Desventaja' : 'Normal'}</button>
                    ))}
                </div>
            </div>
            {lastRollResult && (
                <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700/60 rounded-md shadow text-center min-h-[70px] flex flex-col justify-center" role="alert" aria-live="polite">
                    <p className="text-purple-600 dark:text-purple-300 font-semibold text-sm">{lastRollResult.description}</p>
                    <p className="text-slate-800 dark:text-slate-100 text-xl font-bold my-0.5">Total: {lastRollResult.total}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                    (Dados: [{lastRollResult.individualRolls.join(', ')}] Suma: {lastRollResult.diceSum}
                    {lastRollResult.modifier !== 0 ? `, Mod: ${lastRollResult.modifier > 0 ? '+' : ''}${lastRollResult.modifier}` : ''})
                    </p>
                </div>
            )}
            <button onClick={nextTurn} className="btn-primary w-full mb-4"><ArrowPathIcon className="h-5 w-5 mr-1"/>Siguiente Turno</button>
        </div>
      )}

      {isCombatActive && (
        <div className="mb-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
          <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-colors" onClick={() => setIsLogExpanded(!isLogExpanded)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsLogExpanded(!isLogExpanded);}} aria-expanded={isLogExpanded} aria-controls="dice-log-content">
            <div className="flex items-center"><LogIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" /><h3 className="text-md font-semibold text-slate-700 dark:text-slate-200">Registro de Tiradas ({diceRollLog.length})</h3></div>
            <div className="flex items-center">{diceRollLog.length > 0 && (<button onClick={(e) => { e.stopPropagation(); clearDiceLog(); }} className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 p-1 mr-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center" title="Limpiar Registro"><PaintBrushIcon className="h-3.5 w-3.5 mr-1"/> Limpiar</button>)}{isLogExpanded ? <ChevronUpIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" /> : <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />}</div>
          </div>
          {isLogExpanded && (<div id="dice-log-content" className="p-3 max-h-60 overflow-y-auto custom-scrollbar-combat">{diceRollLog.length === 0 ? (<p className="text-sm text-slate-500 dark:text-slate-400 italic text-center">Aún no hay tiradas registradas.</p>) : (<ul className="space-y-1.5">{diceRollLog.map((roll, index) => (<li key={index} className="text-xs p-1.5 bg-slate-50 dark:bg-slate-700/70 rounded shadow-sm"><p className="font-medium text-slate-700 dark:text-slate-200">{roll.description}</p><div className="flex justify-between items-baseline"><p className="text-lg font-bold text-purple-600 dark:text-purple-300"> {roll.total}</p><p className="text-2xs text-slate-500 dark:text-slate-400">(Dados: [{roll.individualRolls.join(', ')}] Suma: {roll.diceSum}{roll.modifier !== 0 ? `, Mod: ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : ''})</p></div></li>))}</ul>)}</div>)}
        </div>
      )}

      {combatants.length > 0 && (
        <div ref={combatantListRef} className="space-y-3 max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-350px)] md:max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar-combat">
          {combatants.map((c) => (
            <div key={c.id} id={`combatant-${c.id}`} onClick={() => toggleCombatantExpand(c.id)} className={`p-3 rounded-lg shadow-md transition-all duration-200 cursor-pointer ${c.isActiveTurn ? 'bg-purple-100 dark:bg-purple-800/60 ring-2 ring-purple-500 dark:ring-purple-400' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCombatantExpand(c.id);}} aria-expanded={c.isExpanded} aria-controls={`details-${c.id}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h3 className={`text-lg font-semibold ${c.isActiveTurn ? 'text-purple-700 dark:text-purple-200' : 'text-slate-800 dark:text-slate-100'}`}>{c.name} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({c.type === 'PC' ? 'PC' : 'PNJ'})</span></h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Iniciativa: {c.initiative}</p>
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  {!isCombatActive && <button onClick={(e) => {e.stopPropagation(); removeCombatant(c.id);}} title="Eliminar del Combate" className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"><TrashIcon className="h-5 w-5"/></button>}
                   {c.isExpanded ? <ChevronUpIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : <ChevronDownIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <HeartIcon className={`h-5 w-5 ${c.currentHp > 0 ? 'text-red-500' : 'text-slate-500'}`} />
                <input type="number" value={c.currentHp} onClick={(e) => e.stopPropagation()} onChange={(e) => { const newHp = parseInt(e.target.value); if(!isNaN(newHp) && newHp >=0 && newHp <= c.maxHp) { const diff = newHp - c.currentHp; updateHp(c.id, diff); } else if (e.target.value === '') { updateHp(c.id, -c.currentHp); }}} className="w-16 p-1 text-xs text-center input-field-small" aria-label={`Puntos de vida de ${c.name}`}/>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ {c.maxHp} PV</span>
                <button onClick={(e) => { e.stopPropagation(); updateHp(c.id, -1); }} className="btn-hp-adjust"><MinusCircleIcon className="h-5 w-5"/></button>
                <button onClick={(e) => { e.stopPropagation(); updateHp(c.id, 1); }} className="btn-hp-adjust"><PlusCircleIcon className="h-5 w-5"/></button>
              </div>
              <div id={`details-${c.id}`} className={`transition-max-height duration-300 ease-in-out overflow-hidden ${c.isExpanded ? 'max-h-[600px] mt-2 pt-2 border-t border-slate-200 dark:border-slate-700' : 'max-h-0'}`}>
                {c.isExpanded && 
                    <CombatantDetailRenderer 
                        combatant={c} 
                        onAbilityCheck={handleCombatantAbilityCheck} 
                        onSavingThrow={handleCombatantSavingThrow} 
                        onPcWeaponAttack={handlePcWeaponAttackRoll}
                        onPcWeaponDamage={handlePcWeaponDamageRoll}
                        onNpcTraitAttack={handleNpcTraitAttackRoll}
                        onNpcTraitDamage={handleNpcTraitDamageRoll}
                        onMouseEnterTrait={handleMouseEnterTrait}
                        onMouseMoveTrait={handleMouseMoveTrait}
                        onMouseLeaveTrait={handleMouseLeaveTrait}
                    />
                }
              </div>
            </div>
          ))}
        </div>
      )}
       {activeTooltipTrait && (
            <div ref={traitTooltipRef} className="fixed bg-slate-100 dark:bg-slate-900 border border-purple-500 rounded-md shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 z-[1000] max-w-md pointer-events-none" style={{ top: traitTooltipPosition.top, left: traitTooltipPosition.left, transform: 'translateY(-100%)' }} role="tooltip">
                <h6 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1.5 flex items-center"><InformationCircleIcon className="h-4 w-4 mr-1 text-purple-500 dark:text-purple-400"/> {activeTooltipTrait.name}</h6>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{activeTooltipTrait.description}</p>
                {activeTooltipTrait.source && <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 italic">Fuente: {activeTooltipTrait.source}</p>}
            </div>
        )}
      <style>{`
        .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
        .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
        .input-field-small { margin-top: 0; display: block; width: auto; padding: 0.25rem 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.75rem; color: #111827; }
        .dark .input-field-small { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
        .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #4f46e5; }
        .dark .btn-primary { background-color: #818cf8; color: #1e1b4b; }
        .btn-primary:hover { background-color: #4338ca; } .dark .btn-primary:hover { background-color: #67e8f9; }
        .btn-primary:disabled { background-color: #a5b4fc; cursor: not-allowed; } .dark .btn-primary:disabled { background-color: #475569; }
        .btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #64748b; }
        .dark .btn-secondary { background-color: #475569; }
        .btn-secondary:hover { background-color: #475569; } .dark .btn-secondary:hover { background-color: #334155; }
        .btn-secondary:disabled { background-color: #cbd5e1; cursor: not-allowed; } .dark .btn-secondary:disabled { background-color: #1e293b; }
        .btn-success { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #16a34a; }
        .dark .btn-success { background-color: #22c55e; color: #052e16; }
        .btn-success:hover { background-color: #15803d; } .dark .btn-success:hover { background-color: #16a34a; }
        .btn-danger { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #dc2626; }
        .dark .btn-danger { background-color: #f87171; color: #450a0a; }
        .btn-danger:hover { background-color: #b91c1c; } .dark .btn-danger:hover { background-color: #ef4444; }
        .btn-hp-adjust { padding: 0.25rem; color: #4b5563; } .dark .btn-hp-adjust { color: #9ca3af; }
        .btn-hp-adjust:hover { color: #1f2937; } .dark .btn-hp-adjust:hover { color: #e5e7eb; }
        .custom-scrollbar-combat::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar-combat::-webkit-scrollbar-track { background: #f1f5f9; }
        .dark .custom-scrollbar-combat::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar-combat::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
        .dark .custom-scrollbar-combat::-webkit-scrollbar-thumb { background: #475569; }
        .custom-scrollbar-combat::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .transition-max-height { transition-property: max-height, padding, margin, opacity; transition-timing-function: ease-in-out; }
        .text-2xs { font-size: 0.675rem; line-height: 0.875rem; }
      `}</style>
    </div>
  );
};

export default CombatTracker;
