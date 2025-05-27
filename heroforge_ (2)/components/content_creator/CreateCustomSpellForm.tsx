
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { SpellDefinition, SpellSchoolName, AbilityScoreName, DamageType, SpellComponentDetails } from '../../types';
import { SPELL_SCHOOLS_DATA } from '../../constants/spells';
import { ABILITY_SCORE_NAMES_ORDERED, DAMAGE_TYPES_CONST } from '../../types'; // Using from types for consistency
import { ArrowUturnLeftIcon, PlusCircleIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = { Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución", Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma" };
const DAMAGE_TYPE_ES_MAP: Record<DamageType, string> = { Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico' };
const SPELL_LEVEL_DISPLAY: Record<number, string> = { 0: "Truco", 1: "Nivel 1", 2: "Nivel 2", 3: "Nivel 3", 4: "Nivel 4", 5: "Nivel 5", 6: "Nivel 6", 7: "Nivel 7", 8: "Nivel 8", 9: "Nivel 9" };

interface AiGeneratedSpellData extends Omit<SpellDefinition, 'id' | 'isCustom' | 'school'> {
    school?: string; // AI might return string name
}

const CreateCustomSpellForm: React.FC = () => {
    const { dispatch } = useHeroForge();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const [name, setName] = useState('');
    const [level, setLevel] = useState<number>(0); // 0 for cantrip
    const [school, setSchool] = useState<SpellSchoolName>(SPELL_SCHOOLS_DATA[0].name);
    const [castingTime, setCastingTime] = useState('');
    const [range, setRange] = useState('');
    const [components, setComponents] = useState<SpellComponentDetails>({ verbal: false, somatic: false, material: false, materialDescription: '' });
    const [duration, setDuration] = useState('');
    const [description, setDescription] = useState('');
    const [higherLevelDescription, setHigherLevelDescription] = useState('');
    const [requiresAttackRoll, setRequiresAttackRoll] = useState(false);
    const [requiresSavingThrow, setRequiresSavingThrow] = useState(false);
    const [savingThrowAbility, setSavingThrowAbility] = useState<AbilityScoreName | undefined>(undefined);
    const [damageType, setDamageType] = useState<DamageType | undefined>(undefined);

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setLevel(0); setSchool(SPELL_SCHOOLS_DATA[0].name);
        setCastingTime(''); setRange('');
        setComponents({ verbal: false, somatic: false, material: false, materialDescription: '' });
        setDuration(''); setDescription(''); setHigherLevelDescription('');
        setRequiresAttackRoll(false); setRequiresSavingThrow(false);
        setSavingThrowAbility(undefined); setDamageType(undefined);
        if (includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Por favor, introduce una descripción para el conjuro que quieres crear.");
            return;
        }
        setIsAiLoading(true); setAiError(null); resetFormFields(false);

        const systemPrompt = `
          Eres un experto diseñador de conjuros de D&D 5e. Basándote en la idea del conjuro del usuario, genera un objeto JSON que lo describa.
          El objeto JSON debe seguir la siguiente estructura (omite claves opcionales si no aplican o no hay información):
          {
            "name": "Nombre del Conjuro Sugerido (string)",
            "level": "Nivel del conjuro (number, 0 para Truco, 1-9 para hechizos)",
            "school": "Escuela de Magia (string, una de: ${SPELL_SCHOOLS_DATA.map(s => s.name).join(' | ')})",
            "castingTime": "Tiempo de Lanzamiento (string, ej: '1 acción', '1 minuto')",
            "range": "Alcance (string, ej: 'Personal', 'Toque', '60 pies')",
            "components": { "verbal": boolean, "somatic": boolean, "material": boolean, "materialDescription": "string si material es true, sino omitir o null" },
            "duration": "Duración (string, ej: 'Instantáneo', 'Concentración, hasta 1 minuto')",
            "description": "Descripción completa del conjuro (string)",
            "higherLevelDescription": "A Niveles Superiores... (string, opcional)",
            "requiresAttackRoll": "boolean (opcional)",
            "requiresSavingThrow": "boolean (opcional)",
            "savingThrowAbility": "Si requiresSavingThrow es true, una de: ${ABILITY_SCORE_NAMES_ORDERED.join(' | ')} (string, opcional)",
            "damageType": "Si el conjuro inflige daño, uno de: ${DAMAGE_TYPES_CONST.join(' | ')} (string, opcional)"
          }
          Idea del conjuro del usuario: "${aiPrompt}"
          Responde ÚNICAMENTE con el objeto JSON.
        `;
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17", contents: systemPrompt, config: { responseMimeType: "application/json" }
            });
            let jsonStr = response.text.trim();
            const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
            if (match && match[2]) jsonStr = match[2].trim();
            
            const aiData: AiGeneratedSpellData = JSON.parse(jsonStr);

            setName(aiData.name || '');
            setLevel(typeof aiData.level === 'number' && aiData.level >= 0 && aiData.level <= 9 ? aiData.level : 0);
            setSchool(aiData.school && SPELL_SCHOOLS_DATA.some(s => s.name === aiData.school) ? aiData.school as SpellSchoolName : SPELL_SCHOOLS_DATA[0].name);
            setCastingTime(aiData.castingTime || '');
            setRange(aiData.range || '');
            setComponents(aiData.components || { verbal: false, somatic: false, material: false });
            setDuration(aiData.duration || '');
            setDescription(aiData.description || '');
            setHigherLevelDescription(aiData.higherLevelDescription || '');
            setRequiresAttackRoll(aiData.requiresAttackRoll || false);
            setRequiresSavingThrow(aiData.requiresSavingThrow || false);
            setSavingThrowAbility(aiData.savingThrowAbility && ABILITY_SCORE_NAMES_ORDERED.includes(aiData.savingThrowAbility) ? aiData.savingThrowAbility : undefined);
            setDamageType(aiData.damageType && DAMAGE_TYPES_CONST.includes(aiData.damageType) ? aiData.damageType : undefined);

        } catch (e) {
            console.error("Error al generar conjuro con IA:", e);
            setAiError(`Falló la generación de detalles del conjuro. Error: ${(e as Error).message}`);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !description.trim()) {
            alert('Nombre y Descripción son obligatorios.');
            return;
        }
        const spellData: Omit<SpellDefinition, 'id' | 'isCustom'> = {
            name: name.trim(), level, school,
            castingTime: castingTime.trim() || undefined,
            range: range.trim() || undefined,
            components: (components.verbal || components.somatic || components.material) ? { ...components, materialDescription: components.material ? components.materialDescription?.trim() : undefined } : undefined,
            duration: duration.trim() || undefined,
            description: description.trim(),
            higherLevelDescription: higherLevelDescription.trim() || undefined,
            requiresAttackRoll: requiresAttackRoll || undefined,
            requiresSavingThrow: requiresSavingThrow || undefined,
            savingThrowAbility: requiresSavingThrow ? savingThrowAbility : undefined,
            damageType: damageType || undefined,
        };
        dispatch({ type: 'ADD_CUSTOM_SPELL', payload: spellData });
        alert(`¡Definición de conjuro "${name.trim()}" creada con éxito!`);
        resetFormFields(true);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Definición de Conjuro Personalizado</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 btn-secondary-link">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de Conjuros con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Un truco que crea una pequeña chispa para encender fogatas o un hechizo de nivel 3 que invoca una lluvia de meteoritos helados." rows={3} className="w-full p-2 input-field" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                <div><label htmlFor="spellName" className="block text-sm font-medium">Nombre del Conjuro*</label><input type="text" id="spellName" value={name} onChange={e=>setName(e.target.value)} required className="mt-1 input-field"/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="spellLevel" className="block text-sm font-medium">Nivel*</label><select id="spellLevel" value={level} onChange={e=>setLevel(parseInt(e.target.value))} className="mt-1 input-field">{Object.entries(SPELL_LEVEL_DISPLAY).map(([lvl, display]) => <option key={lvl} value={lvl}>{display}</option>)}</select></div>
                    <div><label htmlFor="spellSchool" className="block text-sm font-medium">Escuela de Magia*</label><select id="spellSchool" value={school} onChange={e=>setSchool(e.target.value as SpellSchoolName)} className="mt-1 input-field">{SPELL_SCHOOLS_DATA.map(s=><option key={s.name} value={s.name}>{s.nombre}</option>)}</select></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="castingTime" className="block text-sm font-medium">Tiempo de Lanzamiento</label><input type="text" id="castingTime" value={castingTime} onChange={e=>setCastingTime(e.target.value)} placeholder="Ej: 1 acción" className="mt-1 input-field"/></div>
                    <div><label htmlFor="spellRange" className="block text-sm font-medium">Alcance</label><input type="text" id="spellRange" value={range} onChange={e=>setRange(e.target.value)} placeholder="Ej: Toque, 60 pies" className="mt-1 input-field"/></div>
                </div>

                <fieldset className="form-section">
                    <legend className="legend-title">Componentes</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className="checkbox-label"><input type="checkbox" checked={components.verbal} onChange={e=>setComponents({...components, verbal: e.target.checked})} className="checkbox-input"/>Verbal (V)</label>
                        <label className="checkbox-label"><input type="checkbox" checked={components.somatic} onChange={e=>setComponents({...components, somatic: e.target.checked})} className="checkbox-input"/>Somático (S)</label>
                        <label className="checkbox-label"><input type="checkbox" checked={components.material} onChange={e=>setComponents({...components, material: e.target.checked})} className="checkbox-input"/>Material (M)</label>
                    </div>
                    {components.material && <div><label htmlFor="materialDesc" className="block text-sm font-medium mt-2">Descripción Material</label><input type="text" id="materialDesc" value={components.materialDescription} onChange={e=>setComponents({...components, materialDescription: e.target.value})} placeholder="Ej: un poco de pelaje de murciélago" className="mt-1 input-field"/></div>}
                </fieldset>
                
                <div><label htmlFor="spellDuration" className="block text-sm font-medium">Duración</label><input type="text" id="spellDuration" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Ej: Instantáneo, Concentración hasta 1 min." className="mt-1 input-field"/></div>
                <div><label htmlFor="spellDescription" className="block text-sm font-medium">Descripción del Conjuro*</label><textarea id="spellDescription" value={description} onChange={e=>setDescription(e.target.value)} required rows={5} className="mt-1 input-field"/></div>
                <div><label htmlFor="higherLevel" className="block text-sm font-medium">A Niveles Superiores (Opcional)</label><textarea id="higherLevel" value={higherLevelDescription} onChange={e=>setHigherLevelDescription(e.target.value)} rows={2} className="mt-1 input-field"/></div>
                
                <fieldset className="form-section">
                    <legend className="legend-title">Mecánicas Adicionales</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="checkbox-label"><input type="checkbox" checked={requiresAttackRoll} onChange={e=>setRequiresAttackRoll(e.target.checked)} className="checkbox-input"/>¿Requiere Tirada de Ataque?</label>
                        <label className="checkbox-label"><input type="checkbox" checked={requiresSavingThrow} onChange={e=>setRequiresSavingThrow(e.target.checked)} className="checkbox-input"/>¿Requiere Tirada de Salvación?</label>
                    </div>
                    {requiresSavingThrow && <div><label htmlFor="savingThrowAbility" className="block text-sm font-medium mt-2">Característica de Salvación</label><select id="savingThrowAbility" value={savingThrowAbility || ''} onChange={e=>setSavingThrowAbility(e.target.value as AbilityScoreName || undefined)} className="mt-1 input-field"><option value="">-- Seleccionar --</option>{ABILITY_SCORE_NAMES_ORDERED.map(ab=><option key={ab} value={ab}>{ABILITY_SCORE_ES_MAP[ab]}</option>)}</select></div>}
                    <div><label htmlFor="damageType" className="block text-sm font-medium mt-2">Tipo de Daño Principal (si aplica)</label><select id="damageType" value={damageType || ''} onChange={e=>setDamageType(e.target.value as DamageType || undefined)} className="mt-1 input-field"><option value="">-- Ninguno --</option>{DAMAGE_TYPES_CONST.map(dt=><option key={dt} value={dt}>{DAMAGE_TYPE_ES_MAP[dt]}</option>)}</select></div>
                </fieldset>

                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Conjuro
                    </button>
                </div>
            </form>
             <style>{`
                .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
                .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .checkbox-label { display: flex; align-items: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; color: #374151;}
                .dark .checkbox-label { background-color: #4b5563; color: #d1d5db; }
                .checkbox-input { height: 1rem; width: 1rem; margin-right: 0.5rem; color: #4f46e5; border-color: #6b7280; border-radius: 0.25rem; }
                .dark .checkbox-input { color: #818cf8; border-color: #4b5563; background-color: #374151; }
                .form-section { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-top: 1rem; background-color: #f9fafb; }
                .dark .form-section { border-color: #374151; background-color: #1f2937; }
                .legend-title { font-size: 1.125rem; font-weight: 600; color: #4f46e5; margin-bottom: 0.5rem; }
                .dark .legend-title { color: #818cf8; }
                .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border: 1px solid transparent; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: white; background-color: #16a34a; }
                .btn-primary:hover { background-color: #15803d; }
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
            `}</style>
        </div>
    );
};

export default CreateCustomSpellForm;
