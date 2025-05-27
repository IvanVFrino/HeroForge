
import React from 'react';
import { CharacterSheet, NPCData, AbilityScoreName, Trait, EquippedItem, AttackRollMode } from '../../types';
import { ABILITY_SCORE_NAMES_ORDERED } from '../../types';
import { calculateAbilityModifier, getPcWeaponAttackBonus, getPcWeaponDamageDetails } from '../../utils/characterCalculations';
import { parseNpcAttackAction, parseDiceString } from '../../utils/diceRoller';
import { CubeIcon as GenericDieIcon } from '@heroicons/react/24/outline';
import { ABILITY_SCORE_ES_MAP, ABILITY_SCORE_ES_SHORT, DAMAGE_TYPE_ES_MAP } from '../../constants/displayMaps';

interface Combatant {
  id: string;
  name: string;
  type: 'PC' | 'NPC';
  entityData: CharacterSheet | NPCData;
  // ... other combatant props if needed, but entityData is key here
}

interface CombatantDetailRendererProps {
    combatant: Combatant;
    onAbilityCheck: (combatant: Combatant, ability: AbilityScoreName) => void;
    onSavingThrow: (combatant: Combatant, ability: AbilityScoreName) => void;
    onPcWeaponAttack: (combatant: Combatant, weapon: EquippedItem) => void;
    onPcWeaponDamage: (combatant: Combatant, weapon: EquippedItem, useVersatile?: boolean) => void;
    onNpcTraitAttack: (combatant: Combatant, traitName: string, parsedAttackDetails: NonNullable<Trait['parsedAttack']>['attack']) => void;
    onNpcTraitDamage: (combatant: Combatant, traitName: string, damageDetails: NonNullable<Trait['parsedAttack']>['hit'] | NonNullable<Trait['parsedAttack']>['versatile'], context?: 'attack' | 'save_fail' | 'versatile') => void;
    onMouseEnterTrait: (trait: Trait, event: React.MouseEvent<HTMLElement>) => void;
    onMouseMoveTrait: (event: React.MouseEvent<HTMLElement>) => void;
    onMouseLeaveTrait: () => void;
}

const CombatantDetailRenderer: React.FC<CombatantDetailRendererProps> = ({
    combatant, onAbilityCheck, onSavingThrow, onPcWeaponAttack, onPcWeaponDamage,
    onNpcTraitAttack, onNpcTraitDamage,
    onMouseEnterTrait, onMouseMoveTrait, onMouseLeaveTrait
}) => {
    if (combatant.type === 'PC') {
        const sheet = combatant.entityData as CharacterSheet;
        const equippedWeapons = sheet.equipment.filter(item => item.equipped && item.category === 'Weapon' && item.weaponDetails);
        return (
            <div className="text-xs space-y-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-300 mb-1">Acciones de {sheet.name}</h4>
                <div className="flex flex-col md:flex-row gap-2">
                    <div className="w-full md:w-1/2 space-y-1">
                        <div className="grid grid-cols-3 gap-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => (
                                <button key={`abs-${absName}`} onClick={(e) => { e.stopPropagation(); onAbilityCheck(combatant, absName); }} className="btn-combat-action-tiny">
                                    Prueba {ABILITY_SCORE_ES_SHORT[absName]}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => {
                                const save = sheet.savingThrows[absName];
                                const modDisplay = save ? `${save.value >= 0 ? '+' : ''}${save.value}` : 'N/A';
                                return (
                                <button key={`sav-${absName}`} onClick={(e) => { e.stopPropagation(); onSavingThrow(combatant, absName); }} className={`btn-combat-action-tiny ${save?.proficient ? 'font-bold text-green-700 dark:text-green-300' : ''}`}>
                                    Salvac. {ABILITY_SCORE_ES_SHORT[absName]} {modDisplay}
                                </button>
                            );})}
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 space-y-1">
                        <h5 className="font-medium text-xs pt-0.5">Rasgos</h5>
                        <ul className="list-none max-h-20 overflow-y-auto text-2xs custom-scrollbar-combat-details pr-1">
                            {(sheet.featuresAndTraits || []).length > 0 ? (sheet.featuresAndTraits || []).map(trait => (
                                <li key={trait.name}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer truncate"
                                    title={trait.name}
                                    onMouseEnter={(e) => onMouseEnterTrait(trait, e)}
                                    onMouseMove={onMouseMoveTrait}
                                    onMouseLeave={onMouseLeaveTrait}
                                    onClick={(e) => e.stopPropagation()}
                                >{trait.name}</li>
                            )) : <li className="italic text-slate-500 dark:text-slate-400">Ninguno</li>}
                        </ul>
                    </div>
                </div>
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
                                        <button onClick={(e) => { e.stopPropagation(); onPcWeaponAttack(combatant, weapon); }} className="btn-combat-action-small bg-sky-600 hover:bg-sky-500 text-white">Ataque ({attackBonus >=0 ? '+' : ''}{attackBonus})</button>
                                        {damageDetails && <button onClick={(e) => { e.stopPropagation(); onPcWeaponDamage(combatant, weapon, false); }} className="btn-combat-action-small bg-red-600 hover:bg-red-500 text-white">Daño ({damageDetails.dice} {damageDetails.modifier >=0 ? '+' : ''}{damageDetails.modifier} {DAMAGE_TYPE_ES_MAP[damageDetails.type] || damageDetails.type})</button>}
                                        {versatileDamageDetails && <button onClick={(e) => { e.stopPropagation(); onPcWeaponDamage(combatant, weapon, true); }} className="btn-combat-action-small bg-orange-500 hover:bg-orange-400 text-white">Daño V. ({versatileDamageDetails.dice} {versatileDamageDetails.modifier >=0 ? '+' : ''}{versatileDamageDetails.modifier} {DAMAGE_TYPE_ES_MAP[versatileDamageDetails.type] || versatileDamageDetails.type})</button>}
                                    </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : ( <p className="italic text-slate-500 dark:text-slate-400 text-2xs">Ninguna arma equipada.</p> )}
                </div>
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
                                <button key={`abs-${absName}`} onClick={(e) => { e.stopPropagation(); onAbilityCheck(combatant, absName); }} className="btn-combat-action-tiny">Prueba {ABILITY_SCORE_ES_SHORT[absName]}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(absName => {
                                const saveBonus = npc.savingThrows?.[absName] ?? calculateAbilityModifier(npc.abilityScores[absName]);
                                const isProf = npc.savingThrows?.[absName] !== undefined && npc.savingThrows?.[absName] !== calculateAbilityModifier(npc.abilityScores[absName]);
                                return (
                                <button key={`sav-${absName}`} onClick={(e) => { e.stopPropagation(); onSavingThrow(combatant, absName); }} className={`btn-combat-action-tiny ${isProf ? 'font-bold text-green-700 dark:text-green-300': ''}`}>Salvac. {ABILITY_SCORE_ES_SHORT[absName]} {saveBonus >= 0 ? '+' : ''}{saveBonus}</button>
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
                                    onMouseEnter={(e) => onMouseEnterTrait(trait, e)}
                                    onMouseMove={onMouseMoveTrait}
                                    onMouseLeave={onMouseLeaveTrait}
                                    onClick={(e) => e.stopPropagation()}
                                >{trait.name}</li>
                            )) : <li className="italic text-slate-500 dark:text-slate-400">Ninguno</li>}
                        </ul>
                    </div>
                 </div>
                {[ { title: "Acciones", items: npc.actions }, { title: "Reacciones", items: npc.reactions }, { title: "Acciones Legendarias", items: npc.legendaryActions } ].map(section => section.items && section.items.length > 0 && (
                    <div key={section.title} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <h5 className="font-medium text-xs">{section.title}</h5>
                        <ul className="list-none space-y-0.5 text-2xs max-h-28 overflow-y-auto custom-scrollbar-combat-details pr-1">
                        {section.items.map((trait: Trait) => {
                            const attackDetailsToUse = trait.parsedAttack || parseNpcAttackAction(trait.description);
                            return (
                            <li key={trait.name} className="p-1 bg-slate-200 dark:bg-slate-600 rounded">
                                <span className="font-medium text-slate-700 dark:text-slate-200 hover:text-purple-500 dark:hover:text-purple-400 cursor-pointer" onMouseEnter={(e) => onMouseEnterTrait(trait, e)} onMouseMove={onMouseMoveTrait} onMouseLeave={onMouseLeaveTrait} onClick={(e) => e.stopPropagation()}>{trait.name}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                {attackDetailsToUse?.attack && (<button onClick={(e) => { e.stopPropagation(); onNpcTraitAttack(combatant, trait.name, attackDetailsToUse.attack!); }} className="btn-combat-action-small bg-sky-600 hover:bg-sky-500 text-white">Ataque</button>)}
                                {attackDetailsToUse?.hit && (<button onClick={(e) => { e.stopPropagation(); onNpcTraitDamage(combatant, trait.name, attackDetailsToUse.hit!, attackDetailsToUse.savingThrow ? 'save_fail' : 'attack'); }} className="btn-combat-action-small bg-red-600 hover:bg-red-500 text-white">Daño{attackDetailsToUse.savingThrow ? ' (Fallo)' : ''}</button>)}
                                {attackDetailsToUse?.versatile && attackDetailsToUse.attack && (<button onClick={(e) => { e.stopPropagation(); onNpcTraitDamage(combatant, trait.name, attackDetailsToUse.versatile!, 'versatile'); }} className="btn-combat-action-small bg-orange-500 hover:bg-orange-400 text-white">Daño (V)</button>)}
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

export default CombatantDetailRenderer;

// Add these styles if they are not globally defined in CombatTracker.tsx or another common CSS file
// Ensure the style tag is included in the XML for CombatTracker.tsx if these are used only there,
// or in a global CSS if they are more broadly used.
/*
<style>{`
    .btn-combat-action-small { display: inline-flex; align-items: center; padding: 2px 6px; font-size: 0.65rem; border-radius: 0.25rem; transition: all 0.15s ease-in-out; text-transform: uppercase; }
    .btn-combat-action-tiny { padding: 2px 4px; font-size: 0.6rem; border-radius: 0.25rem; background-color: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; transition: all 0.15s ease-in-out; text-transform: uppercase; text-align: center; }
    .dark .btn-combat-action-tiny { background-color: #334155; color: #cbd5e1; border-color: #475569; }
    .btn-combat-action-tiny:hover { background-color: #cbd5e1; border-color: #94a3b8; }
    .dark .btn-combat-action-tiny:hover { background-color: #475569; border-color: #64748b; }
    .custom-scrollbar-combat-details::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar-combat-details::-webkit-scrollbar-track { background: transparent; }
    .dark .custom-scrollbar-combat-details::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar-combat-details::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; } 
    .dark .custom-scrollbar-combat-details::-webkit-scrollbar-thumb { background: #334155; } 
    .custom-scrollbar-combat-details::-webkit-scrollbar-thumb:hover { background: #94a3b8; } 
    .dark .custom-scrollbar-combat-details::-webkit-scrollbar-thumb:hover { background: #475569; }
    .text-2xs { font-size: 0.675rem; line-height: 0.875rem; }
`}</style>
*/
