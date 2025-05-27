
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { DndBackground, SkillName, AbilityScoreName, StartingEquipmentItem, ItemCategory, ITEM_CATEGORIES, WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType } from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { WEAPON_PROPERTIES_LIST, DAMAGE_TYPES_LIST, ARMOR_TYPES_LIST } from '../../constants/items';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ABILITY_SCORE_NAMES_ORDERED: AbilityScoreName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = {
    Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
    Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
};
const ITEM_CATEGORY_ES: Record<ItemCategory, string> = { Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo' };
const DAMAGE_TYPE_ES: Record<DamageType, string> = { Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico' };
const WEAPON_PROPERTY_ES: Record<WeaponProperty, string> = { Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera', Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial', Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil' };
const ARMOR_TYPE_ES: Record<ArmorType, string> = { Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada' };

const ALL_SKILL_NAMES_OBJECT = SKILL_DEFINITIONS.map(skill => ({ name: skill.name, nombre: skill.nombre }));

interface AiGeneratedBackgroundData {
    name?: string;
    skillProficiencies?: SkillName[];
    toolProficiencies?: string[];
    languages?: string[];
    startingEquipment?: { items?: Array<Partial<StartingEquipmentItem>>, gold?: number };
    originFeat?: string;
    asi?: { options?: AbilityScoreName[] };
}

const initialMiniItemState: Omit<StartingEquipmentItem, 'name' | 'quantity'> = {
    category: 'Miscellaneous', description: '', cost: '', weight: '',
    weaponDetails: undefined, armorDetails: undefined,
};

const CreateCustomBackgroundForm: React.FC = () => {
    const { dispatch } = useHeroForge();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const [name, setName] = useState('');
    const [skillProficiencies, setSkillProficiencies] = useState<SkillName[]>([]);
    const [toolProficiencies, setToolProficiencies] = useState<string[]>([]);
    const [currentToolProf, setCurrentToolProf] = useState('');
    const [languages, setLanguages] = useState<string[]>([]);
    const [currentLanguage, setCurrentLanguage] = useState('');
    
    const [startingItems, setStartingItems] = useState<StartingEquipmentItem[]>([]);
    
    const [itemName, setItemName] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemDetails, setItemDetails] = useState<Omit<StartingEquipmentItem, 'name' | 'quantity'>>(initialMiniItemState);
    const [showMiniItemCreator, setShowMiniItemCreator] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    const [startingGold, setStartingGold] = useState<number>(0);

    const [originFeat, setOriginFeat] = useState('');
    const [asiOptions, setAsiOptions] = useState<AbilityScoreName[]>([]);
    
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleMultiSelectToggle = (setter: React.Dispatch<React.SetStateAction<any[]>>, currentValue: any[], valueToToggle: any) => {
        setter(currentValue.includes(valueToToggle) ? currentValue.filter(v => v !== valueToToggle) : [...currentValue, valueToToggle]);
    };
    const addToList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, currentItem: string, setCurrentItem: React.Dispatch<React.SetStateAction<string>>) => {
        if (currentItem.trim() && !list.includes(currentItem.trim())) {
            setList([...list, currentItem.trim()]);
            setCurrentItem('');
        }
    };
    const removeFromList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, itemToRemove: string) => {
        setList(list.filter(item => item !== itemToRemove));
    };
    
    const openMiniItemCreator = (itemToEdit?: StartingEquipmentItem, index?: number) => {
        if (itemToEdit && typeof index === 'number') {
            setItemName(itemToEdit.name);
            setItemQty(itemToEdit.quantity);
            setItemDetails({
                category: itemToEdit.category || 'Miscellaneous',
                description: itemToEdit.description || '',
                cost: itemToEdit.cost || '',
                weight: itemToEdit.weight || '',
                weaponDetails: itemToEdit.weaponDetails,
                armorDetails: itemToEdit.armorDetails,
            });
            setEditingItemIndex(index);
        } else {
            setItemName('');
            setItemQty(1);
            setItemDetails({...initialMiniItemState}); // Ensure fresh state
            setEditingItemIndex(null);
        }
        setShowMiniItemCreator(true);
    };

    const handleSaveItemFromMiniCreator = () => {
        if (!itemName.trim() || itemQty <= 0) {
            alert("Nombre del objeto y cantidad son requeridos.");
            return;
        }
        let finalWeaponDetails: WeaponDetails | undefined = undefined;
        if (itemDetails.category === 'Weapon') {
            if (!itemDetails.weaponDetails?.damageDice?.trim() || !itemDetails.weaponDetails?.damageType) {
                 alert('Para armas, se requieren dados de daño y tipo de daño.'); return;
            }
            finalWeaponDetails = {
                damageDice: itemDetails.weaponDetails.damageDice.trim(),
                damageType: itemDetails.weaponDetails.damageType,
                properties: itemDetails.weaponDetails.properties || [],
                rangeNormal: itemDetails.weaponDetails.rangeNormal || undefined,
                rangeLong: itemDetails.weaponDetails.rangeLong || undefined,
                versatileDamage: itemDetails.weaponDetails.versatileDamage?.trim() || undefined,
            };
        }

        let finalArmorDetails: ArmorDetails | undefined = undefined;
        if (itemDetails.category === 'Armor') {
            if (itemDetails.armorDetails?.baseAC === undefined || itemDetails.armorDetails.baseAC < 0) {
                alert('Para armaduras, se requiere CA Base y debe ser no negativa.'); return;
            }
            finalArmorDetails = {
                baseAC: itemDetails.armorDetails.baseAC,
                addDexModifier: itemDetails.armorDetails.addDexModifier || false,
                maxDexBonus: (itemDetails.armorDetails.addDexModifier && itemDetails.armorDetails.maxDexBonus !== undefined && itemDetails.armorDetails.maxDexBonus >= 0) ? itemDetails.armorDetails.maxDexBonus : undefined,
                armorType: itemDetails.armorDetails.armorType || undefined,
                strengthRequirement: (itemDetails.armorDetails.strengthRequirement !== undefined && itemDetails.armorDetails.strengthRequirement >=0) ? itemDetails.armorDetails.strengthRequirement : undefined,
                stealthDisadvantage: itemDetails.armorDetails.stealthDisadvantage || false,
            };
        }

        const newItem: StartingEquipmentItem = {
            name: itemName.trim(),
            quantity: itemQty,
            category: itemDetails.category,
            description: itemDetails.description?.trim() || undefined,
            cost: typeof itemDetails.cost === 'string' ? itemDetails.cost.trim() || undefined : itemDetails.cost,
            weight: typeof itemDetails.weight === 'string' ? itemDetails.weight.trim() || undefined : itemDetails.weight,
            weaponDetails: finalWeaponDetails,
            armorDetails: finalArmorDetails,
        };

        if (editingItemIndex !== null) {
            const updatedItems = [...startingItems];
            updatedItems[editingItemIndex] = newItem;
            setStartingItems(updatedItems);
        } else {
            setStartingItems([...startingItems, newItem]);
        }
        setShowMiniItemCreator(false);
        setEditingItemIndex(null);
    };

    const handleRemoveItem = (index: number) => {
      setStartingItems(startingItems.filter((_, i) => i !== index));
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setSkillProficiencies([]); setToolProficiencies([]); setCurrentToolProf('');
        setLanguages([]); setCurrentLanguage(''); setStartingItems([]); 
        setItemName(''); setItemQty(1); setItemDetails({...initialMiniItemState}); setShowMiniItemCreator(false); setEditingItemIndex(null);
        setStartingGold(0); setOriginFeat(''); setAsiOptions([]);
        if(includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Por favor, introduce una descripción para el trasfondo que quieres crear.");
            return;
        }
        setIsAiLoading(true); setAiError(null); resetFormFields(false);

        const systemPrompt = `
            Eres un diseñador experto de trasfondos de D&D 5e. Genera un objeto JSON para un nuevo trasfondo basado en la idea del usuario.
            El JSON debe seguir esta estructura:
            {
                "name": "Nombre del Trasfondo (string)",
                "skillProficiencies": ["Array de SkillName de la lista: ${ALL_SKILL_NAMES_OBJECT.map(s=>s.name).join(', ')} (Usualmente 2)"],
                "toolProficiencies": ["Array de strings, ej: ['Thieves' Tools', 'Navigator's Tools'] (Usualmente 1-2 o ninguno)"],
                "languages": ["Array de strings, ej: ['Elvish', 'Dwarvish'] (Usualmente 0-2)"],
                "startingEquipment": { 
                    "items": [{ 
                        "name": "NombreObjeto", "quantity": 1, 
                        "category": "Weapon | Armor | Miscellaneous",
                        "description": "Descripción breve",
                        "cost": "ej. '10 gp'",
                        "weight": "ej. '3 lb'",
                        "weaponDetails": { "damageDice": "1d8", "damageType": "Slashing", "properties": ["Versatile"], "versatileDamage": "1d10" },
                        "armorDetails": { "baseAC": 14, "armorType": "Medium", "addDexModifier": true, "maxDexBonus": 2, "stealthDisadvantage": false, "strengthRequirement": 13 }
                    }], 
                    "gold": "number de monedas de oro iniciales (ej. 15)" 
                },
                "originFeat": "Nombre de la Dote de Origen (string, ej. 'Magic Initiate (Wizard)')",
                "asi": { "options": ["Array de AbilityScoreName, ej: ['Strength', 'Dexterity', 'Intelligence'] (Usualmente 3 opciones para el jugador)"] }
            }
            Idea del trasfondo del usuario: "${aiPrompt}"
            Responde ÚNICAMENTE con el objeto JSON. 
            Para 'items' en 'startingEquipment':
            - Si es un arma, incluye 'weaponDetails'.
            - Si es armadura, incluye 'armorDetails'.
            - Si es misceláneo, omite 'weaponDetails' y 'armorDetails'.
            - 'category' debe ser uno de: ${ITEM_CATEGORIES.join(' | ')}.
            - 'damageType' (si aplica) debe ser uno de: ${DAMAGE_TYPES_LIST.join(' | ')}.
            - 'properties' de arma (si aplica) debe ser un array de: ${WEAPON_PROPERTIES_LIST.join(' | ')}.
            - 'armorType' (si aplica) debe ser uno de: ${ARMOR_TYPES_LIST.join(' | ')} o null/omitido para escudos/genéricos.
            - 'weaponDetails' o 'armorDetails' pueden ser null u omitidos si no aplican a la categoría, PERO si se proveen, no deben ser un objeto vacío como {}. Si son {}, es mejor omitir la clave.
        `;
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17", contents: systemPrompt, config: { responseMimeType: "application/json" }
            });
            let jsonStr = response.text.trim();
            const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
            if (match && match[2]) jsonStr = match[2].trim();
            
            const aiData: AiGeneratedBackgroundData = JSON.parse(jsonStr);

            setName(aiData.name || '');
            setSkillProficiencies((aiData.skillProficiencies || []).filter(sk => ALL_SKILL_NAMES_OBJECT.map(s=>s.name).includes(sk as SkillName)) as SkillName[]);
            setToolProficiencies(aiData.toolProficiencies || []);
            setLanguages(aiData.languages || []);
            setStartingItems((aiData.startingEquipment?.items || []).map(i => {
                let cat = i.category && ITEM_CATEGORIES.includes(i.category) ? i.category : 'Miscellaneous';
                
                let parsedWeaponDetails = undefined;
                if (cat === 'Weapon' && i.weaponDetails && Object.keys(i.weaponDetails).length > 0) {
                    parsedWeaponDetails = i.weaponDetails;
                }

                let parsedArmorDetails = undefined;
                if (cat === 'Armor' && i.armorDetails && Object.keys(i.armorDetails).length > 0) {
                    parsedArmorDetails = i.armorDetails;
                }

                return {
                    name:i.name||'Objeto Desconocido', 
                    quantity:i.quantity||1,
                    category: cat,
                    description: i.description,
                    cost: i.cost,
                    weight: i.weight,
                    weaponDetails: parsedWeaponDetails,
                    armorDetails: parsedArmorDetails,
                };
            }) as StartingEquipmentItem[]);
            setStartingGold(aiData.startingEquipment?.gold || 0);
            setOriginFeat(aiData.originFeat || '');
            setAsiOptions((aiData.asi?.options || []).filter(ab => ABILITY_SCORE_NAMES_ORDERED.includes(ab as AbilityScoreName)) as AbilityScoreName[]);

        } catch (e) {
            console.error("Error al generar trasfondo con IA:", e);
            setAiError(`Falló la generación de detalles del trasfondo. Error: ${(e as Error).message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || skillProficiencies.length === 0 || !originFeat.trim() || asiOptions.length === 0) {
            alert('Nombre, Competencias en Habilidad (al menos una), Dote de Origen y Opciones de IPC (al menos una) son obligatorios.');
            return;
        }

        const backgroundData: Omit<DndBackground, 'id' | 'isCustom'> = {
            name: name.trim(), skillProficiencies, toolProficiencies, languages,
            startingEquipment: { items: startingItems, gold: startingGold },
            originFeat: originFeat.trim(),
            asi: { options: asiOptions },
        };
        dispatch({ type: 'ADD_CUSTOM_BACKGROUND', payload: backgroundData });
        alert(`¡Trasfondo personalizado "${name.trim()}" creado con éxito!`);
        resetFormFields(true);
    };
    
    return (
        <div className="container mx-auto p-4 md:p-6 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Trasfondo Personalizado</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 btn-secondary-link">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de Trasfondos con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Un erudito que pasó años estudiando ruinas antiguas, obsesionado con un artefacto perdido." rows={3} className="w-full p-2 input-field" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                <div>
                    <label htmlFor="bgName" className="block text-sm font-medium">Nombre del Trasfondo*</label>
                    <input type="text" id="bgName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 input-field"/>
                </div>
                
                {/* Skill Proficiencies */}
                <fieldset className="form-section">
                    <legend className="legend-title">Competencias en Habilidades*</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {ALL_SKILL_NAMES_OBJECT.map(skill => (
                            <label key={skill.name} className="checkbox-label">
                                <input type="checkbox" checked={skillProficiencies.includes(skill.name)} onChange={() => handleMultiSelectToggle(setSkillProficiencies, skillProficiencies, skill.name)} className="checkbox-input"/>{skill.nombre}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Tool Proficiencies & Languages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium">Competencias en Herramientas</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="text" value={currentToolProf} onChange={e=>setCurrentToolProf(e.target.value)} placeholder="Ej: Herramientas de Ladrón" className="input-field flex-grow"/>
                            <button type="button" onClick={()=>addToList(toolProficiencies, setToolProficiencies, currentToolProf, setCurrentToolProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{toolProficiencies.map(tp=><li key={tp}>{tp}<button type="button" onClick={()=>removeFromList(toolProficiencies, setToolProficiencies, tp)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Idiomas</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="text" value={currentLanguage} onChange={e=>setCurrentLanguage(e.target.value)} placeholder="Ej: Élfico" className="input-field flex-grow"/>
                            <button type="button" onClick={()=>addToList(languages, setLanguages, currentLanguage, setCurrentLanguage)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{languages.map(lang=><li key={lang}>{lang}<button type="button" onClick={()=>removeFromList(languages, setLanguages, lang)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                </div>

                {/* Starting Equipment */}
                <fieldset className="form-section">
                    <legend className="legend-title">Equipo Inicial</legend>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Objetos</label>
                            {startingItems.map((item, index) => (
                                <div key={index} className="text-xs p-1 my-1 bg-slate-200 dark:bg-slate-600 rounded flex justify-between items-center">
                                    <span>{item.name} (x{item.quantity}) {item.category && `[${ITEM_CATEGORY_ES[item.category] || item.category}]`}</span>
                                    <div>
                                        <button type="button" onClick={() => openMiniItemCreator(item, index)} className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 p-0.5 text-2xs"><PencilSquareIcon className="h-4 w-4 inline-block mr-0.5" />Editar</button>
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 p-0.5 text-2xs ml-1"><TrashIcon className="h-4 w-4 inline-block mr-0.5" />Quitar</button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => openMiniItemCreator()} className="btn-secondary-small w-full text-xs mt-1">
                                <PlusCircleIcon className="h-4 w-4 mr-1"/> Añadir Objeto Inicial
                            </button>
                        </div>
                        <div>
                            <label htmlFor="startingGold" className="block text-sm font-medium">Oro Inicial</label>
                            <input type="number" id="startingGold" value={startingGold} min="0" onChange={e=>setStartingGold(parseInt(e.target.value)||0)} className="input-field"/>
                        </div>
                    </div>
                </fieldset>

                 {/* Mini Item Creator Modal/Section */}
                {showMiniItemCreator && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowMiniItemCreator(false)}>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">{editingItemIndex !== null ? "Editar Objeto Inicial" : "Añadir Objeto Inicial"}</h3>
                            {/* Name & Qty */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="col-span-2">
                                    <label htmlFor="itemName" className="block text-xs font-medium">Nombre del Objeto*</label>
                                    <input type="text" id="itemName" value={itemName} onChange={e => setItemName(e.target.value)} className="input-field-small" />
                                </div>
                                <div>
                                    <label htmlFor="itemQty" className="block text-xs font-medium">Cantidad*</label>
                                    <input type="number" id="itemQty" value={itemQty} min="1" onChange={e => setItemQty(parseInt(e.target.value) || 1)} className="input-field-small" />
                                </div>
                            </div>
                            {/* Category */}
                            <div className="mb-3">
                                <label htmlFor="itemCategory" className="block text-xs font-medium">Categoría</label>
                                <select id="itemCategory" value={itemDetails.category} 
                                    onChange={e => {
                                        const newCategory = e.target.value as ItemCategory;
                                        const defaultWeaponDetails: WeaponDetails = { damageDice: '', damageType: DAMAGE_TYPES_LIST[0], properties: [] };
                                        // Corrected defaultArmorDetails to make baseAC undefined
                                        const defaultArmorDetails: ArmorDetails = { baseAC: undefined, addDexModifier: true, armorType: 'Light' };
                                        setItemDetails(prev => ({
                                            ...prev, 
                                            category: newCategory, 
                                            weaponDetails: newCategory === 'Weapon' ? (prev.weaponDetails || defaultWeaponDetails) : undefined, 
                                            armorDetails: newCategory === 'Armor' ? (prev.armorDetails || defaultArmorDetails) : undefined 
                                        }));
                                    }} 
                                    className="input-field-small">
                                    {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{ITEM_CATEGORY_ES[cat]}</option>)}
                                </select>
                            </div>
                            {/* Common Details */}
                            <div className="mb-3"> <label htmlFor="itemDesc" className="block text-xs font-medium">Descripción</label> <textarea id="itemDesc" value={itemDetails.description} onChange={e => setItemDetails({...itemDetails, description: e.target.value})} rows={2} className="input-field-small"/> </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div><label htmlFor="itemCost" className="block text-xs font-medium">Costo (ej: 10 gp)</label><input type="text" id="itemCost" value={itemDetails.cost as string || ''} onChange={e => setItemDetails({...itemDetails, cost: e.target.value})} className="input-field-small"/></div>
                                <div><label htmlFor="itemWeight" className="block text-xs font-medium">Peso (ej: 5 lb)</label><input type="text" id="itemWeight" value={itemDetails.weight as string || ''} onChange={e => setItemDetails({...itemDetails, weight: e.target.value})} className="input-field-small"/></div>
                            </div>
                             {/* Weapon Details */}
                            {itemDetails.category === 'Weapon' && (
                                <fieldset className="form-subsection border-purple-400 dark:border-purple-600 mb-3">
                                    <legend className="legend-title-small text-purple-600 dark:text-purple-400">Detalles de Arma</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-2xs">Dados Daño*</label><input type="text" value={itemDetails.weaponDetails?.damageDice || ''} onChange={e=>setItemDetails({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, damageDice:e.target.value}})} className="input-field-small"/></div>
                                        <div><label className="text-2xs">Tipo Daño*</label><select value={itemDetails.weaponDetails?.damageType || DAMAGE_TYPES_LIST[0]} onChange={e=>setItemDetails({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, damageType:e.target.value as DamageType}})} className="input-field-small">{DAMAGE_TYPES_LIST.map(dt=><option key={dt} value={dt}>{DAMAGE_TYPE_ES[dt]}</option>)}</select></div>
                                    </div>
                                    <label className="text-2xs mt-1 block">Propiedades</label>
                                    <div className="grid grid-cols-2 gap-1 text-2xs">
                                        {WEAPON_PROPERTIES_LIST.map(prop => <label key={prop} className="checkbox-label-small"><input type="checkbox" checked={itemDetails.weaponDetails?.properties?.includes(prop)} onChange={() => { const oldProps = itemDetails.weaponDetails?.properties || []; const newProps = oldProps.includes(prop) ? oldProps.filter(p=>p!==prop) : [...oldProps, prop]; setItemDetails({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, properties: newProps}});}} className="checkbox-input-small"/>{WEAPON_PROPERTY_ES[prop]}</label>)}
                                    </div>
                                </fieldset>
                            )}
                            {/* Armor Details */}
                            {itemDetails.category === 'Armor' && (
                                <fieldset className="form-subsection border-sky-400 dark:border-sky-600 mb-3">
                                    <legend className="legend-title-small text-sky-600 dark:text-sky-400">Detalles de Armadura</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-2xs">CA Base*</label><input type="number" placeholder="Ej: 12" value={itemDetails.armorDetails?.baseAC === undefined ? '' : itemDetails.armorDetails.baseAC} onChange={e=>setItemDetails({...itemDetails, armorDetails: {...itemDetails.armorDetails!, baseAC: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className="input-field-small"/></div>
                                        <div><label className="text-2xs">Tipo Armadura</label><select value={itemDetails.armorDetails?.armorType || ''} onChange={e=>setItemDetails({...itemDetails, armorDetails: {...itemDetails.armorDetails!, armorType:e.target.value as ArmorType || undefined}})} className="input-field-small"><option value="">Genérica/Escudo</option>{ARMOR_TYPES_LIST.map(at=><option key={at} value={at}>{ARMOR_TYPE_ES[at]}</option>)}</select></div>
                                    </div>
                                    <label className="checkbox-label-small mt-1"><input type="checkbox" checked={itemDetails.armorDetails?.addDexModifier} onChange={e=>setItemDetails({...itemDetails, armorDetails: {...itemDetails.armorDetails!, addDexModifier: e.target.checked}})} className="checkbox-input-small"/>Añadir Mod. Destreza</label>
                                    {itemDetails.armorDetails?.addDexModifier && <div><label className="text-2xs">Max Dex Bonus (0 o vacío si no hay)</label><input type="number" min="0" value={itemDetails.armorDetails?.maxDexBonus ?? ''} onChange={e=>setItemDetails({...itemDetails, armorDetails: {...itemDetails.armorDetails!, maxDexBonus: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className="input-field-small"/></div>}
                                    <label className="checkbox-label-small mt-1"><input type="checkbox" checked={itemDetails.armorDetails?.stealthDisadvantage} onChange={e=>setItemDetails({...itemDetails, armorDetails: {...itemDetails.armorDetails!, stealthDisadvantage: e.target.checked}})} className="checkbox-input-small"/>Desventaja Sigilo</label>
                                </fieldset>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowMiniItemCreator(false)} className="btn-secondary-small">Cancelar</button>
                                <button type="button" onClick={handleSaveItemFromMiniCreator} className="btn-primary-small">Guardar Objeto</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Origin Feat & ASI */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="originFeat" className="block text-sm font-medium">Dote de Origen*</label>
                        <input type="text" id="originFeat" value={originFeat} onChange={(e) => setOriginFeat(e.target.value)} required placeholder="Ej: Iniciado en la Magia (Mago)" className="mt-1 input-field"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Opciones de IPC* (Incremento Punt. Caract.)</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {ABILITY_SCORE_NAMES_ORDERED.map(ab => (
                                <label key={ab} className="checkbox-label">
                                    <input type="checkbox" checked={asiOptions.includes(ab)} onChange={() => handleMultiSelectToggle(setAsiOptions, asiOptions, ab)} className="checkbox-input"/>{ABILITY_SCORE_ES_MAP[ab]}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Trasfondo
                    </button>
                </div>
            </form>
            <style>{`
                .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
                .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .input-field-small { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; color: #111827; }
                .dark .input-field-small { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .checkbox-label { display: flex; align-items: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; color: #374151;}
                .dark .checkbox-label { background-color: #4b5563; color: #d1d5db; }
                .checkbox-label-small { display: flex; align-items: center; padding: 0.25rem; background-color: #f3f4f6; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; color: #374151;}
                .dark .checkbox-label-small { background-color: #4b5563; color: #d1d5db; }

                .checkbox-input { height: 1rem; width: 1rem; margin-right: 0.5rem; color: #4f46e5; border-color: #6b7280; border-radius: 0.25rem; }
                .dark .checkbox-input { color: #818cf8; border-color: #4b5563; background-color: #374151; }
                .checkbox-input-small { height: 0.875rem; width: 0.875rem; margin-right: 0.375rem; color: #4f46e5; border-color: #6b7280; border-radius: 0.125rem; }

                .list-styled { list-style: none; padding-left: 0; margin-top: 0.25rem; font-size: 0.875rem; }
                .list-styled li { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background-color: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.25rem; color: #1f2937; }
                .dark .list-styled li { background-color: #374151; color: #e5e7eb; }
                .btn-add { padding: 0.5rem; background-color: #4f46e5; color: white; border-radius: 0.375rem; }
                .dark .btn-add { background-color: #818cf8; }
                .btn-add-small { padding: 0.25rem; background-color: #60a5fa; color: white; border-radius: 0.25rem; }
                .dark .btn-add-small { background-color: #3b82f6; }
                .btn-remove-small { padding: 0.125rem; color: #f43f5e; }
                .dark .btn-remove-small { color: #fb7185; }
                .form-section { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-top: 1rem; background-color: #f9fafb; }
                .dark .form-section { border-color: #374151; background-color: #1f2937; }
                .legend-title { font-size: 1.125rem; font-weight: 600; color: #4f46e5; margin-bottom: 0.5rem; }
                .dark .legend-title { color: #818cf8; }
                .legend-title-small { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
                .form-subsection { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; margin-top: 0.5rem; background-color: #ffffff; }
                .dark .form-subsection { border-color: #4b5563; background-color: #374151; }

                .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border: 1px solid transparent; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: white; background-color: #16a34a; }
                .btn-primary:hover { background-color: #15803d; }
                .btn-primary-small { display: inline-flex; align-items: center; justify-content: center; padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 500; border-radius: 0.25rem; color: white; background-color: #16a34a; }
                .btn-primary-small:hover { background-color: #15803d; }
                .btn-secondary-link { font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #4f46e5; background-color: #e0e7ff; }
                .dark .btn-secondary-link { color: #a5b4fc; background-color: #3730a3; }
                .btn-secondary-link:hover { background-color: #c7d2fe; }
                .dark .btn-secondary-link:hover { background-color: #4338ca; }
                 .btn-secondary-small { display: inline-flex; align-items: center; justify-content: center; padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 500; border-radius: 0.25rem; color: white; background-color: #2563eb; }
                .btn-secondary-small:hover { background-color: #1d4ed8; }
                .btn-ai-generate { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: #1f2937; background-color: #facc15; }
                .dark .btn-ai-generate { color: #111827; background-color: #fde047; }
                .btn-ai-generate:hover { background-color: #f59e0b; }
                .dark .btn-ai-generate:hover { background-color: #fbbf24; }
                .btn-ai-generate:disabled { background-color: #9ca3af; cursor: not-allowed; }
                .dark .btn-ai-generate:disabled { background-color: #4b5563; }
                .error-box { padding: 0.75rem; background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 0.375rem; color: #b91c1c; font-size: 0.875rem; display:flex; align-items: flex-start; }
                .dark .error-box { background-color: #5f2120; border-color: #b91c1c; color: #fca5a5;}
                .error-icon { height: 1.25rem; width: 1.25rem; margin-right: 0.5rem; flex-shrink: 0; color: #dc2626; }
                .dark .error-icon { color: #f87171;}
            `}</style>
        </div>
    );
};

export default CreateCustomBackgroundForm;
