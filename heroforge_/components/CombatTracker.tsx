
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { CharacterSheet, NPCData, SavedCharacterCoreData, AbilityScoreName, SkillName, Trait, ParsedNpcAttackAction, DamageType, Alignment, ABILITY_SCORE_NAMES_ORDERED, EquippedItem, WeaponDetails } from '../../types';
import { reconstructSheetFromCoreData, convertSheetToCoreData } from '../../utils/characterConverter'; 
import { calculateAllDerivedStats, calculateAbilityModifier } from '../../utils/characterCalculations';
import { performRoll, RollResult, parseDiceString, parseNpcAttackAction } from '../../utils/diceRoller';
import { PlusCircleIcon, ShieldExclamationIcon, UserCircleIcon, ArrowPathIcon, PlayIcon, StopIcon, ChevronDownIcon, ChevronRightIcon, HeartIcon, UsersIcon, ShieldCheckIcon, MinusCircleIcon, PlusIcon, SparklesIcon, DocumentTextIcon, InformationCircleIcon, CubeIcon as GenericDieIcon, SpeakerWaveIcon, TrashIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { SKILL_DEFINITIONS } from '../../constants/skills';
// CharacterSummary is not directly used for combatant cards, but might be useful for a full PC modal later.
// import CharacterSummary from './CharacterSummary'; 
import { CLASSES_DATA } from '../../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../../constants/dndBackgrounds';
import { SPECIES_DATA } from '../../constants/dndSpecies';


const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = { Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución", Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma" };
const ABILITY_SCORE_ES_SHORT: Record<AbilityScoreName, string> = { Strength: "Fue", Dexterity: "Des", Constitution: "Con", Intelligence: "Int", Wisdom: "Sab", Charisma: "Car" };
const DAMAGE_TYPE_ES_MAP: Record<DamageType, string> = { Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'};
const ALIGNMENT_ES_MAP: Record<Alignment, string> = { 'Lawful Good': 'Legal Bueno', 'Neutral Good': 'Neutral Bueno', 'Chaotic Good': 'Caótico Bueno', 'Lawful Neutral': 'Legal Neutral', 'True Neutral': 'Neutral Auténtico', 'Chaotic Neutral': 'Caótico Neutral', 'Lawful Evil': 'Legal Malvado', 'Neutral Evil': 'Neutral Malvado', 'Chaotic Evil': 'Caótico Malvado'};


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

type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';

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

  const [activeTooltipTrait, setActiveTooltipTrait] = useState<Trait | null>(null);
  const [traitTooltipPosition, setTraitTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const traitTooltipRef = useRef<HTMLDivElement>(null);
  const combatantListRef = useRef<HTMLDivElement>(null); 

  const getSkillDisplayName = (skillName: SkillName): string => SKILL_DEFINITIONS.find(s => s.name === skillName)?.nombre || skillName;


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
    setCombatants(prev => [...prev, newCombatant]);
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
    setCombatants(prev => [...prev, newCombatant]);
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
      return { ...c, initiative: initiativeRoll.total };
    });
    setCombatants(updatedCombatants.sort((a, b) => b.initiative - a.initiative));
    setLastRollResult(null); 
  };

  const startCombat = () => {
    if (combatants.length === 0 || combatants.some(c => c.initiative === 0 && combatants.length > 1)) {
      alert("Añade combatientes y tira iniciativa antes de empezar.");
      return;
    }
    setIsCombatActive(true);
    setCurrentTurnIndex(0);
    setRoundCount(1);
    setCombatants(prev => prev.map((c, index) => ({ ...c, isActiveTurn: index === 0 })));
  };
  
  const endCombat = () => {
    setIsCombatActive(false);
    setCombatants([]);
    setNpcInstanceCount({});
    setCurrentTurnIndex(0);
    setRoundCount(1);
    setLastRollResult(null);
  };

  const nextTurn = () => {
    if (!isCombatActive) return;
    let newIndex = (currentTurnIndex + 1) % combatants.length;
    if (newIndex === 0) {
      setRoundCount(prev => prev + 1);
    }
    setCurrentTurnIndex(newIndex);
    setCombatants(prev => prev.map((c, index) => ({ ...c, isActiveTurn: index === newIndex })));
    
    const activeCombatantElement = document.getElementById(`combatant-${combatants[newIndex].id}`);
    if (activeCombatantElement && combatantListRef.current) {
        const listTop = combatantListRef.current.offsetTop;
        const elementTop = activeCombatantElement.offsetTop;
        combatantListRef.current.scrollTop = elementTop - listTop - (combatantListRef.current.clientHeight / 3) ;
    }
  };

  const updateHp = (combatantId: string, amount: number) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === combatantId) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.currentHp + amount));
        return { ...c, currentHp: newHp };
      }
      return c;
    }));
  };
  
  const removeCombatant = (combatantId: string) => {
    setCombatants(prev => prev.filter(c => c.id !== combatantId));
    if (isCombatActive && combatants[currentTurnIndex]?.id === combatantId) {
        if (combatants.length -1 <= 0) { 
            endCombat();
        } else {
            let newIndex = currentTurnIndex;
            if (newIndex >= combatants.length - 1) { 
                newIndex = 0;
            }
            setCurrentTurnIndex(newIndex);
             setCombatants(prev => prev.map((c, index) => ({ ...c, isActiveTurn: index === newIndex })));
        }
    } else if (isCombatActive && currentTurnIndex > combatants.findIndex(c => c.id === combatantId)) {
        setCurrentTurnIndex(prev => prev -1);
    }
  };
  
  const toggleCombatantExpand = (combatantId: string) => {
    setCombatants(prev => prev.map(c => c.id === combatantId ? { ...c, isExpanded: !c.isExpanded } : c));
  };

  const handleCombatantAbilityCheck = (combatant: Combatant, abilityName: AbilityScoreName) => {
    let modifier = 0;
    if (combatant.type === 'PC') modifier = (combatant.entityData as CharacterSheet).abilityScoreModifiers[abilityName];
    else modifier = calculateAbilityModifier((combatant.entityData as NPCData).abilityScores[abilityName]);
    const result = performRoll(1, 20, modifier, attackRollMode);
    setLastRollResult({ ...result, description: `Prueba de ${ABILITY_SCORE_ES_MAP[abilityName]} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleCombatantSavingThrow = (combatant: Combatant, abilityName: AbilityScoreName) => {
    let modifier = 0;
    if (combatant.type === 'PC') {
        modifier = (combatant.entityData as CharacterSheet).savingThrows[abilityName]?.value || 0;
    } else {
        const npcData = combatant.entityData as NPCData;
        modifier = npcData.savingThrows?.[abilityName] ?? calculateAbilityModifier(npcData.abilityScores[abilityName]);
    }
    const result = performRoll(1, 20, modifier, attackRollMode);
    setLastRollResult({ ...result, description: `Salvación de ${ABILITY_SCORE_ES_MAP[abilityName]} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };
  
  const getPcWeaponAttackBonus = (weapon: EquippedItem, sheet: CharacterSheet): number => {
    if (!weapon.weaponDetails) return 0;
    let abilityMod = sheet.abilityScoreModifiers.Strength; // Default to Strength
    const props = weapon.weaponDetails.properties;
    const isRanged = props.includes('Range') || props.includes('Ammunition'); // Simple check

    if (props.includes('Finesse')) {
        abilityMod = Math.max(sheet.abilityScoreModifiers.Strength, sheet.abilityScoreModifiers.Dexterity);
    } else if (isRanged) { // Most ranged weapons use Dexterity
        abilityMod = sheet.abilityScoreModifiers.Dexterity;
    }
    // Simplified: Assume proficiency with equipped weapons.
    // A full check would match weapon.name or category to sheet.proficiencies.
    return abilityMod + sheet.proficiencyBonus;
  };

  const getPcWeaponDamageDetails = (weapon: EquippedItem, sheet: CharacterSheet, useVersatile: boolean = false): { dice: string, modifier: number, type: DamageType } | null => {
    if (!weapon.weaponDetails) return null;
    const wd = weapon.weaponDetails;
    let abilityMod = sheet.abilityScoreModifiers.Strength;
    const props = wd.properties;
    const isRanged = props.includes('Range') || props.includes('Ammunition');

    if (props.includes('Finesse')) {
        abilityMod = Math.max(sheet.abilityScoreModifiers.Strength, sheet.abilityScoreModifiers.Dexterity);
    } else if (isRanged) {
        abilityMod = sheet.abilityScoreModifiers.Dexterity;
    }
    // Thrown weapons use Str for damage unless Finesse.
    // Two-Handed property doesn't change damage ability, just how it's wielded.

    const diceString = (useVersatile && wd.versatileDamage) ? wd.versatileDamage : wd.damageDice;
    const { bonus: bonusFromDice } = parseDiceString(diceString); // Extract bonus baked into dice string
    
    return {
        dice: diceString,
        modifier: abilityMod + bonusFromDice, // Apply ability mod AND any bonus from the dice string itself (e.g. Flame Tongue "2d6+2")
        type: wd.damageType
    };
  };

  const handlePcWeaponAttackRoll = (combatant: Combatant, weapon: EquippedItem) => {
    if (combatant.type !== 'PC' || !weapon.weaponDetails) return;
    const sheet = combatant.entityData as CharacterSheet;
    const attackBonus = getPcWeaponAttackBonus(weapon, sheet);
    const result = performRoll(1, 20, attackBonus, attackRollMode);
    setLastRollResult({ ...result, description: `Ataque con ${weapon.name} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };
  
  const handlePcWeaponDamageRoll = (combatant: Combatant, weapon: EquippedItem, useVersatile: boolean = false) => {
    if (combatant.type !== 'PC') return;
    const sheet = combatant.entityData as CharacterSheet;
    const damageDetails = getPcWeaponDamageDetails(weapon, sheet, useVersatile);
    if (!damageDetails) return;

    const { dice, modifier, type } = damageDetails;
    const { numDice, dieSides, bonus: bonusFromDice } = parseDiceString(dice); // Bonus from dice is already in modifier
    
    if (numDice === 0 && modifier === 0) { // No dice, no mod (e.g., if dice was "0" or invalid)
      setLastRollResult({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${weapon.name} de ${combatant.name}`});
      return;
    }
    // The 'modifier' from getPcWeaponDamageDetails already includes abilityMod + bonusFromDice.
    // So, for performRoll, we pass this combined modifier.
    const result = performRoll(numDice, dieSides, modifier, 'normal');
    
    const versatileTag = useVersatile ? " (Versátil)" : "";
    setLastRollResult({ ...result, description: `Daño con ${weapon.name}${versatileTag} de ${combatant.name} (${DAMAGE_TYPE_ES_MAP[type] || type}): ${result.description}` });
  };


  const handleNpcTraitAttackRoll = (combatant: Combatant, traitName: string, parsedAttackDetails: ParsedNpcAttackAction['attack']) => {
    if (!parsedAttackDetails) return;
    const result = performRoll(1, 20, parsedAttackDetails.bonus, attackRollMode);
    setLastRollResult({ ...result, description: `Ataque con ${traitName} de ${combatant.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleNpcTraitDamageRoll = (combatant: Combatant, traitName: string, damageDetails: ParsedNpcAttackAction['hit'] | ParsedNpcAttackAction['versatile'], context: 'attack' | 'save_fail' | 'versatile' = 'attack') => {
    if (!damageDetails) return;
    const { numDice, dieSides, bonus } = parseDiceString(damageDetails.diceString);
    if (numDice === 0 && bonus === 0 && !damageDetails.diceString.match(/\d/)) { 
        setLastRollResult({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${traitName} de ${combatant.name}`});
        return;
    }
    const result = performRoll(numDice, dieSides, bonus, 'normal'); 
    let descriptionPrefix = `Daño con ${traitName} de ${combatant.name}`;
    if (context === 'save_fail') descriptionPrefix = `Daño en fallo de salvación por ${traitName} de ${combatant.name}`;
    else if (context === 'versatile') descriptionPrefix += " (Versátil)";
    const damageTypeDisplay = DAMAGE_TYPE_ES_MAP[damageDetails.damageType as DamageType] || damageDetails.damageType;
    setLastRollResult({ ...result, description: `${descriptionPrefix} (${damageTypeDisplay}): ${result.description}` });
  };

  const handleMouseEnterTrait = (trait: Trait, event: React.MouseEvent<HTMLElement>) => {
    setActiveTooltipTrait(trait);
    setTraitTooltipPosition({ top: event.clientY + 15, left: event.clientX + 15 });
  };

  const handleMouseMoveTrait = (event: React.MouseEvent<HTMLElement>) => {
    if (activeTooltipTrait && traitTooltipRef.current) {
      let newTop = event.clientY + 15;
      let newLeft = event.clientX + 15;
      const tooltipRect = traitTooltipRef.current.getBoundingClientRect();
      
      if (newLeft + tooltipRect.width > window.innerWidth - 10) newLeft = event.clientX - tooltipRect.width - 15;
      if (newTop + tooltipRect.height > window.innerHeight - 10) newTop = event.clientY - tooltipRect.height - 15;
      setTraitTooltipPosition({ top: newTop, left: newLeft });
    }
  };
  const handleMouseLeaveTrait = () => setActiveTooltipTrait(null);

 const renderCombatantDetails = (combatant: Combatant) => {
    if (combatant.type === 'PC') {
        const sheet = combatant.entityData as CharacterSheet;
        const equippedWeapons = sheet.equipment.filter(item => item.equipped && item.category === 'Weapon' && item.weaponDetails);
        return (
            <div className="text-xs space-y-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-300 mb-1">Acciones de {sheet.name}</h4>
                
                {/* Top Section: Rolls (Left) & Traits (Right) */}
                <div className="flex flex-col md:flex-row gap-2">
                    {/* Left Column: Ability Checks and Saving Throws */}
                    <div className="w-full md:w-1/2 space-y-1">
                        <div className="grid grid-cols-3 gap-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => (
                                <button key={`abs-${absName}`} onClick={(e) => { e.stopPropagation(); handleCombatantAbilityCheck(combatant, absName); }} className="btn-combat-action-tiny">
                                    Prueba {ABILITY_SCORE_ES_SHORT[absName]}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => {
                                const save = sheet.savingThrows[absName];
                                const modDisplay = save ? `${save.value >= 0 ? '+' : ''}${save.value}` : 'N/A';
                                return (
                                <button key={`sav-${absName}`} onClick={(e) => { e.stopPropagation(); handleCombatantSavingThrow(combatant, absName); }} className={`btn-combat-action-tiny ${save?.proficient ? 'font-bold text-green-700 dark:text-green-300' : ''}`}>
                                    Salvac. {ABILITY_SCORE_ES_SHORT[absName]} {modDisplay}
                                </button>
                            );})}
                        </div>
                    </div>

                    {/* Right Column: Traits */}
                    <div className="w-full md:w-1/2 space-y-1">
                        <h5 className="font-medium text-xs pt-0.5">Rasgos</h5>
                        <ul className="list-none max-h-20 overflow-y-auto text-2xs custom-scrollbar-combat-details pr-1">
                            {(sheet.featuresAndTraits || []).length > 0 ? (sheet.featuresAndTraits || []).map(trait => (
                                <li key={trait.name} 
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer truncate"
                                    title={trait.name}
                                    onMouseEnter={(e) => handleMouseEnterTrait(trait, e)}
                                    onMouseMove={handleMouseMoveTrait}
                                    onMouseLeave={handleMouseLeaveTrait}
                                    onClick={(e) => e.stopPropagation()}
                                >{trait.name}</li>
                            )) : <li className="italic text-slate-500 dark:text-slate-400">Ninguno</li>}
                        </ul>
                    </div>
                </div>

                {/* Bottom section: Weapon Actions */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h5 className="font-medium text-xs">Ataques con Armas Equipadas</h5>
                    {equippedWeapons.length > 0 ? (
                        <ul className="list-none space-y-1 text-2xs max-h-28 overflow-y-auto custom-scrollbar-combat-details pr-1">
                            {equippedWeapons.map(weapon => {
                                const attackBonus = getPcWeaponAttackBonus(weapon, sheet);
                                const damageDetails = getPcWeaponDamageDetails(weapon, sheet, false);
                                const versatileDamageDetails = weapon.weaponDetails?.versatileDamage ? getPcWeaponDamageDetails(weapon, sheet, true) : null;
                                return (
                                    <li key={weapon.instanceId} className="p-1 bg-slate-200 dark:bg-slate-600 rounded">
                                    <p className="font-medium text-slate-700 dark:text-slate-200">{weapon.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); handlePcWeaponAttackRoll(combatant, weapon); }} className="btn-combat-action-small bg-sky-600 hover:bg-sky-500 text-white">Ataque ({attackBonus >=0 ? '+' : ''}{attackBonus})</button>
                                        {damageDetails && <button onClick={(e) => { e.stopPropagation(); handlePcWeaponDamageRoll(combatant, weapon, false); }} className="btn-combat-action-small bg-red-600 hover:bg-red-500 text-white">Daño ({damageDetails.dice} {damageDetails.modifier >=0 ? '+' : ''}{damageDetails.modifier} {DAMAGE_TYPE_ES_MAP[damageDetails.type] || damageDetails.type})</button>}
                                        {versatileDamageDetails && <button onClick={(e) => { e.stopPropagation(); handlePcWeaponDamageRoll(combatant, weapon, true); }} className="btn-combat-action-small bg-orange-500 hover:bg-orange-400 text-white">Daño V. ({versatileDamageDetails.dice} {versatileDamageDetails.modifier >=0 ? '+' : ''}{versatileDamageDetails.modifier} {DAMAGE_TYPE_ES_MAP[versatileDamageDetails.type] || versatileDamageDetails.type})</button>}
                                    </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="italic text-slate-500 dark:text-slate-400 text-2xs">Ninguna arma equipada.</p>
                    )}
                </div>
                {/* Consider adding spell actions here later if applicable */}
            </div>
        );
    } else { // NPC
        const npc = combatant.entityData as NPCData;
         return (
            <div className="text-xs space-y-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-300 mb-1">Acciones de {npc.name}</h4>
                 <div className="flex flex-col md:flex-row gap-2">
                    <div className="w-full md:w-1/2 space-y-1">
                        <div className="grid grid-cols-3 gap-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => (
                                <button key={`abs-${absName}`} onClick={(e) => { e.stopPropagation(); handleCombatantAbilityCheck(combatant, absName); }} className="btn-combat-action-tiny">Prueba {ABILITY_SCORE_ES_SHORT[absName]}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => {
                                const saveBonus = npc.savingThrows?.[absName] ?? calculateAbilityModifier(npc.abilityScores[absName]);
                                const isProf = npc.savingThrows?.[absName] !== undefined && npc.savingThrows?.[absName] !== calculateAbilityModifier(npc.abilityScores[absName]);
                                return (
                                <button key={`sav-${absName}`} onClick={(e) => { e.stopPropagation(); handleCombatantSavingThrow(combatant, absName); }} className={`btn-combat-action-tiny ${isProf ? 'font-bold text-green-700 dark:text-green-300': ''}`}>Salvac. {ABILITY_SCORE_ES_SHORT[absName]} {saveBonus >= 0 ? '+' : ''}{saveBonus}</button>
                            );})}
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 space-y-1">
                         <h5 className="font-medium text-xs pt-0.5">Rasgos</h5>
                        <ul className="list-none max-h-20 overflow-y-auto text-2xs custom-scrollbar-combat-details pr-1">
                           {(npc.specialAbilities || []).length > 0 ? (npc.specialAbilities || []).map(trait => (
                                <li key={`special-${trait.name}`} 
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer truncate"
                                    title={trait.name}
                                    onMouseEnter={(e) => handleMouseEnterTrait(trait, e)}
                                    onMouseMove={handleMouseMoveTrait}
                                    onMouseLeave={handleMouseLeaveTrait}
                                    onClick={(e) => e.stopPropagation()}
                                >{trait.name}</li>
                            )) : <li className="italic text-slate-500 dark:text-slate-400">Ninguno</li>}
                        </ul>
                    </div>
                 </div>
                
                {[
                    { title: "Acciones", items: npc.actions },
                    { title: "Reacciones", items: npc.reactions }, 
                    { title: "Acciones Legendarias", items: npc.legendaryActions }
                ].map(section => section.items && section.items.length > 0 && (
                    <div key={section.title} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <h5 className="font-medium text-xs">{section.title}</h5>
                        <ul className="list-none space-y-0.5 text-2xs max-h-28 overflow-y-auto custom-scrollbar-combat-details pr-1">
                        {section.items.map((trait: Trait) => {
                            const attackDetailsToUse = trait.parsedAttack || parseNpcAttackAction(trait.description);
                            return (
                            <li key={trait.name} className="p-1 bg-slate-200 dark:bg-slate-600 rounded">
                                <span 
                                    className="font-medium text-slate-700 dark:text-slate-200 hover:text-purple-500 dark:hover:text-purple-400 cursor-pointer"
                                    onMouseEnter={(e) => handleMouseEnterTrait(trait, e)}
                                    onMouseMove={handleMouseMoveTrait}
                                    onMouseLeave={handleMouseLeaveTrait}
                                    onClick={(e) => e.stopPropagation()} 
                                >{trait.name}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                {attackDetailsToUse?.attack && (
                                    <button onClick={(e) => { e.stopPropagation(); handleNpcTraitAttackRoll(combatant, trait.name, attackDetailsToUse.attack!); }} className="btn-combat-action-small bg-sky-600 hover:bg-sky-500 text-white">Ataque</button>
                                )}
                                {attackDetailsToUse?.hit && (
                                    <button onClick={(e) => { e.stopPropagation(); handleNpcTraitDamageRoll(combatant, trait.name, attackDetailsToUse.hit!, attackDetailsToUse.savingThrow ? 'save_fail' : 'attack'); }} className="btn-combat-action-small bg-red-600 hover:bg-red-500 text-white">Daño{attackDetailsToUse.savingThrow ? ' (Fallo)' : ''}</button>
                                )}
                                {attackDetailsToUse?.versatile && attackDetailsToUse.attack && (
                                    <button onClick={(e) => { e.stopPropagation(); handleNpcTraitDamageRoll(combatant, trait.name, attackDetailsToUse.versatile!, 'versatile'); }} className="btn-combat-action-small bg-orange-500 hover:bg-orange-400 text-white">Daño (V)</button>
                                )}
                                </div>
                            </li>
                            );})}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }
  };


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
                <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-700/60 rounded-md shadow text-center text-xs" role="alert" aria-live="polite">
                    <p className="text-purple-600 dark:text-purple-300 font-semibold">{lastRollResult.description}</p>
                    <p className="text-slate-800 dark:text-slate-200 text-lg font-bold">Total: {lastRollResult.total}</p>
                    <p className="text-2xs text-slate-500 dark:text-slate-400">(Dados: [{lastRollResult.individualRolls.join(', ')}] Suma: {lastRollResult.diceSum} {lastRollResult.modifier !== 0 ? `, Mod: ${lastRollResult.modifier > 0 ? '+' : ''}${lastRollResult.modifier}` : ''})</p>
                </div>
            )}
            <button onClick={nextTurn} className="btn-primary w-full mb-4"><ArrowPathIcon className="h-5 w-5 mr-1"/>Siguiente Turno</button>
        </div>
      )}

      {combatants.length > 0 && (
        <div ref={combatantListRef} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar-combat">
          {combatants.map((c) => (
            <div 
                key={c.id} 
                id={`combatant-${c.id}`} 
                onClick={() => toggleCombatantExpand(c.id)}
                className={`p-3 rounded-lg shadow-md transition-all duration-200 cursor-pointer ${
                    c.isActiveTurn 
                        ? 'bg-purple-100 dark:bg-purple-800/60 ring-2 ring-purple-500 dark:ring-purple-400' 
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCombatantExpand(c.id);}}
                aria-expanded={c.isExpanded}
                aria-controls={`details-${c.id}`}
            >
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
                <input 
                    type="number" 
                    value={c.currentHp} 
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => {
                        const newHp = parseInt(e.target.value);
                        const diff = newHp - c.currentHp;
                        if(!isNaN(diff)) updateHp(c.id, diff);
                    }}
                    className="w-16 p-1 text-xs text-center input-field-small"
                    aria-label={`Puntos de vida de ${c.name}`}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">/ {c.maxHp} PV</span>
                <button onClick={(e) => { e.stopPropagation(); updateHp(c.id, -1); }} className="btn-hp-adjust"><MinusCircleIcon className="h-5 w-5"/></button>
                <button onClick={(e) => { e.stopPropagation(); updateHp(c.id, 1); }} className="btn-hp-adjust"><PlusCircleIcon className="h-5 w-5"/></button>
              </div>
              <div 
                id={`details-${c.id}`}
                className={`transition-max-height duration-300 ease-in-out overflow-hidden ${c.isExpanded ? 'max-h-[600px] mt-2 pt-2 border-t border-slate-200 dark:border-slate-700' : 'max-h-0'}`}
              >
                {c.isExpanded && renderCombatantDetails(c)}
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

        .btn-combat-action { padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 0.25rem; background-color: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; transition: all 0.15s ease-in-out; text-transform: uppercase; }
        .dark .btn-combat-action { background-color: #334155; color: #cbd5e1; border-color: #475569; }
        .btn-combat-action:hover { background-color: #cbd5e1; border-color: #94a3b8; }
        .dark .btn-combat-action:hover { background-color: #475569; border-color: #64748b; }
        
        .btn-combat-action-small { padding: 2px 6px; font-size: 0.65rem; border-radius: 0.25rem; transition: all 0.15s ease-in-out; text-transform: uppercase; }
        .btn-combat-action-tiny { padding: 2px 4px; font-size: 0.6rem; border-radius: 0.25rem; background-color: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; transition: all 0.15s ease-in-out; text-transform: uppercase; text-align: center; }
        .dark .btn-combat-action-tiny { background-color: #334155; color: #cbd5e1; border-color: #475569; }
        .btn-combat-action-tiny:hover { background-color: #cbd5e1; border-color: #94a3b8; }
        .dark .btn-combat-action-tiny:hover { background-color: #475569; border-color: #64748b; }


        .custom-scrollbar-combat::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar-combat::-webkit-scrollbar-track { background: #f1f5f9; }
        .dark .custom-scrollbar-combat::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar-combat::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
        .dark .custom-scrollbar-combat::-webkit-scrollbar-thumb { background: #475569; }
        .custom-scrollbar-combat::-webkit-scrollbar-thumb:hover { background: #64748b; }
        
        .custom-scrollbar-combat-details::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar-combat-details::-webkit-scrollbar-track { background: transparent; }
        .dark .custom-scrollbar-combat-details::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-combat-details::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; } /* slate-300 */
        .dark .custom-scrollbar-combat-details::-webkit-scrollbar-thumb { background: #334155; } /* slate-700 */
        .custom-scrollbar-combat-details::-webkit-scrollbar-thumb:hover { background: #94a3b8; } /* slate-400 */
        .dark .custom-scrollbar-combat-details::-webkit-scrollbar-thumb:hover { background: #475569; } /* slate-600 */

        .transition-max-height {
          transition-property: max-height, padding, margin, opacity;
          transition-timing-function: ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CombatTracker;

