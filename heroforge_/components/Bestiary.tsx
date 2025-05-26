
import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { NPCData, Size, Alignment, AbilityScoreName, SkillName, ParsedNpcAttackAction, Trait, DamageType } from '../../types';
import { EyeIcon, PlusCircleIcon, TrashIcon, ShieldExclamationIcon, ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, FunnelIcon, CubeIcon as GenericDieIcon } from '@heroicons/react/24/outline';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { performRoll, RollResult, parseNpcAttackAction, parseDiceString } from '../../utils/diceRoller';

const ALIGNMENT_ES: Record<Alignment, string> = {
  'Lawful Good': 'Legal Bueno', 'Neutral Good': 'Neutral Bueno', 'Chaotic Good': 'Caótico Bueno',
  'Lawful Neutral': 'Legal Neutral', 'True Neutral': 'Neutral Auténtico', 'Chaotic Neutral': 'Caótico Neutral',
  'Lawful Evil': 'Legal Malvado', 'Neutral Evil': 'Neutral Malvado', 'Chaotic Evil': 'Caótico Malvado',
};
const SIZE_ES_MAP: Record<Size, string> = {
    Tiny: "Diminuta", Small: "Pequeña", Medium: "Mediana", Large: "Grande", Huge: "Enorme", Gargantuan: "Gargantuesca"
};
const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = {
    Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
    Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
};
const ABILITY_SCORE_ES_SHORT: Record<AbilityScoreName, string> = {
    Strength: "Fue", Dexterity: "Des", Constitution: "Con",
    Intelligence: "Int", Wisdom: "Sab", Charisma: "Car"
};
const DAMAGE_TYPE_ES_MAP: Record<DamageType, string> = {
  Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'
};

type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';

const Bestiary: React.FC = () => {
  const { data: heroForgeData, dispatch } = useHeroForge();
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  const [attackRollMode, setAttackRollMode] = useState<AttackRollMode>('normal');
  
  const calculateModifier = (score: number): number => Math.floor((score - 10) / 2);
  const getSkillDisplayName = (skillName: SkillName): string => SKILL_DEFINITIONS.find(s => s.name === skillName)?.nombre || skillName;

  const handleDeleteNpc = (npcId: string, npcName: string) => {
    dispatch({ type: 'DELETE_CUSTOM_NPC', payload: npcId });
    if (expandedNpcId === npcId) {
        setExpandedNpcId(null);
    }
  };

  const uniqueChallengeRatings = useMemo(() => {
    const crs = new Set(heroForgeData.customNPCs.map(npc => npc.challengeRating));
    return Array.from(crs).sort((a,b) => {
        const valA = a.includes('/') ? parseFloat(a.split('/')[0]) / parseFloat(a.split('/')[1]) : parseFloat(a);
        const valB = b.includes('/') ? parseFloat(b.split('/')[0]) / parseFloat(b.split('/')[1]) : parseFloat(b);
        return valA - valB;
    });
  }, [heroForgeData.customNPCs]);

  const filteredNpcs = useMemo(() => {
    return heroForgeData.customNPCs.filter(npc => {
      const nameMatch = npc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const crMatch = challengeFilter === 'all' || npc.challengeRating === challengeFilter;
      return nameMatch && crMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [heroForgeData.customNPCs, searchQuery, challengeFilter]);

  const handleNpcAbilityCheckRoll = (npc: NPCData, abilityName: AbilityScoreName) => {
    const modifier = calculateModifier(npc.abilityScores[abilityName]);
    const result = performRoll(1, 20, modifier, attackRollMode);
    setLastRollResult({ ...result, description: `Prueba de ${ABILITY_SCORE_ES_MAP[abilityName]} de ${npc.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleNpcSavingThrowRoll = (npc: NPCData, abilityName: AbilityScoreName) => {
    let modifier = calculateModifier(npc.abilityScores[abilityName]);
    if (npc.savingThrows && npc.savingThrows[abilityName] !== undefined) {
        // If savingThrows stores the full bonus, use it directly.
        // If it stores just proficiency bonus value, add it.
        // Assuming npc.savingThrows[abilityName] IS the final save bonus (mod + prof if applicable)
        modifier = npc.savingThrows[abilityName]!; 
    }
    const result = performRoll(1, 20, modifier, attackRollMode);
    setLastRollResult({ ...result, description: `Salvación de ${ABILITY_SCORE_ES_MAP[abilityName]} de ${npc.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };


  const handleNpcActionAttackRoll = (actionName: string, parsedAttackDetails: ParsedNpcAttackAction['attack']) => {
    if (!parsedAttackDetails) return;
    const result = performRoll(1, 20, parsedAttackDetails.bonus, attackRollMode);
    setLastRollResult({ ...result, description: `Ataque con ${actionName}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleNpcActionDamageRoll = (actionName: string, damageDetails: ParsedNpcAttackAction['hit'] | ParsedNpcAttackAction['versatile'], context: 'attack' | 'save_fail' | 'versatile' = 'attack') => {
    if (!damageDetails) return;
    const { numDice, dieSides, bonus } = parseDiceString(damageDetails.diceString);
    if (numDice === 0 && bonus === 0 && !damageDetails.diceString.match(/\d/)) { 
        setLastRollResult({individualRolls:[], diceSum:0, modifier:0, total:0, description: `No se pudo parsear el daño para ${actionName}`});
        return;
    }
    const result = performRoll(numDice, dieSides, bonus, 'normal'); 
    
    let descriptionPrefix = `Daño con ${actionName}`;
    if (context === 'save_fail') descriptionPrefix = `Daño en fallo de salvación por ${actionName}`;
    else if (context === 'versatile') descriptionPrefix += " (Versátil)";
    
    const damageTypeDisplay = DAMAGE_TYPE_ES_MAP[damageDetails.damageType as DamageType] || damageDetails.damageType;
    setLastRollResult({ ...result, description: `${descriptionPrefix} (${damageTypeDisplay}): ${result.description}` });
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-4 sm:mb-0 flex items-center">
            <ShieldExclamationIcon className="h-10 w-10 mr-3 text-orange-500 dark:text-orange-400" />
            Bestiario
        </h1>
        <Link
          to="/content-creator/npc/new"
          className="btn-primary-bestiary"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Crear Nuevo PNJ/Monstruo
        </Link>
      </div>

      <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow w-full sm:w-auto">
          <label htmlFor="searchQuery" className="sr-only">Buscar por nombre</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full p-2 pl-10 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"
              aria-label="Buscar PNJ por nombre"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <label htmlFor="challengeFilter" className="sr-only">Filtrar por Desafío</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <select
              id="challengeFilter"
              value={challengeFilter}
              onChange={(e) => setChallengeFilter(e.target.value)}
              className="w-full p-2 pl-10 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500 appearance-none"
              aria-label="Filtrar PNJs por Valor de Desafío"
            >
              <option value="all">Todos los Desafíos</option>
              {uniqueChallengeRatings.map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-400">
                <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-4 space-y-1">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Modo de Tirada d20 (para ataques, pruebas y salvaciones):</label>
          <div className="flex rounded-md shadow-sm bg-slate-100 dark:bg-slate-700 p-0.5 max-w-xs">
              {(['advantage', 'normal', 'disadvantage'] as AttackRollMode[]).map(mode => (
                  <button
                      key={mode}
                      onClick={() => setAttackRollMode(mode)}
                      className={`flex-1 px-2 py-1 text-xs rounded-sm transition-colors
                          ${attackRollMode === mode 
                              ? (mode === 'advantage' ? 'bg-green-500 text-white' : mode === 'disadvantage' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white')
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                      aria-pressed={attackRollMode === mode}
                  >
                      {mode === 'advantage' ? 'Ventaja' : mode === 'disadvantage' ? 'Desventaja' : 'Normal'}
                  </button>
              ))}
          </div>
      </div>

      {lastRollResult && (
        <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-700/60 rounded-md shadow text-center text-xs" role="alert" aria-live="polite">
            <p className="text-purple-600 dark:text-purple-300 font-semibold">{lastRollResult.description}</p>
            <p className="text-slate-800 dark:text-slate-200 text-lg font-bold">Total: {lastRollResult.total}</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">
            (Dados: [{lastRollResult.individualRolls.join(', ')}] Suma: {lastRollResult.diceSum} 
            {lastRollResult.modifier !== 0 ? `, Mod: ${lastRollResult.modifier > 0 ? '+' : ''}${lastRollResult.modifier}` : ''})
            </p>
        </div>
      )}

      {filteredNpcs.length === 0 ? (
        <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          <ShieldExclamationIcon className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-xl text-slate-700 dark:text-slate-300 mb-3">No se encontraron PNJs con los filtros actuales.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNpcs.map((npc) => {
            const isExpanded = expandedNpcId === npc.id;
            return (
                <div key={npc.id} className="bg-white dark:bg-slate-800 shadow-lg rounded-lg overflow-hidden">
                <button
                    className="flex items-center justify-between w-full p-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400" 
                    onClick={() => setExpandedNpcId(isExpanded ? null : npc.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`npc-details-${npc.id}`}
                >
                    <div>
                        <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300">{npc.name}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{npc.type} ({SIZE_ES_MAP[npc.size] || npc.size}), {ALIGNMENT_ES[npc.alignment] || npc.alignment}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteNpc(npc.id, npc.name); }}
                            title={`Eliminar ${npc.name}`}
                            aria-label={`Eliminar ${npc.name}`}
                            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                        {isExpanded ? <ChevronDownIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" /> : <ChevronRightIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />}
                    </div>
                </button>

                {isExpanded && (
                    <div id={`npc-details-${npc.id}`} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div><strong>CA:</strong> {npc.armorClass} {npc.acType && `(${npc.acType})`}</div>
                        <div><strong>PG:</strong> {npc.hitPoints} ({npc.hitDice})</div>
                        <div><strong>Velocidad:</strong> {npc.speed}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center my-3 py-2 border-y border-slate-200 dark:border-slate-700">
                        {Object.entries(npc.abilityScores).map(([key, score]) => {
                            const ability = key as AbilityScoreName;
                            const modifier = calculateModifier(score);
                            const saveBonus = npc.savingThrows?.[ability] ?? modifier;
                            const isSaveProficient = npc.savingThrows?.[ability] !== undefined && npc.savingThrows[ability] !== modifier;

                            return (
                                <div key={ability} className="bg-slate-200 dark:bg-slate-700 p-1.5 rounded shadow-sm">
                                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">{ABILITY_SCORE_ES_SHORT[ability]}</div>
                                    <div className="text-md my-0.5">{score} ({modifier >= 0 ? '+' : ''}{modifier})</div>
                                    <div className="flex flex-col space-y-0.5 text-2xs">
                                        <button onClick={()=> handleNpcAbilityCheckRoll(npc, ability)} className="btn-roll-ability-check">Prueba</button>
                                        <button onClick={()=> handleNpcSavingThrowRoll(npc, ability)} className={`btn-roll-ability-check ${isSaveProficient ? 'font-bold text-green-700 dark:text-green-300' : ''}`}>
                                            Salvac. {saveBonus >= 0 ? '+' : ''}{saveBonus}{isSaveProficient ? ' P':''}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {npc.skills && Object.keys(npc.skills).length > 0 && (
                        <p><strong>Habilidades:</strong> {Object.entries(npc.skills).map(([key, val]) => `${getSkillDisplayName(key as SkillName)} ${val >= 0 ? '+' : ''}${val}`).join(', ')}</p>
                    )}
                    {npc.damageVulnerabilities && npc.damageVulnerabilities.length > 0 && <p><strong>Vulnerabilidades:</strong> {npc.damageVulnerabilities.join(', ')}</p>}
                    {npc.damageResistances && npc.damageResistances.length > 0 && <p><strong>Resistencias:</strong> {npc.damageResistances.join(', ')}</p>}
                    {npc.damageImmunities && npc.damageImmunities.length > 0 && <p><strong>Inmunidades a Daño:</strong> {npc.damageImmunities.join(', ')}</p>}
                    {npc.conditionImmunities && npc.conditionImmunities.length > 0 && <p><strong>Inmunidades a Condición:</strong> {npc.conditionImmunities.join(', ')}</p>}
                    {npc.senses && <p><strong>Sentidos:</strong> {npc.senses}</p>}
                    {npc.languages && <p><strong>Idiomas:</strong> {npc.languages}</p>}
                    <p><strong>Desafío:</strong> {npc.challengeRating} ({npc.xp || 0} PX)</p>
                    
                    {npc.description && (
                        <div className="mt-2">
                        <h4 className="font-semibold text-purple-600 dark:text-purple-200">Descripción</h4>
                        <p className="text-xs whitespace-pre-line">{npc.description}</p>
                        </div>
                    )}

                    {[
                        { title: "Habilidades Especiales", items: npc.specialAbilities },
                        { title: "Acciones", items: npc.actions },
                        { title: "Reacciones", items: npc.reactions }, 
                        { title: "Acciones Legendarias", items: npc.legendaryActions }
                    ].map(section => section.items && section.items.length > 0 && (
                        <div key={section.title} className="mt-2">
                            <h4 className="font-semibold text-purple-600 dark:text-purple-200">{section.title}</h4>
                            {section.items.map((item: Trait) => {
                                const attackDetailsToUse = item.parsedAttack || parseNpcAttackAction(item.description);
                                let displayParts = [];
                                if (attackDetailsToUse?.attack) {
                                    displayParts.push(<span key="atkbonus" className="text-sky-600 dark:text-sky-400 font-medium"> ({attackDetailsToUse.attack.bonus >= 0 ? '+' : ''}{attackDetailsToUse.attack.bonus} al golpear)</span>);
                                }
                                if (attackDetailsToUse?.savingThrow) {
                                    displayParts.push(<span key="savedc" className="font-medium"> (CD <strong className="text-green-600 dark:text-green-400">{attackDetailsToUse.savingThrow.dc}</strong> {ABILITY_SCORE_ES_MAP[attackDetailsToUse.savingThrow.ability]})</span>);
                                }
                                if (attackDetailsToUse?.hit) {
                                    displayParts.push(<span key="hitdmg" className="text-red-600 dark:text-red-400 font-medium"> ({attackDetailsToUse.hit.diceString} {DAMAGE_TYPE_ES_MAP[attackDetailsToUse.hit.damageType as DamageType] || attackDetailsToUse.hit.damageType})</span>);
                                }
                                if (attackDetailsToUse?.versatile) {
                                   displayParts.push(<span key="verdmg" className="text-orange-600 dark:text-orange-400 font-medium"> (Versátil: {attackDetailsToUse.versatile.diceString} {DAMAGE_TYPE_ES_MAP[attackDetailsToUse.versatile.damageType as DamageType] || attackDetailsToUse.versatile.damageType})</span>);
                                }


                                return (
                                    <div key={item.name} className="mt-1 text-xs p-1.5 bg-slate-100 dark:bg-slate-700/60 rounded">
                                        <strong className="text-slate-800 dark:text-slate-100">{item.name}.</strong>
                                        {displayParts}
                                        <span className="whitespace-pre-line"> {item.description}</span>
                                        
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {attackDetailsToUse?.attack && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleNpcActionAttackRoll(item.name, attackDetailsToUse.attack!); }} 
                                                    className="btn-roll-action bg-sky-600 hover:bg-sky-500"
                                                    aria-label={`Tirar ataque para ${item.name}`}
                                                >
                                                    <GenericDieIcon className="h-3 w-3 mr-1"/> Ataque
                                                </button>
                                            )}
                                            {attackDetailsToUse?.hit && (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        const context = attackDetailsToUse.savingThrow ? 'save_fail' : 'attack';
                                                        handleNpcActionDamageRoll(item.name, attackDetailsToUse.hit!, context); 
                                                    }} 
                                                    className="btn-roll-action bg-red-600 hover:bg-red-500"
                                                    aria-label={`Tirar daño para ${item.name}`}
                                                >
                                                    <GenericDieIcon className="h-3 w-3 mr-1"/> Daño {attackDetailsToUse.savingThrow ? 'en Fallo' : ''}
                                                </button>
                                            )}
                                            {attackDetailsToUse?.versatile && attackDetailsToUse.attack && ( // Versatile only makes sense with a direct attack
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleNpcActionDamageRoll(item.name, attackDetailsToUse.versatile!, 'versatile'); }} 
                                                    className="btn-roll-action bg-orange-500 hover:bg-orange-400"
                                                    aria-label={`Tirar daño versátil para ${item.name}`}
                                                >
                                                    <GenericDieIcon className="h-3 w-3 mr-1"/> Daño (V)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                     {npc.lairActions && npc.lairActions.length > 0 && ( 
                        <div key="Acciones de Guarida" className="mt-2">
                            <h4 className="font-semibold text-purple-600 dark:text-purple-200">Acciones de Guarida</h4>
                            {npc.lairActions.map((item: Trait) => (
                                <div key={item.name} className="mt-1 text-xs p-1.5 bg-slate-100 dark:bg-slate-700/60 rounded">
                                    <strong className="text-slate-800 dark:text-slate-100">{item.name}.</strong>
                                    <span className="whitespace-pre-line"> {item.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {npc.source && <p className="text-2xs italic text-slate-400 dark:text-slate-500 mt-2">Fuente: {npc.source}</p>}
                    </div>
                )}
                </div>
            );
        })}
        </div>
      )}
      <style>{`
        .btn-primary-bestiary { 
            display: inline-flex; align-items: center; justify-content: center; 
            padding: 0.5rem 1rem; border: 1px solid transparent; 
            font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; 
            box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); 
            color: white; background-color: #8b5cf6; /* purple-500 */
        }
        .btn-primary-bestiary:hover { background-color: #7c3aed; } /* purple-600 */
        .dark .btn-primary-bestiary { background-color: #a78bfa; } /* purple-400 */
        .dark .btn-primary-bestiary:hover { background-color: #8b5cf6; } /* purple-500 */

        .btn-roll-action {
            display: inline-flex; align-items: center;
            padding: 4px 8px; 
            font-size: 0.7rem; 
            border-radius: 0.25rem; 
            color: white;
            transition: background-color 0.15s ease-in-out;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            font-weight: 500;
        }
        .btn-roll-action svg { 
            height: 0.875rem; 
            width: 0.875rem;  
            margin-right: 0.25rem; 
        }
        .btn-roll-ability-check {
            background-color: #e2e8f0; /* slate-200 */
            color: #475569; /* slate-600 */
            padding: 2px 4px;
            border-radius: 0.25rem;
            border: 1px solid #cbd5e1; /* slate-300 */
            width: 100%;
            transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
        }
        .dark .btn-roll-ability-check {
            background-color: #334155; /* slate-700 */
            color: #cbd5e1; /* slate-300 */
            border-color: #475569; /* slate-600 */
        }
        .btn-roll-ability-check:hover {
            background-color: #cbd5e1; /* slate-300 */
            border-color: #94a3b8; /* slate-400 */
        }
        .dark .btn-roll-ability-check:hover {
            background-color: #475569; /* slate-600 */
            border-color: #64748b; /* slate-500 */
        }
      `}</style>
    </div>
  );
};

export default Bestiary;
