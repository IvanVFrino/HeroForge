
import React from 'react';
import { Trait, AbilityScoreName, DamageType, ParsedNpcAttackAction } from '../../../types';
import { ABILITY_SCORE_NAMES_ORDERED, DAMAGE_TYPES_CONST } from '../../../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { ABILITY_SCORE_ES_MAP, DAMAGE_TYPE_ES_MAP } from '../../../constants/displayMaps';

type TraitActionType = 'attack' | 'savingThrow' | 'other';

interface CurrentTraitInput {
    name: string;
    description: string;
    actionType: TraitActionType;
    attackBonus?: number;
    damageDice?: string;
    damageType?: DamageType;
    versatileDamageDice?: string;
    saveDC?: number;
    saveAbility?: AbilityScoreName;
    saveDamageDice?: string;
    saveDamageType?: DamageType;
}

interface NpcTraitManagerProps {
    title: string;
    list: Trait[];
    // Removed setList as it's managed by parent via callbacks
    currentTraitInput: CurrentTraitInput;
    setCurrentTraitInput: React.Dispatch<React.SetStateAction<CurrentTraitInput>>;
    onAddTrait: () => void; // Simplified callback
    onRemoveTrait: (traitName: string) => void; // Simplified callback
}

const NpcTraitManager: React.FC<NpcTraitManagerProps> = ({
    title, list, currentTraitInput, setCurrentTraitInput, onAddTrait, onRemoveTrait
}) => {
    return (
        <fieldset className="form-section">
            <legend className="legend-title">{title}</legend>
            {list.map(trait => (
                <div key={trait.name} className="form-subsection">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">{trait.name}</h4>
                        <button type="button" onClick={() => onRemoveTrait(trait.name)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                    <p className="text-xs whitespace-pre-line">{trait.description}</p>
                    {trait.parsedAttack && (
                        <div className="mt-1 text-2xs p-1 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300 dark:border-purple-700">
                            <span className="font-semibold text-purple-700 dark:text-purple-300">Detectado/Manual: </span>
                            {trait.parsedAttack.attack && <span>Ataque: {trait.parsedAttack.attack.bonus >=0 ? '+' : ''}{trait.parsedAttack.attack.bonus}. </span>}
                            {trait.parsedAttack.savingThrow && <span>Salvación: DC {trait.parsedAttack.savingThrow.dc} {ABILITY_SCORE_ES_MAP[trait.parsedAttack.savingThrow.ability]}. </span>}
                            {trait.parsedAttack.hit && <span>Daño: {trait.parsedAttack.hit.diceString} {DAMAGE_TYPE_ES_MAP[trait.parsedAttack.hit.damageType as DamageType]}. </span>}
                            {trait.parsedAttack.versatile && <span>Versátil: {trait.parsedAttack.versatile.diceString} {DAMAGE_TYPE_ES_MAP[trait.parsedAttack.versatile.damageType as DamageType]}.</span>}
                        </div>
                    )}
                </div>
            ))}
            <div className="form-subsection border-dashed">
                <input type="text" value={currentTraitInput.name} onChange={e => setCurrentTraitInput({...currentTraitInput, name: e.target.value})} placeholder={`Nombre de ${title.slice(0,-1)}`} className="input-field mb-1"/>
                <textarea value={currentTraitInput.description} onChange={e => setCurrentTraitInput({...currentTraitInput, description: e.target.value})} placeholder={`Descripción de ${title.slice(0,-1)}`} rows={3} className="input-field mb-1"/>
                
                <div className="mt-2 mb-1">
                    <label htmlFor={`traitActionType-${title.replace(/\s+/g, '-')}`} className="block text-xs font-medium">Tipo de Acción/Rasgo:</label>
                    <select 
                        id={`traitActionType-${title.replace(/\s+/g, '-')}`} 
                        value={currentTraitInput.actionType} 
                        onChange={e => setCurrentTraitInput({...currentTraitInput, actionType: e.target.value as TraitActionType})}
                        className="input-field-small"
                    >
                        <option value="other">Otro/Utilidad (solo descripción)</option>
                        <option value="attack">Ataque Directo</option>
                        <option value="savingThrow">Efecto de Tirada de Salvación</option>
                    </select>
                </div>

                {currentTraitInput.actionType === 'attack' && (
                    <div className="mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/30 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Detalles de Ataque Directo</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitAttackBonus-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Bonif. Ataque (ej: 7)</label>
                                <input type="number" id={`traitAttackBonus-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.attackBonus === undefined ? '' : currentTraitInput.attackBonus} onChange={e => setCurrentTraitInput({...currentTraitInput, attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value)})} placeholder="+X" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitDamageDice-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Dados Daño (ej: 2d6+3)</label>
                                <input type="text" id={`traitDamageDice-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.damageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, damageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           <div>
                                <label htmlFor={`traitDamageType-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Tipo Daño</label>
                                <select id={`traitDamageType-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.damageType} onChange={e => setCurrentTraitInput({...currentTraitInput, damageType: e.target.value as DamageType})} className="input-field-small">
                                    {DAMAGE_TYPES_CONST.map(dt => <option key={dt} value={dt}>{DAMAGE_TYPE_ES_MAP[dt]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`traitVersatileDamage-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Daño Versátil (opc.)</label>
                                <input type="text" id={`traitVersatileDamage-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.versatileDamageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, versatileDamageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                        </div>
                    </div>
                )}

                {currentTraitInput.actionType === 'savingThrow' && (
                     <div className="mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/30 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Detalles de Efecto de Salvación</h5>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitSaveDC-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">DC Salvación (ej: 15)</label>
                                <input type="number" id={`traitSaveDC-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.saveDC === undefined ? '' : currentTraitInput.saveDC} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDC: e.target.value === '' ? undefined : parseInt(e.target.value)})} placeholder="DC" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitSaveAbility-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Característica Salvación</label>
                                <select id={`traitSaveAbility-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.saveAbility} onChange={e => setCurrentTraitInput({...currentTraitInput, saveAbility: e.target.value as AbilityScoreName})} className="input-field-small">
                                    {ABILITY_SCORE_NAMES_ORDERED.map(ab => <option key={ab} value={ab}>{ABILITY_SCORE_ES_MAP[ab]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor={`traitSaveDamageDice-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Dados Daño (en fallo)</label>
                                <input type="text" id={`traitSaveDamageDice-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.saveDamageDice} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDamageDice: e.target.value})} placeholder="XdY+Z" className="input-field-small"/>
                            </div>
                            <div>
                                <label htmlFor={`traitSaveDamageType-${title.replace(/\s+/g, '-')}`} className="block text-2xs font-medium">Tipo Daño (en fallo)</label>
                                <select id={`traitSaveDamageType-${title.replace(/\s+/g, '-')}`} value={currentTraitInput.saveDamageType} onChange={e => setCurrentTraitInput({...currentTraitInput, saveDamageType: e.target.value as DamageType})} className="input-field-small">
                                    {DAMAGE_TYPES_CONST.map(dt => <option key={dt} value={dt}>{DAMAGE_TYPE_ES_MAP[dt]}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                <button type="button" onClick={onAddTrait} className="btn-secondary w-full mt-2">Añadir {title.slice(0,-1)}</button>
            </div>
        </fieldset>
    );
};

export default NpcTraitManager;
