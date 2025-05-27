
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { 
  ItemCategory, ITEM_CATEGORIES, Item,
  WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType
} from '../../types';
import { WEAPON_PROPERTIES_LIST, DAMAGE_TYPES_LIST, ARMOR_TYPES_LIST } from '../../constants/items';
import { ArrowUturnLeftIcon, PlusCircleIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// Fix: Import GoogleGenAI and GenerateContentResponse correctly
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface AiGeneratedItemData {
  name?: string;
  category?: ItemCategory;
  description?: string;
  costString?: string;
  weightString?: string;
  weaponDetails?: Partial<WeaponDetails>;
  armorDetails?: Partial<ArmorDetails>;
}

// Mappings for UI display
const ITEM_CATEGORY_ES: Record<ItemCategory, string> = {
  Weapon: 'Arma',
  Armor: 'Armadura',
  Miscellaneous: 'Misceláneo'
};
const DAMAGE_TYPE_ES: Record<DamageType, string> = {
  Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente',
  Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno',
  Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo',
  Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'
};
const WEAPON_PROPERTY_ES: Record<WeaponProperty, string> = {
  Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera',
  Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial',
  Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil'
};
const ARMOR_TYPE_ES: Record<ArmorType, string> = {
  Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada'
};


const CreateCustomItemForm: React.FC = () => {
  const { dispatch } = useHeroForge();
  // Fix: Initialize GoogleGenAI with apiKey from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>(ITEM_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [costString, setCostString] = useState('');
  const [weightString, setWeightString] = useState('');

  const [damageDice, setDamageDice] = useState('');
  const [damageType, setDamageType] = useState<DamageType>(DAMAGE_TYPES_LIST[0]);
  const [selectedWeaponProperties, setSelectedWeaponProperties] = useState<WeaponProperty[]>([]);
  const [rangeNormal, setRangeNormal] = useState<number | undefined>(undefined);
  const [rangeLong, setRangeLong] = useState<number | undefined>(undefined);
  const [versatileDamage, setVersatileDamage] = useState('');

  const [baseAC, setBaseAC] = useState<number | undefined>(undefined);
  const [addDexModifier, setAddDexModifier] = useState(false);
  const [maxDexBonus, setMaxDexBonus] = useState<number | undefined>(undefined);
  const [armorType, setArmorType] = useState<ArmorType | undefined>(ARMOR_TYPES_LIST[0]);
  const [strengthRequirement, setStrengthRequirement] = useState<number | undefined>(undefined);
  const [stealthDisadvantage, setStealthDisadvantage] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);


  const handleWeaponPropertyToggle = (property: WeaponProperty) => {
    setSelectedWeaponProperties(prev =>
      prev.includes(property) ? prev.filter(p => p !== property) : [...prev, property]
    );
  };

  const resetFormFields = (includeAiPrompt = true) => {
    setName('');
    setCategory(ITEM_CATEGORIES[0]);
    setDescription('');
    setCostString('');
    setWeightString('');
    setDamageDice('');
    setDamageType(DAMAGE_TYPES_LIST[0]);
    setSelectedWeaponProperties([]);
    setRangeNormal(undefined);
    setRangeLong(undefined);
    setVersatileDamage('');
    setBaseAC(undefined);
    setAddDexModifier(false);
    setMaxDexBonus(undefined);
    setArmorType(ARMOR_TYPES_LIST[0]);
    setStrengthRequirement(undefined);
    setStealthDisadvantage(false);
    if (includeAiPrompt) {
      setAiPrompt('');
    }
    setAiError(null);
  };

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Por favor, introduce una descripción para el objeto que quieres crear.");
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    resetFormFields(false);

    const systemPrompt = `
      Eres un experto creador de objetos de D&D 5e. Basándote en la idea del objeto del usuario, genera un objeto JSON que lo describa.
      El objeto JSON debe seguir la siguiente estructura:
      {
        "name": "Nombre del Objeto Sugerido (string, conciso)",
        "category": "Weapon | Armor | Miscellaneous", // Elige uno de: ${ITEM_CATEGORIES.join(' | ')}
        "description": "Descripción generada del objeto (string, detallada pero con estilo, máx 200 caracteres)",
        "costString": "Costo sugerido como string, ej., '150 gp', '25 sp', '5 cp', o 'Varía' o null si no aplica",
        "weightString": "Peso sugerido como string, ej., '3 lb', '0.5 lb', o null si no aplica",
        "weaponDetails": { // Rellenar solo si la categoría es 'Weapon', sino null u omitir
          "damageDice": "ej., '1d8', '2d6' (string)",
          "damageType": "Elige de: ${DAMAGE_TYPES_LIST.join(' | ')} (string)",
          "properties": ["Un array de strings, elige de: ${WEAPON_PROPERTIES_LIST.join(' | ')}. Puede ser un array vacío."],
          "rangeNormal": "number o null (ej., 30 para 30ft)",
          "rangeLong": "number o null (ej., 120 para 120ft)",
          "versatileDamage": "ej., '1d10' (string o null)"
        },
        "armorDetails": { // Rellenar solo si la categoría es 'Armor', sino null u omitir
          "baseAC": "number (ej., 14)",
          "armorType": "Elige de: ${ARMOR_TYPES_LIST.join(' | ')} o null (string)",
          "addDexModifier": "boolean (true o false)",
          "maxDexBonus": "number o null (si addDexModifier es true, ej., 2, o null si no hay límite)",
          "strengthRequirement": "number o null (ej., 13)",
          "stealthDisadvantage": "boolean (true o false)"
        }
      }

      Idea del objeto del usuario: "${aiPrompt}"

      Asegúrate de que la categoría sea una de las opciones proporcionadas.
      Si los detalles de arma o armadura no están claramente implícitos, puedes omitirlos o establecer su clave padre (weaponDetails/armorDetails) en null.
      Sé creativo pero apégate a las convenciones de D&D 5e.
      Si una propiedad como costo o peso no es aplicable o no está clara, sugiérela como null o un string apropiado como 'Varía'.
      Mantén las descripciones concisas.
      Responde ÚNICAMENTE con el objeto JSON.
    `;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      const aiData: AiGeneratedItemData = JSON.parse(jsonStr);

      setName(aiData.name || '');
      
      if (aiData.category && ITEM_CATEGORIES.includes(aiData.category)) {
        setCategory(aiData.category);
      } else {
        setCategory(ITEM_CATEGORIES[2]); 
        if(aiData.category) setAiError(prev => (prev ? prev + "\n" : "") + `La IA sugirió una categoría inválida ('${aiData.category}'). Se usó Misceláneo por defecto.`);
      }

      setDescription(aiData.description || '');
      setCostString(aiData.costString || '');
      setWeightString(aiData.weightString || '');

      if (aiData.category === 'Weapon' && aiData.weaponDetails) {
        setDamageDice(aiData.weaponDetails.damageDice || '');
        if (aiData.weaponDetails.damageType && DAMAGE_TYPES_LIST.includes(aiData.weaponDetails.damageType as DamageType)) {
          setDamageType(aiData.weaponDetails.damageType as DamageType);
        } else if (aiData.weaponDetails.damageType) {
            setAiError(prev => (prev ? prev + "\n" : "") + `La IA sugirió un tipo de daño inválido ('${aiData.weaponDetails?.damageType}'). Se usó el valor por defecto.`);
        }
        const validProperties = (aiData.weaponDetails.properties || []).filter(p => WEAPON_PROPERTIES_LIST.includes(p as WeaponProperty));
        setSelectedWeaponProperties(validProperties as WeaponProperty[]);

        setRangeNormal(typeof aiData.weaponDetails.rangeNormal === 'number' ? aiData.weaponDetails.rangeNormal : undefined);
        setRangeLong(typeof aiData.weaponDetails.rangeLong === 'number' ? aiData.weaponDetails.rangeLong : undefined);
        setVersatileDamage(aiData.weaponDetails.versatileDamage || '');
      }

      if (aiData.category === 'Armor' && aiData.armorDetails) {
        setBaseAC(typeof aiData.armorDetails.baseAC === 'number' ? aiData.armorDetails.baseAC : undefined);
        if (aiData.armorDetails.armorType && ARMOR_TYPES_LIST.includes(aiData.armorDetails.armorType as ArmorType)) {
          setArmorType(aiData.armorDetails.armorType as ArmorType);
        } else if (aiData.armorDetails.armorType){
            setArmorType(undefined); 
            setAiError(prev => (prev ? prev + "\n" : "") + `La IA sugirió un tipo de armadura inválido ('${aiData.armorDetails?.armorType}'). Se usó Armadura Genérica por defecto.`);
        } else {
            setArmorType(undefined); 
        }
        setAddDexModifier(aiData.armorDetails.addDexModifier === true);
        setMaxDexBonus(typeof aiData.armorDetails.maxDexBonus === 'number' ? aiData.armorDetails.maxDexBonus : undefined);
        setStrengthRequirement(typeof aiData.armorDetails.strengthRequirement === 'number' ? aiData.armorDetails.strengthRequirement : undefined);
        setStealthDisadvantage(aiData.armorDetails.stealthDisadvantage === true);
      }

    } catch (e) {
      console.error("Error al generar objeto con IA:", e);
      setAiError(`Falló la generación de detalles del objeto con IA. Error: ${(e as Error).message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('El nombre del objeto es obligatorio.');
      return;
    }

    let weaponDetails: WeaponDetails | undefined = undefined;
    let armorDetails: ArmorDetails | undefined = undefined;

    if (category === 'Weapon') {
      if (!damageDice.trim() || !damageType) {
        alert('Para armas, se requieren dados de daño y tipo de daño.');
        return;
      }
      weaponDetails = {
        damageDice: damageDice.trim(),
        damageType,
        properties: selectedWeaponProperties,
        rangeNormal: rangeNormal || undefined,
        rangeLong: rangeLong || undefined,
        versatileDamage: versatileDamage.trim() || undefined,
      };
    } else if (category === 'Armor') {
      if (baseAC === undefined || baseAC < 0) {
        alert('Para armaduras, se requiere CA Base y debe ser no negativa.');
        return;
      }
      armorDetails = {
        baseAC,
        addDexModifier,
        maxDexBonus: addDexModifier ? (maxDexBonus === undefined || maxDexBonus < 0 ? undefined : maxDexBonus) : undefined,
        armorType: armorType || undefined,
        strengthRequirement: strengthRequirement === undefined || strengthRequirement < 0 ? undefined : strengthRequirement,
        stealthDisadvantage,
      };
    }
    
    let parsedCost: Item['cost'] = costString.trim() || undefined;
    if (costString.match(/^\d+\s*(gp|sp|cp)$/i)) {
        const [qty, unit] = costString.split(/\s+/);
        parsedCost = { quantity: parseInt(qty), unit: unit.toLowerCase() as 'gp'|'sp'|'cp' };
    }

    let parsedWeight: Item['weight'] = weightString.trim() || undefined;
    if (weightString.match(/^\d+(\.\d+)?\s*lb$/i)) {
        const [val] = weightString.split(/\s+/);
        parsedWeight = { value: parseFloat(val), unit: 'lb' };
    }

    const itemData: Omit<Item, 'id' | 'isCustom' | 'quantity'> = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      cost: parsedCost, 
      weight: parsedWeight,
      weaponDetails,
      armorDetails,
    };

    dispatch({ type: 'ADD_CUSTOM_ITEM', payload: itemData });
    
    alert(`¡Definición de objeto personalizado "${name.trim()}" creada con éxito!`);
    resetFormFields(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Definición de Objeto Personalizado</h1>
        <Link
          to="/content-creator"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
          Volver al Menú
        </Link>
      </div>

      <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
          <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" />
          Asistente de Ideas de Objetos con IA
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Describe el objeto que quieres crear y la IA intentará rellenar los detalles a continuación.
        </p>
        <textarea
          id="aiPrompt"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Ej: Una brillante espada larga azul que inflige daño de frío y brilla levemente en la oscuridad."
          rows={3}
          className="w-full p-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400"
          disabled={isAiLoading}
        />
        <button
          onClick={handleGenerateWithAi}
          disabled={isAiLoading || !aiPrompt.trim()}
          className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-slate-800 dark:text-white bg-yellow-400 dark:bg-yellow-500 hover:bg-yellow-500 dark:hover:bg-yellow-600 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed"
        >
          {isAiLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando...
            </>
          ) : (
            <> <SparklesIcon className="h-5 w-5 mr-2" /> Generar con IA </>
          )}
        </button>
        {aiError && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-800/70 text-red-700 dark:text-red-200 text-sm rounded-md border border-red-300 dark:border-red-700 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-red-500 dark:text-red-300" />
            <pre className="whitespace-pre-wrap font-sans">{aiError}</pre>
          </div>
        )}
      </div>


      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Objeto*</label>
          <input type="text" id="itemName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label htmlFor="itemCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Categoría*</label>
          <select 
            id="itemCategory" 
            value={category} 
            onChange={(e) => { 
              const newCategory = e.target.value as ItemCategory;
              setCategory(newCategory); 
            }} 
            className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100"
          >
            {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{ITEM_CATEGORY_ES[cat]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="itemDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción (Opcional - para notas, efectos, etc.)</label>
          <textarea id="itemDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemCost" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Costo (ej: "10 po" o "100 pc")</label>
              <input type="text" id="itemCost" value={costString} onChange={(e) => setCostString(e.target.value)} placeholder="ej: 100 po" className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100"/>
            </div>
            <div>
              <label htmlFor="itemWeight" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Peso (ej: "5 lb")</label>
              <input type="text" id="itemWeight" value={weightString} onChange={(e) => setWeightString(e.target.value)} placeholder="ej: 5 lb" className="mt-1 block w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100"/>
            </div>
        </div>

        {category === 'Weapon' && (
          <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-700/30">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Detalles de Arma</h3>
            <div>
              <label htmlFor="damageDice" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dados de Daño* (ej: 1d8, 2d6)</label>
              <input type="text" id="damageDice" value={damageDice} onChange={(e) => setDamageDice(e.target.value)} required className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="damageType" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Daño*</label>
              <select id="damageType" value={damageType} onChange={(e) => setDamageType(e.target.value as DamageType)} required className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100">
                {DAMAGE_TYPES_LIST.map(dt => <option key={dt} value={dt}>{DAMAGE_TYPE_ES[dt]}</option>)}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Propiedades de Arma</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WEAPON_PROPERTIES_LIST.map(prop => (
                        <label key={prop} className="flex items-center space-x-2 p-1.5 bg-slate-100 dark:bg-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={selectedWeaponProperties.includes(prop)}
                                onChange={() => handleWeaponPropertyToggle(prop)}
                                className="form-checkbox h-4 w-4 text-purple-600 dark:text-purple-500 bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 rounded focus:ring-purple-500 dark:focus:ring-purple-400"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-200">{WEAPON_PROPERTY_ES[prop]}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="rangeNormal" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alcance Normal (pies)</label>
                    <input type="number" id="rangeNormal" value={rangeNormal === undefined ? '' : rangeNormal} min="0" onChange={(e) => setRangeNormal(e.target.value === '' ? undefined : parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                    <label htmlFor="rangeLong" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alcance Largo (pies)</label>
                    <input type="number" id="rangeLong" value={rangeLong === undefined ? '' : rangeLong} min="0" onChange={(e) => setRangeLong(e.target.value === '' ? undefined : parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
                </div>
            </div>
            <div>
                <label htmlFor="versatileDamage" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Daño Versátil (ej: 1d10)</label>
                <input type="text" id="versatileDamage" value={versatileDamage} onChange={(e) => setVersatileDamage(e.target.value)} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
            </div>
          </div>
        )}

        {category === 'Armor' && (
          <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-700/30">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Detalles de Armadura</h3>
            <div>
              <label htmlFor="baseAC" className="block text-sm font-medium text-slate-700 dark:text-slate-300">CA Base*</label>
              <input type="number" id="baseAC" value={baseAC === undefined ? '' : baseAC} min="0" onChange={(e) => setBaseAC(e.target.value === '' ? undefined : parseInt(e.target.value))} required className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="armorType" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Armadura</label>
              <select id="armorType" value={armorType || ''} onChange={(e) => setArmorType(e.target.value as ArmorType || undefined)} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100">
                <option value="">Armadura Genérica</option>
                {ARMOR_TYPES_LIST.map(at => <option key={at} value={at}>{ARMOR_TYPE_ES[at]}</option>)}
              </select>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer p-2 bg-slate-100 dark:bg-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500">
                <input type="checkbox" checked={addDexModifier} onChange={(e) => setAddDexModifier(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 dark:text-purple-500 bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 rounded focus:ring-purple-500 dark:focus:ring-purple-400"/>
                <span className="text-sm text-slate-700 dark:text-slate-200">¿Añadir Modificador de Destreza a la CA?</span>
            </label>
            {addDexModifier && (
              <div>
                <label htmlFor="maxDexBonus" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bonificador Máx. de Destreza (vacío si no hay límite)</label>
                <input type="number" id="maxDexBonus" min="0" value={maxDexBonus === undefined ? '' : maxDexBonus} onChange={(e) => setMaxDexBonus(e.target.value === '' ? undefined : parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
              </div>
            )}
            <div>
              <label htmlFor="strengthRequirement" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Requisito de Fuerza</label>
              <input type="number" id="strengthRequirement" min="0" value={strengthRequirement === undefined ? '' : strengthRequirement} onChange={(e) => setStrengthRequirement(e.target.value === '' ? undefined : parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100" />
            </div>
             <label className="flex items-center space-x-2 cursor-pointer p-2 bg-slate-100 dark:bg-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500">
                <input type="checkbox" checked={stealthDisadvantage} onChange={(e) => setStealthDisadvantage(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 dark:text-purple-500 bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 rounded focus:ring-purple-500 dark:focus:ring-purple-400"/>
                <span className="text-sm text-slate-700 dark:text-slate-200">¿Desventaja en Sigilo?</span>
            </label>
          </div>
        )}
        
        {category === 'Miscellaneous' && (
             <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700/20">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    Para objetos "Misceláneos", usa los campos comunes de arriba (Nombre, Descripción, Costo, Peso).
                    El campo Descripción se puede usar para detallar propiedades especiales, efectos o notas sobre el objeto.
                </p>
            </div>
        )}

        <div className="pt-4">
          <button type="submit" className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-green-500">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Crear Definición de Objeto
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomItemForm;
