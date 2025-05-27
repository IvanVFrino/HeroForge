
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { DndClass, AbilityScoreName, SkillName, Trait, StartingEquipmentItem, ClassSpellcasting, ItemCategory, ITEM_CATEGORIES, WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType, SubclassDefinition, ClassSpellcastingProgressionEntry } from '../../types';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { WEAPON_PROPERTIES_LIST, DAMAGE_TYPES_LIST, ARMOR_TYPES_LIST } from '../../constants/items';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CLASS_CREATION_AI_PROMPT } from '../../prompts/classCreationAiPrompt';
import BundleItemCreator from './form_parts/BundleItemCreator';


const ABILITY_SCORE_NAMES_ORDERED: AbilityScoreName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = { Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución", Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma" };
const ITEM_CATEGORY_ES: Record<ItemCategory, string> = { Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo' };

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
    startingEquipmentBundles?: Array<{ key?: string; description?: string; items?: Array<Partial<StartingEquipmentItem>>; gold?: number; }>;
    classFeaturesByLevel?: Record<number, Array<Partial<Trait>>>;
    subclassChoiceLevel?: number;
    availableSubclassIds?: string[];
    weaponMasteriesKnown?: number;
    spellcasting?: { 
        ability?: AbilityScoreName; 
        knownCantrips?: number;
        preparedSpells?: number;
        spellSlotsLevel1?: number;
        spellList?: string[];
        preparationType?: 'known' | 'prepared';
        progression?: Record<number, ClassSpellcastingProgressionEntry>;
    };
}

const CreateCustomClassForm: React.FC = () => {
    const { data: heroForgeData, dispatch } = useHeroForge();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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
    const [currentBundleGold, setCurrentBundleGold] = useState<number | undefined>(undefined);
    
    const [showBundleItemCreator, setShowBundleItemCreator] = useState(false);
    const [editingBundleItem, setEditingBundleItem] = useState<{item: StartingEquipmentItem, index: number} | null>(null);

    const [classFeaturesByLevel, setClassFeaturesByLevel] = useState<Record<number, Trait[]>>({});
    const [currentFeatureLevel, setCurrentFeatureLevel] = useState<number>(1);
    const [currentFeatureName, setCurrentFeatureName] = useState('');
    const [currentFeatureDesc, setCurrentFeatureDesc] = useState('');

    const [subclassChoiceLevel, setSubclassChoiceLevel] = useState<number>(3);
    const [availableSubclassIds, setAvailableSubclassIds] = useState<string[]>([]);
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

    const openBundleItemModalForNew = () => {
        setEditingBundleItem(null);
        setShowBundleItemCreator(true);
    };

    const openBundleItemModalForEdit = (item: StartingEquipmentItem, index: number) => {
        setEditingBundleItem({ item, index });
        setShowBundleItemCreator(true);
    };
    
    const handleSaveBundleItem = (item: StartingEquipmentItem) => {
        if (editingBundleItem !== null) {
            const updatedItems = [...currentBundleItems];
            updatedItems[editingBundleItem.index] = item;
            setCurrentBundleItems(updatedItems);
        } else {
            setCurrentBundleItems([...currentBundleItems, item]);
        }
        setShowBundleItemCreator(false);
        setEditingBundleItem(null);
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
      if(currentFeatureName.trim() && currentFeatureDesc.trim() && currentFeatureLevel > 0){
        setClassFeaturesByLevel(prev => {
            const updatedLevelFeatures = [...(prev[currentFeatureLevel] || []), { name: currentFeatureName.trim(), description: currentFeatureDesc.trim() }];
            return { ...prev, [currentFeatureLevel]: updatedLevelFeatures };
        });
        setCurrentFeatureName(''); setCurrentFeatureDesc('');
      }
    };
    const handleRemoveFeature = (level: number, featureName: string) => {
      setClassFeaturesByLevel(prev => {
        const levelFeatures = (prev[level] || []).filter(f => f.name !== featureName);
        if (levelFeatures.length === 0) {
            const { [level]: _, ...rest } = prev;
            return rest;
        }
        return { ...prev, [level]: levelFeatures };
      });
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setHitDie(8); setPrimaryAbilities([]); setSavingThrowProficiencies([]);
        setArmorProficiencies([]); setCurrentArmorProf(''); setWeaponProficiencies([]); setCurrentWeaponProf('');
        setToolProfChoices([]); setCurrentToolProfChoice(''); setToolProfCount(0); setFixedToolProfs([]); setCurrentFixedToolProf('');
        setSkillProfChoices([]); setSkillProfCount(2);
        setStartingEquipmentBundles([]); setCurrentBundleKey(''); setCurrentBundleDesc(''); setCurrentBundleItems([]); 
        setCurrentBundleGold(undefined); setEditingBundleItem(null);
        setClassFeaturesByLevel({}); setCurrentFeatureLevel(1); setCurrentFeatureName(''); setCurrentFeatureDesc('');
        setSubclassChoiceLevel(3); setAvailableSubclassIds([]);
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

        const systemPrompt = CLASS_CREATION_AI_PROMPT(aiPrompt);
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
                    let parsedWeaponDetails = undefined; if (cat === 'Weapon' && i.weaponDetails && Object.keys(i.weaponDetails).length > 0) parsedWeaponDetails = i.weaponDetails;
                    let parsedArmorDetails = undefined; if (cat === 'Armor' && i.armorDetails && Object.keys(i.armorDetails).length > 0) parsedArmorDetails = i.armorDetails;
                    return { name:i.name||'Objeto Desconocido', quantity: i.quantity||1, category: cat, description: i.description, cost: i.cost, weight: i.weight, weaponDetails: parsedWeaponDetails, armorDetails: parsedArmorDetails };
                }), 
                gold: b.gold
            })) as DndClass['startingEquipmentBundles']);

            const parsedFeaturesByLevel: Record<number, Trait[]> = {};
            if (aiData.classFeaturesByLevel) {
                for (const [levelStr, featuresArray] of Object.entries(aiData.classFeaturesByLevel)) {
                    const levelNum = parseInt(levelStr);
                    if (!isNaN(levelNum) && Array.isArray(featuresArray)) {
                        parsedFeaturesByLevel[levelNum] = featuresArray.filter(f => f.name && f.description).map(f => ({ name: f.name!, description: f.description! }));
                    }
                }
            }
            setClassFeaturesByLevel(parsedFeaturesByLevel);
            setSubclassChoiceLevel(typeof aiData.subclassChoiceLevel === 'number' ? aiData.subclassChoiceLevel : 3);
            setAvailableSubclassIds(aiData.availableSubclassIds || []);
            setWeaponMasteriesKnown(aiData.weaponMasteriesKnown);
            
            if(aiData.spellcasting && aiData.spellcasting.ability){
                const aiSpellData = aiData.spellcasting;
                let finalProgression: Record<number, ClassSpellcastingProgressionEntry> = {};
                if (aiSpellData.progression) { // AI provided full progression
                    finalProgression = aiSpellData.progression;
                } else { // AI provided flat L1 data
                    finalProgression[1] = {
                        cantripsKnown: aiSpellData.knownCantrips || 0,
                        spellsKnown: aiSpellData.preparedSpells || 0, // Using preparedSpells as spellsKnown for L1
                        spellSlots: aiSpellData.spellSlotsLevel1 !== undefined ? [aiSpellData.spellSlotsLevel1,0,0,0,0,0,0,0,0] : [0,0,0,0,0,0,0,0,0]
                    };
                }
                setSpellcasting({
                    ability: aiSpellData.ability,
                    preparationType: aiSpellData.preparationType || 'known',
                    spellList: aiSpellData.spellList || [],
                    progression: finalProgression
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
        if (Object.keys(classFeaturesByLevel).length === 0 || !classFeaturesByLevel[1] || classFeaturesByLevel[1].length === 0) {
            alert('La clase debe tener al menos una característica definida para el nivel 1.');
            return;
        }

        const classData: Omit<DndClass, 'id' | 'isCustom'> = {
            name: name.trim(), hitDie, primaryAbilities, savingThrowProficiencies, armorProficiencies, weaponProficiencies,
            toolProficiencies: { choices: toolProfChoices, count: toolProfCount, fixed: fixedToolProfs },
            skillProficiencies: { choices: skillProfChoices, count: skillProfCount },
            startingEquipmentBundles, classFeaturesByLevel, subclassChoiceLevel, availableSubclassIds,
            weaponMasteriesKnown, spellcasting,
        };
        dispatch({ type: 'ADD_CUSTOM_CLASS', payload: classData });
        alert(`¡Clase personalizada "${name.trim()}" creada con éxito!`);
        resetFormFields(true);
    };
    
    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Clase Personalizada</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 btn-secondary-link">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de Clases con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Un guerrero que canaliza la energía de las tormentas, usando rayos y truenos en combate." rows={3} className="w-full p-2 input-field" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                {/* General Info, Proficiencies: Armor & Weapon sections unchanged */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="className" className="block text-sm font-medium">Nombre de la Clase*</label><input type="text" id="className" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 input-field"/></div>
                    <div><label htmlFor="hitDie" className="block text-sm font-medium">Dado de Golpe*</label><select id="hitDie" value={hitDie} onChange={(e) => setHitDie(parseInt(e.target.value))} className="mt-1 input-field">{HIT_DICE_OPTIONS.map(hd => <option key={hd} value={hd}>d{hd}</option>)}</select></div>
                </div>
                <div><label className="block text-sm font-medium">Características Primarias*</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">{ABILITY_SCORE_NAMES_ORDERED.map(ab => (<label key={ab} className="checkbox-label"><input type="checkbox" checked={primaryAbilities.includes(ab)} onChange={() => handleMultiSelectToggle(setPrimaryAbilities, primaryAbilities, ab)} className="checkbox-input"/>{ABILITY_SCORE_ES_MAP[ab]}</label>))}</div></div>
                <div><label className="block text-sm font-medium">Competencias en Tiradas de Salvación*</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">{ABILITY_SCORE_NAMES_ORDERED.map(ab => (<label key={ab} className="checkbox-label"><input type="checkbox" checked={savingThrowProficiencies.includes(ab)} onChange={() => handleMultiSelectToggle(setSavingThrowProficiencies, savingThrowProficiencies, ab)} className="checkbox-input"/>{ABILITY_SCORE_ES_MAP[ab]}</label>))}</div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Competencias en Armaduras</label><div className="flex items-center gap-2 mt-1"><input type="text" value={currentArmorProf} onChange={e => setCurrentArmorProf(e.target.value)} placeholder="Ej: Armadura Ligera" className="input-field flex-grow"/><button type="button" onClick={() => addToList(armorProficiencies, setArmorProficiencies, currentArmorProf, setCurrentArmorProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button></div><ul className="list-styled">{armorProficiencies.map(ap => <li key={ap}>{ap} <button type="button" onClick={() => removeFromList(armorProficiencies, setArmorProficiencies, ap)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul></div>
                    <div><label className="block text-sm font-medium">Competencias en Armas</label><div className="flex items-center gap-2 mt-1"><input type="text" value={currentWeaponProf} onChange={e => setCurrentWeaponProf(e.target.value)} placeholder="Ej: Armas Simples" className="input-field flex-grow"/><button type="button" onClick={() => addToList(weaponProficiencies, setWeaponProficiencies, currentWeaponProf, setCurrentWeaponProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button></div><ul className="list-styled">{weaponProficiencies.map(wp => <li key={wp}>{wp} <button type="button" onClick={() => removeFromList(weaponProficiencies, setWeaponProficiencies, wp)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul></div>
                </div>
                <fieldset className="form-section"><legend className="legend-title">Competencias en Herramientas</legend><div><label className="block text-sm font-medium">Opciones de Herramientas (Nombres)</label><div className="flex items-center gap-2 mt-1"><input type="text" value={currentToolProfChoice} onChange={e=>setCurrentToolProfChoice(e.target.value)} placeholder="Ej: Herramientas de Ladrón" className="input-field flex-grow"/><button type="button" onClick={()=>addToList(toolProfChoices, setToolProfChoices, currentToolProfChoice, setCurrentToolProfChoice)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button></div><ul className="list-styled">{toolProfChoices.map(tc=><li key={tc}>{tc}<button type="button" onClick={()=>removeFromList(toolProfChoices, setToolProfChoices, tc)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul></div><div><label htmlFor="toolProfCount" className="block text-sm font-medium">Número de Elecciones de Herramientas</label><input type="number" id="toolProfCount" value={toolProfCount} min="0" onChange={e=>setToolProfCount(parseInt(e.target.value) || 0)} className="input-field"/></div><div><label className="block text-sm font-medium">Competencias Fijas en Herramientas</label><div className="flex items-center gap-2 mt-1"><input type="text" value={currentFixedToolProf} onChange={e=>setCurrentFixedToolProf(e.target.value)} placeholder="Ej: Instrumento Musical" className="input-field flex-grow"/><button type="button" onClick={()=>addToList(fixedToolProfs, setFixedToolProfs, currentFixedToolProf, setCurrentFixedToolProf)} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button></div><ul className="list-styled">{fixedToolProfs.map(ftp=><li key={ftp}>{ftp}<button type="button" onClick={()=>removeFromList(fixedToolProfs, setFixedToolProfs, ftp)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul></div></fieldset>
                <fieldset className="form-section"><legend className="legend-title">Competencias en Habilidades*</legend><div><label className="block text-sm font-medium">Opciones de Habilidades</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">{ALL_SKILL_NAMES_OBJECT.map(skill => (<label key={skill.name} className="checkbox-label"><input type="checkbox" checked={skillProfChoices.includes(skill.name)} onChange={() => handleMultiSelectToggle(setSkillProfChoices, skillProfChoices, skill.name)} className="checkbox-input"/>{skill.nombre}</label>))}</div></div><div><label htmlFor="skillProfCount" className="block text-sm font-medium">Número de Elecciones de Habilidades</label><input type="number" id="skillProfCount" value={skillProfCount} min="0" onChange={e=>setSkillProfCount(parseInt(e.target.value) || 0)} className="input-field"/></div></fieldset>
                <fieldset className="form-section"><legend className="legend-title">Lotes de Equipo Inicial</legend>{startingEquipmentBundles.map(bundle => (<div key={bundle.key} className="form-subsection"><div className="flex justify-between items-center"><h4 className="font-medium">Lote {bundle.key}: {bundle.description}</h4><button type="button" onClick={()=>handleRemoveBundle(bundle.key)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button></div><ul className="text-xs list-disc list-inside pl-2">{bundle.items.map((item, idx) => <li key={idx}>{item.name} (x{item.quantity}) {item.category && `[${ITEM_CATEGORY_ES[item.category] || item.category}]`}</li>)}</ul>{bundle.gold !== undefined && <p className="text-xs">Oro: {bundle.gold} po</p>}</div>))}{<div className="form-subsection border-dashed"><input type="text" value={currentBundleKey} onChange={e=>setCurrentBundleKey(e.target.value)} placeholder="Clave del Lote (ej: A, B)" className="input-field mb-1"/><input type="text" value={currentBundleDesc} onChange={e=>setCurrentBundleDesc(e.target.value)} placeholder="Descripción del Lote" className="input-field mb-1"/>{currentBundleItems.map((item, index) => (<div key={index} className="text-xs p-1 my-1 bg-slate-200 dark:bg-slate-600 rounded flex justify-between items-center"><span>{item.name} (x{item.quantity}) {item.category && `[${ITEM_CATEGORY_ES[item.category] || item.category}]`}</span><div><button type="button" onClick={() => openBundleItemModalForEdit(item, index)} className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 p-0.5 text-2xs"><PencilSquareIcon className="h-4 w-4 inline-block mr-0.5" />Editar</button><button type="button" onClick={() => handleRemoveBundleItem(index)} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 p-0.5 text-2xs ml-1"><TrashIcon className="h-4 w-4 inline-block mr-0.5" />Quitar</button></div></div>))}<button type="button" onClick={openBundleItemModalForNew} className="btn-secondary-small w-full text-xs mb-1"><PlusCircleIcon className="h-4 w-4 mr-1"/> Añadir Objeto al Lote</button><input type="number" value={currentBundleGold===undefined?'':currentBundleGold} min="0" onChange={e=>setCurrentBundleGold(e.target.value===''?undefined:parseInt(e.target.value))} placeholder="Oro (Opcional)" className="input-field mb-1"/><button type="button" onClick={handleAddBundle} className="btn-secondary w-full">Añadir Lote de Equipo</button></div>}</fieldset>
                <BundleItemCreator isOpen={showBundleItemCreator} onClose={() => setShowBundleItemCreator(false)} onSaveItem={handleSaveBundleItem} initialItemData={editingBundleItem ? editingBundleItem.item : null} />
                <fieldset className="form-section"><legend className="legend-title">Rasgos de Clase por Nivel*</legend>{Object.entries(classFeaturesByLevel).sort(([lvlA], [lvlB]) => parseInt(lvlA) - parseInt(lvlB)).map(([level, features]) => (<div key={level} className="form-subsection mb-2"><h4 className="font-semibold text-purple-500 dark:text-purple-400">Nivel {level}</h4>{features.map(feature => (<div key={feature.name} className="ml-2 my-1 p-1 border-l-2 border-slate-300 dark:border-slate-600"><div className="flex justify-between items-center"><span className="font-medium text-sm">{feature.name}</span><button type="button" onClick={()=>handleRemoveFeature(parseInt(level), feature.name)} className="btn-remove-small"><TrashIcon className="h-3 w-3"/></button></div><p className="text-xs whitespace-pre-line">{feature.description}</p></div>))}</div>))}{<div className="form-subsection border-dashed"><h5 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-1">Añadir Nueva Característica</h5><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><div><label htmlFor="featureLevel" className="block text-xs font-medium">Nivel Caract.*</label><input type="number" id="featureLevel" value={currentFeatureLevel} min="1" onChange={e=>setCurrentFeatureLevel(parseInt(e.target.value)||1)} className="mt-1 input-field-small"/></div><div className="sm:col-span-2"><label htmlFor="featureName" className="block text-xs font-medium">Nombre Caract.*</label><input type="text" id="featureName" value={currentFeatureName} onChange={e=>setCurrentFeatureName(e.target.value)} placeholder="Nombre de la Característica" className="mt-1 input-field-small"/></div></div><div><label htmlFor="featureDesc" className="block text-xs font-medium mt-1">Descripción Caract.*</label><textarea id="featureDesc" value={currentFeatureDesc} onChange={e=>setCurrentFeatureDesc(e.target.value)} placeholder="Descripción de la Característica" rows={2} className="mt-1 input-field-small w-full"/></div><button type="button" onClick={handleAddFeature} className="btn-secondary w-full mt-2">Añadir Característica a este Nivel</button></div>}</fieldset>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="subclassChoiceLevel" className="block text-sm font-medium">Nivel de Elección de Subclase</label><input type="number" id="subclassChoiceLevel" value={subclassChoiceLevel} min="1" onChange={e=>setSubclassChoiceLevel(parseInt(e.target.value) || 1)} className="input-field"/></div><div><label htmlFor="weaponMasteriesKnown" className="block text-sm font-medium">Maestrías con Armas Conocidas (Opcional)</label><input type="number" id="weaponMasteriesKnown" value={weaponMasteriesKnown===undefined?'':weaponMasteriesKnown} min="0" onChange={e=>setWeaponMasteriesKnown(e.target.value===''?undefined:parseInt(e.target.value))} className="input-field"/></div></div>
                <div className="pt-4"><button type="submit" className="w-full btn-primary"><PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Clase</button></div>
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
                .btn-remove-small { padding: 0.125rem; color: #f43f5e; }
                .dark .btn-remove-small { color: #fb7185; }
                .btn-remove { padding: 0.25rem; color: #ef4444; }
                .dark .btn-remove { color: #f87171; }
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
                .btn-secondary-link { font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #4f46e5; background-color: #e0e7ff; }
                .dark .btn-secondary-link { color: #a5b4fc; background-color: #3730a3; }
                .btn-ai-generate { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: #1f2937; background-color: #facc15; }
                .dark .btn-ai-generate { color: #111827; background-color: #fde047; }
                .btn-ai-generate:disabled { background-color: #9ca3af; cursor: not-allowed; }
                .dark .btn-ai-generate:disabled { background-color: #4b5563; }
                .error-box { padding: 0.75rem; background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 0.375rem; color: #b91c1c; font-size: 0.875rem; display:flex; align-items: flex-start; }
                .dark .error-box { background-color: #5f2120; border-color: #b91c1c; color: #fca5a5;}
                .error-icon { height: 1.25rem; width: 1.25rem; margin-right: 0.5rem; flex-shrink: 0; color: #dc2626; }
                .dark .error-icon { color: #f87171;}
                .text-2xs { font-size: 0.65rem; line-height: 0.8rem;}
                .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .dark .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #a1a1aa; border-radius: 3px; } /* zinc-400 */
                .dark .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #52525b; } /* zinc-600 */
            `}</style>
        </div>
    );
};

export default CreateCustomClassForm;
