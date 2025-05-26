
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { DndClass, AbilityScoreName, SkillName, Trait, StartingEquipmentItem, ClassSpellcasting, ItemCategory, ITEM_CATEGORIES, WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType } from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { WEAPON_PROPERTIES_LIST, DAMAGE_TYPES_LIST, ARMOR_TYPES_LIST } from '../../constants/items';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
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

const HIT_DICE_OPTIONS = [4, 6, 8, 10, 12];
const ALL_SKILL_NAMES_OBJECT = SKILL_DEFINITIONS.map(skill => ({ name: skill.name, nombre: skill.nombre }));

interface AiGeneratedClassData {
    name?: string;
    hitDie?: number;
    primaryAbilities?: AbilityScoreName[];
    savingThrowProficiencies?: AbilityScoreName[];
    armorProficiencies?: string[];
    weaponProficiencies?: string[];
    toolProficiencies?: { choices?: string[], count?: number, fixed?: string[] };
    skillProficiencies?: { choices?: SkillName[], count?: number };
    startingEquipmentBundles?: Array<{ 
        key?: string; 
        description?: string; 
        items?: Array<Partial<StartingEquipmentItem>>; 
        gold?: number; 
    }>;
    classFeaturesLevel1?: Array<Partial<Trait>>;
    weaponMasteriesKnown?: number;
    spellcasting?: Partial<ClassSpellcasting>;
}

const initialMiniItemState: Omit<StartingEquipmentItem, 'name' | 'quantity'> = {
    category: 'Miscellaneous', description: '', cost: '', weight: '',
    weaponDetails: undefined, armorDetails: undefined,
};

const CreateCustomClassForm: React.FC = () => {
    const { dispatch } = useHeroForge();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    // Form State
    const [name, setName] = useState('');
    const [hitDie, setHitDie] = useState<number>(8);
    const [primaryAbilities, setPrimaryAbilities] = useState<AbilityScoreName[]>([]);
    const [savingThrowProficiencies, setSavingThrowProficiencies] = useState<AbilityScoreName[]>([]);
    const [armorProficiencies, setArmorProficiencies] = useState<string[]>([]); 
    const [currentArmorProf, setCurrentArmorProf] = useState('');
    const [weaponProficiencies, setWeaponProficiencies] = useState<string[]>([]);
    const [currentWeaponProf, setCurrentWeaponProf] = useState('');
    
    const [toolProfChoices, setToolProfChoices] = useState<string[]>([]);
    const [currentToolProfChoice, setCurrentToolProfChoice] = useState('');
    const [toolProfCount, setToolProfCount] = useState<number>(0);
    const [fixedToolProfs, setFixedToolProfs] = useState<string[]>([]);
    const [currentFixedToolProf, setCurrentFixedToolProf] = useState('');

    const [skillProfChoices, setSkillProfChoices] = useState<SkillName[]>([]);
    const [skillProfCount, setSkillProfCount] = useState<number>(2);

    const [startingEquipmentBundles, setStartingEquipmentBundles] = useState<Array<DndClass['startingEquipmentBundles'][0]>>([]);
    const [currentBundleKey, setCurrentBundleKey] = useState('');
    const [currentBundleDesc, setCurrentBundleDesc] = useState('');
    const [currentBundleItems, setCurrentBundleItems] = useState<StartingEquipmentItem[]>([]);
    
    const [bundleItemName, setBundleItemName] = useState('');
    const [bundleItemQty, setBundleItemQty] = useState(1);
    const [bundleItemDetails, setBundleItemDetails] = useState<Omit<StartingEquipmentItem, 'name' | 'quantity'>>(initialMiniItemState);
    const [showBundleItemMiniCreator, setShowBundleItemMiniCreator] = useState(false);
    const [editingBundleItemIndex, setEditingBundleItemIndex] = useState<number | null>(null);


    const [currentBundleGold, setCurrentBundleGold] = useState<number | undefined>(undefined);
    
    const [classFeaturesLevel1, setClassFeaturesLevel1] = useState<Trait[]>([]);
    const [currentFeatureName, setCurrentFeatureName] = useState('');
    const [currentFeatureDesc, setCurrentFeatureDesc] = useState('');

    const [weaponMasteriesKnown, setWeaponMasteriesKnown] = useState<number | undefined>(undefined);
    const [spellcasting, setSpellcasting] = useState<ClassSpellcasting | undefined>(undefined);


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

    const openMiniItemCreatorForBundle = (itemToEdit?: StartingEquipmentItem, index?: number) => {
        if (itemToEdit && typeof index === 'number') {
            setBundleItemName(itemToEdit.name);
            setBundleItemQty(itemToEdit.quantity);
            setBundleItemDetails({
                category: itemToEdit.category || 'Miscellaneous',
                description: itemToEdit.description || '',
                cost: itemToEdit.cost || '',
                weight: itemToEdit.weight || '',
                weaponDetails: itemToEdit.weaponDetails,
                armorDetails: itemToEdit.armorDetails,
            });
            setEditingBundleItemIndex(index);
        } else {
            setBundleItemName('');
            setBundleItemQty(1);
            setBundleItemDetails({...initialMiniItemState}); // Ensure fresh state
            setEditingBundleItemIndex(null);
        }
        setShowBundleItemMiniCreator(true);
    };
    
    const handleSaveBundleItemFromMiniCreator = () => {
        if (!bundleItemName.trim() || bundleItemQty <= 0) {
            alert("Nombre del objeto y cantidad son requeridos.");
            return;
        }

        let finalWeaponDetails: WeaponDetails | undefined = undefined;
        if (bundleItemDetails.category === 'Weapon') {
            if (!bundleItemDetails.weaponDetails?.damageDice?.trim() || !bundleItemDetails.weaponDetails?.damageType) {
                 alert('Para armas, se requieren dados de daño y tipo de daño.'); return;
            }
            finalWeaponDetails = {
                damageDice: bundleItemDetails.weaponDetails.damageDice.trim(),
                damageType: bundleItemDetails.weaponDetails.damageType,
                properties: bundleItemDetails.weaponDetails.properties || [],
                rangeNormal: bundleItemDetails.weaponDetails.rangeNormal || undefined,
                rangeLong: bundleItemDetails.weaponDetails.rangeLong || undefined,
                versatileDamage: bundleItemDetails.weaponDetails.versatileDamage?.trim() || undefined,
            };
        }

        let finalArmorDetails: ArmorDetails | undefined = undefined;
        if (bundleItemDetails.category === 'Armor') {
            if (bundleItemDetails.armorDetails?.baseAC === undefined || bundleItemDetails.armorDetails.baseAC < 0) {
                alert('Para armaduras, se requiere CA Base y debe ser no negativa.'); return;
            }
            finalArmorDetails = {
                baseAC: bundleItemDetails.armorDetails.baseAC,
                addDexModifier: bundleItemDetails.armorDetails.addDexModifier || false,
                maxDexBonus: (bundleItemDetails.armorDetails.addDexModifier && bundleItemDetails.armorDetails.maxDexBonus !== undefined && bundleItemDetails.armorDetails.maxDexBonus >= 0) ? bundleItemDetails.armorDetails.maxDexBonus : undefined,
                armorType: bundleItemDetails.armorDetails.armorType || undefined,
                strengthRequirement: (bundleItemDetails.armorDetails.strengthRequirement !== undefined && bundleItemDetails.armorDetails.strengthRequirement >=0) ? bundleItemDetails.armorDetails.strengthRequirement : undefined,
                stealthDisadvantage: bundleItemDetails.armorDetails.stealthDisadvantage || false,
            };
        }

        const newItem: StartingEquipmentItem = {
            name: bundleItemName.trim(),
            quantity: bundleItemQty,
            category: bundleItemDetails.category,
            description: bundleItemDetails.description?.trim() || undefined,
            cost: typeof bundleItemDetails.cost === 'string' ? bundleItemDetails.cost.trim() || undefined : bundleItemDetails.cost,
            weight: typeof bundleItemDetails.weight === 'string' ? bundleItemDetails.weight.trim() || undefined : bundleItemDetails.weight,
            weaponDetails: finalWeaponDetails,
            armorDetails: finalArmorDetails,
        };

        if (editingBundleItemIndex !== null) {
            const updatedItems = [...currentBundleItems];
            updatedItems[editingBundleItemIndex] = newItem;
            setCurrentBundleItems(updatedItems);
        } else {
            setCurrentBundleItems([...currentBundleItems, newItem]);
        }
        setShowBundleItemMiniCreator(false);
        setEditingBundleItemIndex(null);
    };
    
    const handleRemoveBundleItem = (index: number) => {
      setCurrentBundleItems(currentBundleItems.filter((_, i) => i !== index));
    };

    const handleAddBundle = () => {
      if(currentBundleKey.trim() && currentBundleDesc.trim()) {
        setStartingEquipmentBundles([...startingEquipmentBundles, {
          key: currentBundleKey.trim(), 
          description: currentBundleDesc.trim(), 
          items: currentBundleItems, 
          gold: currentBundleGold
        }]);
        setCurrentBundleKey(''); setCurrentBundleDesc(''); setCurrentBundleItems([]); setCurrentBundleGold(undefined);
      }
    };
    const handleRemoveBundle = (key: string) => {
        setStartingEquipmentBundles(startingEquipmentBundles.filter(b => b.key !== key));
    };

    const handleAddFeature = () => {
      if(currentFeatureName.trim() && currentFeatureDesc.trim()){
        setClassFeaturesLevel1([...classFeaturesLevel1, {name: currentFeatureName.trim(), description: currentFeatureDesc.trim()}]);
        setCurrentFeatureName(''); setCurrentFeatureDesc('');
      }
    };
    const handleRemoveFeature = (name: string) => {
      setClassFeaturesLevel1(classFeaturesLevel1.filter(f => f.name !== name));
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setHitDie(8); setPrimaryAbilities([]); setSavingThrowProficiencies([]);
        setArmorProficiencies([]); setCurrentArmorProf(''); setWeaponProficiencies([]); setCurrentWeaponProf('');
        setToolProfChoices([]); setCurrentToolProfChoice(''); setToolProfCount(0); setFixedToolProfs([]); setCurrentFixedToolProf('');
        setSkillProfChoices([]); setSkillProfCount(2);
        setStartingEquipmentBundles([]); setCurrentBundleKey(''); setCurrentBundleDesc(''); setCurrentBundleItems([]); 
        setBundleItemName(''); setBundleItemQty(1); setBundleItemDetails({...initialMiniItemState}); setShowBundleItemMiniCreator(false); setEditingBundleItemIndex(null);
        setCurrentBundleGold(undefined);
        setClassFeaturesLevel1([]); setCurrentFeatureName(''); setCurrentFeatureDesc('');
        setWeaponMasteriesKnown(undefined); setSpellcasting(undefined);
        if(includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Por favor, introduce una descripción para la clase que quieres crear.");
            return;
        }
        setIsAiLoading(true); setAiError(null); resetFormFields(false);

        const systemPrompt = `
            Eres un diseñador experto de clases de D&D 5e. Genera un objeto JSON para una nueva clase basado en la idea del usuario.
            El JSON debe seguir esta estructura:
            {
                "name": "Nombre de la Clase (string)",
                "hitDie": "Dado de Golpe (number, uno de: ${HIT_DICE_OPTIONS.join(', ')})",
                "primaryAbilities": ["Array de AbilityScoreName, ej: ['Strength', 'Charisma']"],
                "savingThrowProficiencies": ["Array de AbilityScoreName para competencias en salvación"],
                "armorProficiencies": ["Array de strings, ej: ['Light Armor', 'Shields']"],
                "weaponProficiencies": ["Array de strings, ej: ['Simple Weapons', 'Longswords']"],
                "toolProficiencies": { "choices": ["Array de strings para opciones"], "count": "number de elecciones", "fixed": ["Array de strings para fijas"] },
                "skillProficiencies": { "choices": ["Array de SkillName de la lista: ${ALL_SKILL_NAMES_OBJECT.map(s=>s.name).join(', ')}"], "count": "number de elecciones (usualmente 2-4)" },
                "startingEquipmentBundles": [ 
                    { 
                        "key": "A", 
                        "description": "Descripción del Lote A", 
                        "items": [{ 
                            "name": "NombreObjeto", "quantity": 1, 
                            "category": "Weapon | Armor | Miscellaneous",
                            "description": "Descripción breve",
                            "cost": "ej. '10 gp'",
                            "weight": "ej. '3 lb'",
                            "weaponDetails": { "damageDice": "1d8", "damageType": "Slashing", "properties": ["Versatile"], "versatileDamage": "1d10" },
                            "armorDetails": { "baseAC": 14, "armorType": "Medium", "addDexModifier": true, "maxDexBonus": 2, "stealthDisadvantage": false, "strengthRequirement": 13 }
                        }], 
                        "gold": 10 
                    } 
                ],
                "classFeaturesLevel1": [ { "name": "Nombre del Rasgo N1", "description": "Descripción del Rasgo N1" } ],
                "weaponMasteriesKnown": "number o null (usualmente para clases marciales, ej. 2)",
                "spellcasting": { 
                    "ability": "AbilityScoreName", "knownCantrips": 2, "preparedSpells": 4, "spellSlotsLevel1": 2, "spellList": ["Hechizo1", "Hechizo2"]
                }
            }
            Idea de la clase del usuario: "${aiPrompt}"
            Responde ÚNICAMENTE con el objeto JSON. Sé creativo pero mantén el equilibrio del juego.
            Para 'items' en 'startingEquipmentBundles':
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
            
            const aiData: AiGeneratedClassData = JSON.parse(jsonStr);

            setName(aiData.name || '');
            setHitDie(aiData.hitDie && HIT_DICE_OPTIONS.includes(aiData.hitDie) ? aiData.hitDie : 8);
            setPrimaryAbilities((aiData.primaryAbilities || []).filter(ab => ABILITY_SCORE_NAMES_ORDERED.includes(ab as AbilityScoreName)) as AbilityScoreName[]);
            setSavingThrowProficiencies((aiData.savingThrowProficiencies || []).filter(ab => ABILITY_SCORE_NAMES_ORDERED.includes(ab as AbilityScoreName)) as AbilityScoreName[]);
            setArmorProficiencies(aiData.armorProficiencies || []);
            setWeaponProficiencies(aiData.weaponProficiencies || []);
            setToolProfChoices(aiData.toolProficiencies?.choices || []);
            setToolProfCount(aiData.toolProficiencies?.count || 0);
            setFixedToolProfs(aiData.toolProficiencies?.fixed || []);
            setSkillProfChoices((aiData.skillProficiencies?.choices || []).filter(sk => ALL_SKILL_NAMES_OBJECT.map(s=>s.name).includes(sk as SkillName)) as SkillName[]);
            setSkillProfCount(aiData.skillProficiencies?.count || 2);
            
            setStartingEquipmentBundles((aiData.startingEquipmentBundles || []).map(b => ({ 
                key: b.key || 'X', 
                description: b.description||'', 
                items: (b.items||[]).map(i => {
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
                        quantity: i.quantity||1,
                        category: cat,
                        description: i.description,
                        cost: i.cost,
                        weight: i.weight,
                        weaponDetails: parsedWeaponDetails,
                        armorDetails: parsedArmorDetails,
                    };
                }), 
                gold: b.gold
            })) as DndClass['startingEquipmentBundles']);

            setClassFeaturesLevel1((aiData.classFeaturesLevel1 || []).map(f => ({name: f.name||'', description: f.description||''})) as Trait[]);
            setWeaponMasteriesKnown(aiData.weaponMasteriesKnown);
            
            if(aiData.spellcasting){
                setSpellcasting({
                    ability: aiData.spellcasting.ability && ABILITY_SCORE_NAMES_ORDERED.includes(aiData.spellcasting.ability as AbilityScoreName) ? aiData.spellcasting.ability as AbilityScoreName : 'Intelligence',
                    knownCantrips: aiData.spellcasting.knownCantrips,
                    preparedSpells: aiData.spellcasting.preparedSpells,
                    spellSlotsLevel1: aiData.spellcasting.spellSlotsLevel1,
                    spellList: aiData.spellcasting.spellList
                });
            } else {
                setSpellcasting(undefined);
            }

        } catch (e) {
            console.error("Error al generar clase con IA:", e);
            setAiError(`Falló la generación de detalles de la clase. Error: ${(e as Error).message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || primaryAbilities.length === 0 || savingThrowProficiencies.length === 0 || skillProfChoices.length === 0) {
            alert('Nombre, Características Primarias, Competencias en Salvación y al menos una opción de habilidad son obligatorios.');
            return;
        }

        const classData: Omit<DndClass, 'id' | 'isCustom'> = {
            name: name.trim(), hitDie, primaryAbilities, savingThrowProficiencies, armorProficiencies, weaponProficiencies,
            toolProficiencies: { choices: toolProfChoices, count: toolProfCount, fixed: fixedToolProfs },
            skillProficiencies: { choices: skillProfChoices, count: skillProfCount },
            startingEquipmentBundles, classFeaturesLevel1, weaponMasteriesKnown, spellcasting,
        };
        dispatch({ type: 'ADD_CUSTOM_CLASS', payload: classData });
        alert(`¡Clase personalizada "${name.trim()}" creada con éxito!`);
        resetFormFields(true);
    };
    
    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Clase Personalizada</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de Clases con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Un guerrero que canaliza la energía de las tormentas, usando rayos y truenos en combate." rows={3} className="w-full p-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                {/* General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="className" className="block text-sm font-medium">Nombre de la Clase*</label>
                        <input type="text" id="className" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 input-field"/>
                    </div>
                    <div>
                        <label htmlFor="hitDie" className="block text-sm font-medium">Dado de Golpe*</label>
                        <select id="hitDie" value={hitDie} onChange={(e) => setHitDie(parseInt(e.target.value))} className="mt-1 input-field">
                            {HIT_DICE_OPTIONS.map(hd => <option key={hd} value={hd}>d{hd}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Características Primarias*</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {ABILITY_SCORE_NAMES_ORDERED.map(ab => (
                            <label key={ab} className="checkbox-label"><input type="checkbox" checked={primaryAbilities.includes(ab)} onChange={() => handleMultiSelectToggle(setPrimaryAbilities, primaryAbilities, ab)} className="checkbox-input"/>{ABILITY_SCORE_ES_MAP[ab]}</label>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Competencias en Tiradas de Salvación*</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {ABILITY_SCORE_NAMES_ORDERED.map(ab => (
                            <label key={ab} className="checkbox-label"><input type="checkbox" checked={savingThrowProficiencies.includes(ab)} onChange={() => handleMultiSelectToggle(setSavingThrowProficiencies, savingThrowProficiencies, ab)} className="checkbox-input"/>{ABILITY_SCORE_ES_MAP[ab]}</label>
                        ))}
                    </div>
                </div>

                {/* Proficiencies: Armor & Weapon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Competencias en Armaduras</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="text" value={currentArmorProf} onChange={e => setCurrentArmorProf(e.target.value)} placeholder="Ej: Armadura Ligera" className="input-field flex-grow"/>
                            <button type="button" onClick={() => addToList(armorProficiencies, setArmorProficiencies, currentArmorProf, setCurrentArmorProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{armorProficiencies.map(ap => <li key={ap}>{ap} <button type="button" onClick={() => removeFromList(armorProficiencies, setArmorProficiencies, ap)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Competencias en Armas</label>
                         <div className="flex items-center gap-2 mt-1">
                            <input type="text" value={currentWeaponProf} onChange={e => setCurrentWeaponProf(e.target.value)} placeholder="Ej: Armas Simples" className="input-field flex-grow"/>
                            <button type="button" onClick={() => addToList(weaponProficiencies, setWeaponProficiencies, currentWeaponProf, setCurrentWeaponProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{weaponProficiencies.map(wp => <li key={wp}>{wp} <button type="button" onClick={() => removeFromList(weaponProficiencies, setWeaponProficiencies, wp)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                </div>
                
                {/* Proficiencies: Tools */}
                <fieldset className="form-section">
                    <legend className="legend-title">Competencias en Herramientas</legend>
                    <div>
                        <label className="block text-sm font-medium">Opciones de Herramientas (Nombres)</label>
                        <div className="flex items-center gap-2 mt-1">
                           <input type="text" value={currentToolProfChoice} onChange={e=>setCurrentToolProfChoice(e.target.value)} placeholder="Ej: Herramientas de Ladrón" className="input-field flex-grow"/>
                           <button type="button" onClick={()=>addToList(toolProfChoices, setToolProfChoices, currentToolProfChoice, setCurrentToolProfChoice)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{toolProfChoices.map(tc=><li key={tc}>{tc}<button type="button" onClick={()=>removeFromList(toolProfChoices, setToolProfChoices, tc)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                    <div>
                        <label htmlFor="toolProfCount" className="block text-sm font-medium">Número de Elecciones de Herramientas</label>
                        <input type="number" id="toolProfCount" value={toolProfCount} min="0" onChange={e=>setToolProfCount(parseInt(e.target.value) || 0)} className="input-field"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Competencias Fijas en Herramientas</label>
                        <div className="flex items-center gap-2 mt-1">
                           <input type="text" value={currentFixedToolProf} onChange={e=>setCurrentFixedToolProf(e.target.value)} placeholder="Ej: Instrumento Musical" className="input-field flex-grow"/>
                           <button type="button" onClick={()=>addToList(fixedToolProfs, setFixedToolProfs, currentFixedToolProf, setCurrentFixedToolProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                        </div>
                        <ul className="list-styled">{fixedToolProfs.map(ftp=><li key={ftp}>{ftp}<button type="button" onClick={()=>removeFromList(fixedToolProfs, setFixedToolProfs, ftp)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                    </div>
                </fieldset>

                {/* Proficiencies: Skills */}
                <fieldset className="form-section">
                    <legend className="legend-title">Competencias en Habilidades*</legend>
                     <div>
                        <label className="block text-sm font-medium">Opciones de Habilidades</label>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                             {ALL_SKILL_NAMES_OBJECT.map(skill => (
                                <label key={skill.name} className="checkbox-label">
                                    <input type="checkbox" checked={skillProfChoices.includes(skill.name)} onChange={() => handleMultiSelectToggle(setSkillProfChoices, skillProfChoices, skill.name)} className="checkbox-input"/>{skill.nombre}
                                </label>
                             ))}
                         </div>
                    </div>
                    <div>
                        <label htmlFor="skillProfCount" className="block text-sm font-medium">Número de Elecciones de Habilidades</label>
                        <input type="number" id="skillProfCount" value={skillProfCount} min="0" onChange={e=>setSkillProfCount(parseInt(e.target.value) || 0)} className="input-field"/>
                    </div>
                </fieldset>

                {/* Starting Equipment Bundles */}
                <fieldset className="form-section">
                    <legend className="legend-title">Lotes de Equipo Inicial</legend>
                    {startingEquipmentBundles.map(bundle => (
                        <div key={bundle.key} className="form-subsection">
                             <div className="flex justify-between items-center"><h4 className="font-medium">Lote {bundle.key}: {bundle.description}</h4><button type="button" onClick={()=>handleRemoveBundle(bundle.key)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button></div>
                             <ul className="text-xs list-disc list-inside pl-2">{bundle.items.map((item, idx) => <li key={idx}>{item.name} (x{item.quantity}) {item.category && `[${ITEM_CATEGORY_ES[item.category] || item.category}]`}</li>)}</ul>
                             {bundle.gold !== undefined && <p className="text-xs">Oro: {bundle.gold} po</p>}
                        </div>
                    ))}
                    <div className="form-subsection border-dashed">
                        <input type="text" value={currentBundleKey} onChange={e=>setCurrentBundleKey(e.target.value)} placeholder="Clave del Lote (ej: A, B)" className="input-field mb-1"/>
                        <input type="text" value={currentBundleDesc} onChange={e=>setCurrentBundleDesc(e.target.value)} placeholder="Descripción del Lote" className="input-field mb-1"/>
                        
                        {currentBundleItems.map((item, index) => (
                            <div key={index} className="text-xs p-1 my-1 bg-slate-200 dark:bg-slate-600 rounded flex justify-between items-center">
                                <span>{item.name} (x{item.quantity}) {item.category && `[${ITEM_CATEGORY_ES[item.category] || item.category}]`}</span>
                                <div>
                                    <button type="button" onClick={() => openMiniItemCreatorForBundle(item, index)} className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 p-0.5 text-2xs"><PencilSquareIcon className="h-4 w-4 inline-block mr-0.5" />Editar</button>
                                    <button type="button" onClick={() => handleRemoveBundleItem(index)} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 p-0.5 text-2xs ml-1"><TrashIcon className="h-4 w-4 inline-block mr-0.5" />Quitar</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => openMiniItemCreatorForBundle()} className="btn-secondary-small w-full text-xs mb-1">
                            <PlusCircleIcon className="h-4 w-4 mr-1"/> Añadir Objeto al Lote
                        </button>

                        <input type="number" value={currentBundleGold===undefined?'':currentBundleGold} min="0" onChange={e=>setCurrentBundleGold(e.target.value===''?undefined:parseInt(e.target.value))} placeholder="Oro (Opcional)" className="input-field mb-1"/>
                        <button type="button" onClick={handleAddBundle} className="btn-secondary w-full">Añadir Lote de Equipo</button>
                    </div>
                </fieldset>
                 {/* Mini Item Creator Modal/Section for Bundle Item */}
                {showBundleItemMiniCreator && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowBundleItemMiniCreator(false)}>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">{editingBundleItemIndex !== null ? "Editar Objeto del Lote" : "Añadir Objeto al Lote"}</h3>
                            {/* Name & Qty */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="col-span-2">
                                    <label htmlFor="bundleItemName" className="block text-xs font-medium">Nombre del Objeto*</label>
                                    <input type="text" id="bundleItemName" value={bundleItemName} onChange={e => setBundleItemName(e.target.value)} className="input-field-small" />
                                </div>
                                <div>
                                    <label htmlFor="bundleItemQty" className="block text-xs font-medium">Cantidad*</label>
                                    <input type="number" id="bundleItemQty" value={bundleItemQty} min="1" onChange={e => setBundleItemQty(parseInt(e.target.value) || 1)} className="input-field-small" />
                                </div>
                            </div>
                            {/* Category */}
                            <div className="mb-3">
                                <label htmlFor="bundleItemCategory" className="block text-xs font-medium">Categoría</label>
                                <select id="bundleItemCategory" value={bundleItemDetails.category} 
                                    onChange={e => {
                                        const newCategory = e.target.value as ItemCategory;
                                        const defaultWeaponDetails: WeaponDetails = { damageDice: '', damageType: DAMAGE_TYPES_LIST[0], properties: [] };
                                        // Corrected defaultArmorDetails to make baseAC undefined
                                        const defaultArmorDetails: ArmorDetails = { baseAC: undefined, addDexModifier: true, armorType: 'Light' };
                                        setBundleItemDetails(prev => ({
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
                            <div className="mb-3"> <label htmlFor="bundleItemDesc" className="block text-xs font-medium">Descripción</label> <textarea id="bundleItemDesc" value={bundleItemDetails.description} onChange={e => setBundleItemDetails({...bundleItemDetails, description: e.target.value})} rows={2} className="input-field-small"/> </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div><label htmlFor="bundleItemCost" className="block text-xs font-medium">Costo (ej: 10 gp)</label><input type="text" id="bundleItemCost" value={bundleItemDetails.cost as string || ''} onChange={e => setBundleItemDetails({...bundleItemDetails, cost: e.target.value})} className="input-field-small"/></div>
                                <div><label htmlFor="bundleItemWeight" className="block text-xs font-medium">Peso (ej: 5 lb)</label><input type="text" id="bundleItemWeight" value={bundleItemDetails.weight as string || ''} onChange={e => setBundleItemDetails({...bundleItemDetails, weight: e.target.value})} className="input-field-small"/></div>
                            </div>
                            {/* Weapon Details */}
                            {bundleItemDetails.category === 'Weapon' && (
                                <fieldset className="form-subsection border-purple-400 dark:border-purple-600 mb-3">
                                    <legend className="legend-title-small text-purple-600 dark:text-purple-400">Detalles de Arma</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-2xs">Dados Daño*</label><input type="text" value={bundleItemDetails.weaponDetails?.damageDice || ''} onChange={e=>setBundleItemDetails({...bundleItemDetails, weaponDetails: {...bundleItemDetails.weaponDetails!, damageDice:e.target.value}})} className="input-field-small"/></div>
                                        <div><label className="text-2xs">Tipo Daño*</label><select value={bundleItemDetails.weaponDetails?.damageType || DAMAGE_TYPES_LIST[0]} onChange={e=>setBundleItemDetails({...bundleItemDetails, weaponDetails: {...bundleItemDetails.weaponDetails!, damageType:e.target.value as DamageType}})} className="input-field-small">{DAMAGE_TYPES_LIST.map(dt=><option key={dt} value={dt}>{DAMAGE_TYPE_ES[dt]}</option>)}</select></div>
                                    </div>
                                    <label className="text-2xs mt-1 block">Propiedades</label>
                                    <div className="grid grid-cols-2 gap-1 text-2xs">
                                        {WEAPON_PROPERTIES_LIST.map(prop => <label key={prop} className="checkbox-label-small"><input type="checkbox" checked={bundleItemDetails.weaponDetails?.properties?.includes(prop)} onChange={() => { const oldProps = bundleItemDetails.weaponDetails?.properties || []; const newProps = oldProps.includes(prop) ? oldProps.filter(p=>p!==prop) : [...oldProps, prop]; setBundleItemDetails({...bundleItemDetails, weaponDetails: {...bundleItemDetails.weaponDetails!, properties: newProps}});}} className="checkbox-input-small"/>{WEAPON_PROPERTY_ES[prop]}</label>)}
                                    </div>
                                </fieldset>
                            )}
                            {/* Armor Details */}
                            {bundleItemDetails.category === 'Armor' && (
                                <fieldset className="form-subsection border-sky-400 dark:border-sky-600 mb-3">
                                    <legend className="legend-title-small text-sky-600 dark:text-sky-400">Detalles de Armadura</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-2xs">CA Base*</label><input type="number" placeholder="Ej: 12" value={bundleItemDetails.armorDetails?.baseAC === undefined ? '' : bundleItemDetails.armorDetails.baseAC} onChange={e=>setBundleItemDetails({...bundleItemDetails, armorDetails: {...bundleItemDetails.armorDetails!, baseAC: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className="input-field-small"/></div>
                                        <div><label className="text-2xs">Tipo Armadura</label><select value={bundleItemDetails.armorDetails?.armorType || ''} onChange={e=>setBundleItemDetails({...bundleItemDetails, armorDetails: {...bundleItemDetails.armorDetails!, armorType:e.target.value as ArmorType || undefined}})} className="input-field-small"><option value="">Genérica/Escudo</option>{ARMOR_TYPES_LIST.map(at=><option key={at} value={at}>{ARMOR_TYPE_ES[at]}</option>)}</select></div>
                                    </div>
                                    <label className="checkbox-label-small mt-1"><input type="checkbox" checked={bundleItemDetails.armorDetails?.addDexModifier} onChange={e=>setBundleItemDetails({...bundleItemDetails, armorDetails: {...bundleItemDetails.armorDetails!, addDexModifier: e.target.checked}})} className="checkbox-input-small"/>Añadir Mod. Destreza</label>
                                    {bundleItemDetails.armorDetails?.addDexModifier && <div><label className="text-2xs">Max Dex Bonus (0 o vacío si no hay)</label><input type="number" min="0" value={bundleItemDetails.armorDetails?.maxDexBonus ?? ''} onChange={e=>setBundleItemDetails({...bundleItemDetails, armorDetails: {...bundleItemDetails.armorDetails!, maxDexBonus: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className="input-field-small"/></div>}
                                    <label className="checkbox-label-small mt-1"><input type="checkbox" checked={bundleItemDetails.armorDetails?.stealthDisadvantage} onChange={e=>setBundleItemDetails({...bundleItemDetails, armorDetails: {...bundleItemDetails.armorDetails!, stealthDisadvantage: e.target.checked}})} className="checkbox-input-small"/>Desventaja Sigilo</label>
                                </fieldset>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowBundleItemMiniCreator(false)} className="btn-secondary-small">Cancelar</button>
                                <button type="button" onClick={handleSaveBundleItemFromMiniCreator} className="btn-primary-small">Guardar Objeto del Lote</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Class Features Level 1 */}
                 <fieldset className="form-section">
                    <legend className="legend-title">Rasgos de Clase (Nivel 1)</legend>
                    {classFeaturesLevel1.map(feature => (
                        <div key={feature.name} className="form-subsection">
                            <div className="flex justify-between items-center"><h4 className="font-medium">{feature.name}</h4><button type="button" onClick={()=>handleRemoveFeature(feature.name)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button></div>
                            <p className="text-xs">{feature.description}</p>
                        </div>
                    ))}
                     <div className="form-subsection border-dashed">
                        <input type="text" value={currentFeatureName} onChange={e=>setCurrentFeatureName(e.target.value)} placeholder="Nombre del Nuevo Rasgo" className="input-field mb-1"/>
                        <textarea value={currentFeatureDesc} onChange={e=>setCurrentFeatureDesc(e.target.value)} placeholder="Descripción del Nuevo Rasgo" rows={2} className="input-field mb-1"/>
                        <button type="button" onClick={handleAddFeature} className="btn-secondary w-full">Añadir Rasgo de Clase</button>
                    </div>
                </fieldset>

                {/* Weapon Masteries & Spellcasting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="weaponMasteries" className="block text-sm font-medium">Maestrías con Armas Conocidas (N1)</label>
                        <input type="number" id="weaponMasteries" value={weaponMasteriesKnown===undefined?'':weaponMasteriesKnown} min="0" onChange={e=>setWeaponMasteriesKnown(e.target.value===''?undefined:parseInt(e.target.value))} placeholder="Ej: 2 (para clases marciales)" className="input-field"/>
                    </div>
                     <label className="checkbox-label mt-4 md:mt-0">
                        <input type="checkbox" checked={!!spellcasting} onChange={e => setSpellcasting(e.target.checked ? { ability: 'Intelligence', knownCantrips: 0, preparedSpells: 0, spellSlotsLevel1: 0 } : undefined)} className="checkbox-input"/>¿Tiene Lanzamiento de Hechizos?
                    </label>
                </div>

                {spellcasting && (
                    <fieldset className="form-section">
                        <legend className="legend-title">Detalles de Lanzamiento de Hechizos (N1)</legend>
                        <div>
                            <label htmlFor="spellAbility" className="block text-sm font-medium">Característica de Lanzamiento</label>
                            <select id="spellAbility" value={spellcasting.ability} onChange={e => setSpellcasting({...spellcasting, ability: e.target.value as AbilityScoreName})} className="input-field">
                                {ABILITY_SCORE_NAMES_ORDERED.map(ab => <option key={ab} value={ab}>{ABILITY_SCORE_ES_MAP[ab]}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div><label htmlFor="knownCantrips" className="block text-xs">Trucos Conocidos</label><input type="number" id="knownCantrips" value={spellcasting.knownCantrips} min="0" onChange={e => setSpellcasting({...spellcasting, knownCantrips: parseInt(e.target.value)})} className="input-field-small"/></div>
                            <div><label htmlFor="preparedSpells" className="block text-xs">Hechizos Prep./Conoc.</label><input type="number" id="preparedSpells" value={spellcasting.preparedSpells} min="0" onChange={e => setSpellcasting({...spellcasting, preparedSpells: parseInt(e.target.value)})} className="input-field-small"/></div>
                            <div><label htmlFor="spellSlotsL1" className="block text-xs">Espacios Nivel 1</label><input type="number" id="spellSlotsL1" value={spellcasting.spellSlotsLevel1} min="0" onChange={e => setSpellcasting({...spellcasting, spellSlotsLevel1: parseInt(e.target.value)})} className="input-field-small"/></div>
                        </div>
                        {/* Spell list could be a text area or dynamic list later */}
                    </fieldset>
                )}
                

                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Clase
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
                .checkbox-label:hover { background-color: #e5e7eb; }
                .dark .checkbox-label:hover { background-color: #374151; }
                .checkbox-label-small { display: flex; align-items: center; padding: 0.25rem; background-color: #f3f4f6; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; color: #374151;}
                .dark .checkbox-label-small { background-color: #4b5563; color: #d1d5db; }

                .checkbox-input { height: 1rem; width: 1rem; margin-right: 0.5rem; color: #4f46e5; border-color: #6b7280; border-radius: 0.25rem; }
                .dark .checkbox-input { color: #818cf8; border-color: #4b5563; background-color: #374151; }
                .checkbox-input:checked { background-color: #4f46e5; border-color: #4f46e5; }
                .dark .checkbox-input:checked { background-color: #818cf8; border-color: #818cf8; }
                .checkbox-input-small { height: 0.875rem; width: 0.875rem; margin-right: 0.375rem; color: #4f46e5; border-color: #6b7280; border-radius: 0.125rem; }
                
                .list-styled { list-style: none; padding-left: 0; margin-top: 0.25rem; font-size: 0.875rem; }
                .list-styled li { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background-color: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.25rem; color: #1f2937; }
                .dark .list-styled li { background-color: #374151; color: #e5e7eb; }

                .btn-add { padding: 0.5rem; background-color: #4f46e5; color: white; border-radius: 0.375rem; }
                .dark .btn-add { background-color: #818cf8; }
                .btn-add:hover { background-color: #4338ca; }
                .dark .btn-add:hover { background-color: #67e8f9; }
                .btn-add-small { padding: 0.25rem; background-color: #60a5fa; color: white; border-radius: 0.25rem; }
                .dark .btn-add-small { background-color: #3b82f6; }

                .btn-remove { padding: 0.25rem; color: #ef4444; }
                .dark .btn-remove { color: #f87171; }
                .btn-remove:hover { color: #dc2626; }
                .dark .btn-remove:hover { color: #ef4444; }
                .btn-remove-small { padding: 0.125rem; color: #f43f5e; }
                .dark .btn-remove-small { color: #fb7185; }

                .form-section { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-top: 1rem; background-color: #f9fafb; }
                .dark .form-section { border-color: #374151; background-color: #1f2937; }
                .legend-title { font-size: 1.125rem; font-weight: 600; color: #4f46e5; margin-bottom: 0.5rem; }
                .dark .legend-title { color: #818cf8; }
                .legend-title-small { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
                .form-subsection { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; margin-top: 0.5rem; background-color: #ffffff; }
                .dark .form-subsection { border-color: #4b5563; background-color: #374151; }
                .form-subsection.border-dashed { border-style: dashed; }
                
                .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border: 1px solid transparent; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: white; background-color: #16a34a; }
                .btn-primary:hover { background-color: #15803d; }
                .btn-primary-small { display: inline-flex; align-items: center; justify-content: center; padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 500; border-radius: 0.25rem; color: white; background-color: #16a34a; }
                .btn-primary-small:hover { background-color: #15803d; }
                .btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #2563eb; }
                .btn-secondary:hover { background-color: #1d4ed8; }
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

export default CreateCustomClassForm;
