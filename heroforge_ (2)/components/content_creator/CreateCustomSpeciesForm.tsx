
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { DndSpecies, Size, Trait } from '../../types';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// Fix: Import GoogleGenAI and GenerateContentResponse correctly
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SIZES_LIST: Size[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const SIZE_ES_MAP: Record<Size, string> = {
    Tiny: "Diminuta", Small: "Pequeña", Medium: "Mediana", Large: "Grande", Huge: "Enorme", Gargantuan: "Gargantuesca"
};

interface AiGeneratedSpeciesData {
    name?: string;
    size?: Size;
    speed?: number;
    languages?: string[];
    traits?: Array<Partial<Trait>>;
}


const CreateCustomSpeciesForm: React.FC = () => {
    const { dispatch } = useHeroForge();
    // Fix: Initialize GoogleGenAI with apiKey from process.env
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const [name, setName] = useState('');
    const [size, setSize] = useState<Size>('Medium');
    const [speed, setSpeed] = useState<number>(30);
    const [languages, setLanguages] = useState<string[]>(['Común']);
    const [currentLanguage, setCurrentLanguage] = useState('');
    const [traits, setTraits] = useState<Trait[]>([]);
    const [currentTraitName, setCurrentTraitName] = useState('');
    const [currentTraitDescription, setCurrentTraitDescription] = useState('');

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleAddLanguage = () => {
        if (currentLanguage.trim() && !languages.includes(currentLanguage.trim())) {
            setLanguages([...languages, currentLanguage.trim()]);
            setCurrentLanguage('');
        }
    };
    const handleRemoveLanguage = (langToRemove: string) => {
        setLanguages(languages.filter(lang => lang !== langToRemove));
    };

    const handleAddTrait = () => {
        if (currentTraitName.trim() && currentTraitDescription.trim()) {
            setTraits([...traits, { name: currentTraitName.trim(), description: currentTraitDescription.trim() }]);
            setCurrentTraitName('');
            setCurrentTraitDescription('');
        }
    };
    const handleRemoveTrait = (traitNameToRemove: string) => {
        setTraits(traits.filter(trait => trait.name !== traitNameToRemove));
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName('');
        setSize('Medium');
        setSpeed(30);
        setLanguages(['Común']);
        setCurrentLanguage('');
        setTraits([]);
        setCurrentTraitName('');
        setCurrentTraitDescription('');
        if (includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
          setAiError("Por favor, introduce una descripción para la especie que quieres crear.");
          return;
        }
        setIsAiLoading(true);
        setAiError(null);
        resetFormFields(false); // Reset form but keep AI prompt

        const systemPrompt = `
          Eres un experto creador de especies de D&D 5e. Basándote en la idea del usuario, genera un objeto JSON que describa la especie.
          El objeto JSON debe seguir la siguiente estructura:
          {
            "name": "Nombre de la Especie Sugerido (string, conciso)",
            "size": "Elige uno de: ${SIZES_LIST.join(' | ')}",
            "speed": "Velocidad base en pies (number, ej. 30)",
            "languages": ["Un array de strings con los idiomas que habla la especie, ej. ['Común', 'Silvano']"],
            "traits": [ // Un array de objetos de rasgos, cada uno con:
              { "name": "Nombre del Rasgo (string)", "description": "Descripción del Rasgo (string)" }
              // Intenta generar 2-4 rasgos relevantes.
            ]
          }

          Idea de la especie del usuario: "${aiPrompt}"

          Asegúrate de que el tamaño sea una de las opciones proporcionadas.
          Si algún campo no está claro, puedes omitirlo o proporcionar un valor razonable por defecto.
          Responde ÚNICAMENTE con el objeto JSON.
        `;

        try {
          const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: systemPrompt,
            config: { responseMimeType: "application/json" }
          });

          let jsonStr = response.text.trim();
          const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
          const match = jsonStr.match(fenceRegex);
          if (match && match[2]) jsonStr = match[2].trim();

          const aiData: AiGeneratedSpeciesData = JSON.parse(jsonStr);

          setName(aiData.name || '');
          if (aiData.size && SIZES_LIST.includes(aiData.size)) {
            setSize(aiData.size);
          } else if(aiData.size) {
            setAiError(prev => (prev ? prev + "\n" : "") + `La IA sugirió un tamaño inválido ('${aiData.size}'). Se usó Mediano por defecto.`);
          }
          setSpeed(typeof aiData.speed === 'number' ? aiData.speed : 30);
          setLanguages(Array.isArray(aiData.languages) ? aiData.languages.filter(l => typeof l === 'string') : ['Común']);
          setTraits(
            Array.isArray(aiData.traits)
            ? aiData.traits.filter(t => t && typeof t.name === 'string' && typeof t.description === 'string').map(t => ({name: t.name!, description: t.description!}))
            : []
          );

        } catch (e) {
          console.error("Error al generar especie con IA:", e);
          setAiError(`Falló la generación de detalles de la especie con IA. Error: ${(e as Error).message}`);
        } finally {
          setIsAiLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('El nombre de la especie es obligatorio.');
            return;
        }
        if (speed <= 0) {
            alert('La velocidad debe ser un número positivo.');
            return;
        }
        if (languages.length === 0) {
            alert('La especie debe tener al menos un idioma.');
            return;
        }
        if (traits.length === 0) {
            alert('La especie debe tener al menos un rasgo.');
            return;
        }

        const speciesData: Omit<DndSpecies, 'id' | 'isCustom'> = {
            name: name.trim(),
            size,
            speed,
            languages,
            traits,
        };
        dispatch({ type: 'ADD_CUSTOM_SPECIES', payload: speciesData });
        alert(`¡Especie personalizada "${name.trim()}" creada con éxito!`);
        resetFormFields(true);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Especie Personalizada</h1>
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
                Asistente de Ideas de Especies con IA
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Describe la especie que quieres crear y la IA intentará rellenar los detalles.
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ej: Una raza de humanoides cristalinos que viven en cuevas profundas y se comunican con vibraciones."
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
                    <label htmlFor="speciesName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Especie*</label>
                    <input type="text" id="speciesName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 input-field"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="speciesSize" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tamaño*</label>
                        <select id="speciesSize" value={size} onChange={(e) => setSize(e.target.value as Size)} className="mt-1 input-field">
                            {SIZES_LIST.map(s => <option key={s} value={s}>{SIZE_ES_MAP[s]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="speciesSpeed" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Velocidad (pies)*</label>
                        <input type="number" id="speciesSpeed" value={speed} min="0" onChange={(e) => setSpeed(parseInt(e.target.value) || 0)} required className="mt-1 input-field"/>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Idiomas</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="text" value={currentLanguage} onChange={e => setCurrentLanguage(e.target.value)} placeholder="Ej: Élfico" className="input-field flex-grow"/>
                        <button type="button" onClick={handleAddLanguage} className="btn-add"><PlusCircleIcon className="h-5 w-5"/></button>
                    </div>
                    <ul className="list-styled">{languages.map(lang => <li key={lang}>{lang} <button type="button" onClick={() => handleRemoveLanguage(lang)} className="btn-remove-small"><TrashIcon className="h-4 w-4"/></button></li>)}</ul>
                </div>
                
                <fieldset className="form-section">
                    <legend className="legend-title">Rasgos Raciales</legend>
                    {traits.map(trait => (
                        <div key={trait.name} className="form-subsection">
                            <div className="flex justify-between items-center"><h4 className="font-medium">{trait.name}</h4><button type="button" onClick={() => handleRemoveTrait(trait.name)} className="btn-remove"><TrashIcon className="h-4 w-4"/></button></div>
                            <p className="text-xs whitespace-pre-line">{trait.description}</p>
                        </div>
                    ))}
                    <div className="form-subsection border-dashed">
                        <input type="text" value={currentTraitName} onChange={e => setCurrentTraitName(e.target.value)} placeholder="Nombre del Nuevo Rasgo" className="input-field mb-1"/>
                        <textarea value={currentTraitDescription} onChange={e => setCurrentTraitDescription(e.target.value)} placeholder="Descripción del Nuevo Rasgo" rows={2} className="input-field mb-1"/>
                        <button type="button" onClick={handleAddTrait} className="btn-secondary w-full">Añadir Rasgo Racial</button>
                    </div>
                </fieldset>
                
                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Especie
                    </button>
                </div>
            </form>
            <style>{`
                .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
                .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .list-styled { list-style: none; padding-left: 0; margin-top: 0.25rem; font-size: 0.875rem; }
                .list-styled li { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; background-color: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.25rem; color: #1f2937; }
                .dark .list-styled li { background-color: #374151; color: #e5e7eb; }
                .btn-add { padding: 0.5rem; background-color: #4f46e5; color: white; border-radius: 0.375rem; }
                .dark .btn-add { background-color: #818cf8; }
                .btn-add:hover { background-color: #4338ca; }
                .dark .btn-add:hover { background-color: #67e8f9; }
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
                .form-subsection { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; margin-top: 0.5rem; background-color: #ffffff; }
                .dark .form-subsection { border-color: #4b5563; background-color: #374151; }
                .form-subsection.border-dashed { border-style: dashed; }
                .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border: 1px solid transparent; font-size: 1rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); color: white; background-color: #16a34a; }
                .btn-primary:hover { background-color: #15803d; }
                .btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #2563eb; }
                .btn-secondary:hover { background-color: #1d4ed8; }
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

export default CreateCustomSpeciesForm;
