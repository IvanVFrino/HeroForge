
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import { SubclassDefinition, Trait, DndClass } from '../../types';
import { ArrowUturnLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CLASSES_DATA } from '../../constants/dndClasses'; // Base classes for parent class selection

interface AiGeneratedSubclassData {
    name?: string;
    description?: string;
    parentClassId?: string;
    featuresByLevel?: Record<number, Array<Partial<Trait>>>;
}

const CreateCustomSubclassForm: React.FC = () => {
    const { data: heroForgeData, dispatch } = useHeroForge();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentClassId, setParentClassId] = useState<string>('');
    const [featuresByLevel, setFeaturesByLevel] = useState<Record<number, Trait[]>>({});
    
    const [currentFeatureLevel, setCurrentFeatureLevel] = useState<number>(1);
    const [currentFeatureName, setCurrentFeatureName] = useState('');
    const [currentFeatureDescription, setCurrentFeatureDescription] = useState('');

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const allAvailableClasses: DndClass[] = [...CLASSES_DATA, ...heroForgeData.customClasses];

    const handleAddFeature = () => {
        if (!currentFeatureName.trim() || !currentFeatureDescription.trim() || currentFeatureLevel <= 0) {
            alert('Nivel, nombre y descripción de la característica son obligatorios.');
            return;
        }
        setFeaturesByLevel(prev => {
            const updatedLevelFeatures = [...(prev[currentFeatureLevel] || []), { name: currentFeatureName.trim(), description: currentFeatureDescription.trim() }];
            return { ...prev, [currentFeatureLevel]: updatedLevelFeatures };
        });
        setCurrentFeatureName('');
        setCurrentFeatureDescription('');
    };

    const handleRemoveFeature = (level: number, featureName: string) => {
        setFeaturesByLevel(prev => {
            const levelFeatures = (prev[level] || []).filter(f => f.name !== featureName);
            if (levelFeatures.length === 0) {
                const { [level]: _, ...rest } = prev; // Remove level key if no features left
                return rest;
            }
            return { ...prev, [level]: levelFeatures };
        });
    };

    const resetFormFields = (includeAiPrompt = true) => {
        setName(''); setDescription(''); setParentClassId('');
        setFeaturesByLevel({});
        setCurrentFeatureLevel(1); setCurrentFeatureName(''); setCurrentFeatureDescription('');
        if (includeAiPrompt) setAiPrompt('');
        setAiError(null);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
          setAiError("Por favor, introduce una descripción para la subclase que quieres crear.");
          return;
        }
        setIsAiLoading(true); setAiError(null); resetFormFields(false);

        const systemPrompt = `
          Eres un experto diseñador de subclases de D&D 5e. Basándote en la idea de la subclase del usuario, genera un objeto JSON que la describa.
          El objeto JSON debe seguir la siguiente estructura:
          {
            "name": "Nombre de la Subclase Sugerido (string)",
            "description": "Descripción general de la subclase (string)",
            "parentClassId": "ID de la Clase Principal (string, ej: 'base-rogue', 'custom-class-xxxx'). Si el usuario no especifica, intenta inferir o pide aclaración. Para esta prueba, si no se infiere, usa 'base-fighter'.",
            "featuresByLevel": { // Un objeto donde cada clave es un número de nivel (como string o number)
              "3": [ { "name": "Nombre Característica Nivel 3", "description": "Descripción..." } ],
              "7": [ { "name": "Nombre Característica Nivel 7", "description": "Descripción..." } ]
              // Añade más niveles y características según sea apropiado para la subclase.
            }
          }
          Idea de la subclase del usuario: "${aiPrompt}"
          Responde ÚNICAMENTE con el objeto JSON. Asegúrate que 'parentClassId' sea un ID plausible (ej. 'base-fighter', 'custom-class-id').
        `;
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17", contents: systemPrompt, config: { responseMimeType: "application/json" }
            });
            let jsonStr = response.text.trim();
            const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
            if (match && match[2]) jsonStr = match[2].trim();
            
            const aiData: AiGeneratedSubclassData = JSON.parse(jsonStr);

            setName(aiData.name || '');
            setDescription(aiData.description || '');
            setParentClassId(aiData.parentClassId || (allAvailableClasses.length > 0 ? allAvailableClasses[0].id : ''));
            
            const parsedFeatures: Record<number, Trait[]> = {};
            if (aiData.featuresByLevel) {
                for (const [levelStr, featuresArray] of Object.entries(aiData.featuresByLevel)) {
                    const levelNum = parseInt(levelStr);
                    if (!isNaN(levelNum) && Array.isArray(featuresArray)) {
                        parsedFeatures[levelNum] = featuresArray.filter(f => f.name && f.description).map(f => ({ name: f.name!, description: f.description! }));
                    }
                }
            }
            setFeaturesByLevel(parsedFeatures);

        } catch (e) {
            console.error("Error al generar subclase con IA:", e);
            setAiError(`Falló la generación de detalles de la subclase. Error: ${(e as Error).message}`);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !description.trim() || !parentClassId) {
            alert('Nombre, Descripción y Clase Principal son obligatorios.');
            return;
        }
        if (Object.keys(featuresByLevel).length === 0 || Object.values(featuresByLevel).every(arr => arr.length === 0)) {
            alert('La subclase debe tener al menos una característica definida.');
            return;
        }

        const subclassData: Omit<SubclassDefinition, 'id' | 'isCustom'> = {
            name: name.trim(),
            description: description.trim(),
            parentClassId,
            featuresByLevel
        };
        dispatch({ type: 'ADD_CUSTOM_SUBCLASS', payload: subclassData });
        alert(`¡Subclase personalizada "${name.trim()}" creada con éxito!`);
        resetFormFields(true);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400">Crear Subclase Personalizada</h1>
                <Link to="/content-creator" className="inline-flex items-center px-3 py-1 btn-secondary-link">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />Volver al Menú
                </Link>
            </div>

            <div className="mb-8 p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500 dark:text-yellow-400" /> Asistente de Ideas de Subclases con IA
                </h2>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Una subclase de guerrero que usa magia rúnica para potenciar sus ataques y defensas. Características en niveles 3, 7, 10, 15." rows={3} className="w-full p-2 input-field" disabled={isAiLoading}/>
                <button onClick={handleGenerateWithAi} disabled={isAiLoading || !aiPrompt.trim()} className="mt-3 w-full btn-ai-generate">{isAiLoading ? 'Generando...' : 'Generar con IA'}</button>
                {aiError && <div className="mt-3 p-3 error-box"><ExclamationTriangleIcon className="h-5 w-5 mr-2 error-icon"/><pre className="whitespace-pre-wrap font-sans">{aiError}</pre></div>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                <div><label htmlFor="subclassName" className="block text-sm font-medium">Nombre de la Subclase*</label><input type="text" id="subclassName" value={name} onChange={e=>setName(e.target.value)} required className="mt-1 input-field"/></div>
                <div><label htmlFor="subclassDesc" className="block text-sm font-medium">Descripción*</label><textarea id="subclassDesc" value={description} onChange={e=>setDescription(e.target.value)} required rows={3} className="mt-1 input-field"/></div>
                <div>
                    <label htmlFor="parentClass" className="block text-sm font-medium">Clase Principal*</label>
                    <select id="parentClass" value={parentClassId} onChange={e=>setParentClassId(e.target.value)} required className="mt-1 input-field">
                        <option value="">-- Seleccionar Clase Principal --</option>
                        {allAvailableClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.name}{cls.isCustom ? ' (P)' : ''}</option>)}
                    </select>
                </div>
                
                <fieldset className="form-section">
                    <legend className="legend-title">Características por Nivel*</legend>
                    {Object.entries(featuresByLevel).sort(([lvlA], [lvlB]) => parseInt(lvlA) - parseInt(lvlB)).map(([level, features]) => (
                        <div key={level} className="form-subsection mb-2">
                            <h4 className="font-semibold text-purple-500 dark:text-purple-400">Nivel {level}</h4>
                            {features.map(feature => (
                                <div key={feature.name} className="ml-2 my-1 p-1 border-l-2 border-slate-300 dark:border-slate-600">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">{feature.name}</span>
                                        <button type="button" onClick={() => handleRemoveFeature(parseInt(level), feature.name)} className="btn-remove-small"><TrashIcon className="h-3 w-3"/></button>
                                    </div>
                                    <p className="text-xs whitespace-pre-line">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                     <div className="form-subsection border-dashed">
                        <h5 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-1">Añadir Nueva Característica</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div><label htmlFor="featureLevel" className="block text-xs font-medium">Nivel Caract.*</label><input type="number" id="featureLevel" value={currentFeatureLevel} min="1" onChange={e=>setCurrentFeatureLevel(parseInt(e.target.value)||1)} className="mt-1 input-field-small"/></div>
                            <div className="sm:col-span-2"><label htmlFor="featureName" className="block text-xs font-medium">Nombre Caract.*</label><input type="text" id="featureName" value={currentFeatureName} onChange={e=>setCurrentFeatureName(e.target.value)} placeholder="Nombre de la Característica" className="mt-1 input-field-small"/></div>
                        </div>
                        <div><label htmlFor="featureDesc" className="block text-xs font-medium mt-1">Descripción Caract.*</label><textarea id="featureDesc" value={currentFeatureDescription} onChange={e=>setCurrentFeatureDescription(e.target.value)} placeholder="Descripción de la Característica" rows={2} className="mt-1 input-field-small w-full"/></div>
                        <button type="button" onClick={handleAddFeature} className="btn-secondary w-full mt-2">Añadir Característica a este Nivel</button>
                    </div>
                </fieldset>
                
                <div className="pt-4">
                    <button type="submit" className="w-full btn-primary">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />Crear Definición de Subclase
                    </button>
                </div>
            </form>
            <style>{`
                .input-field { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
                .dark .input-field { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                .input-field-small { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; color: #111827; }
                .dark .input-field-small { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
                
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
                .btn-secondary-link { font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #4f46e5; background-color: #e0e7ff; }
                .dark .btn-secondary-link { color: #a5b4fc; background-color: #3730a3; }
                .btn-remove-small { padding: 0.125rem; color: #f43f5e; }
                .dark .btn-remove-small { color: #fb7185; }
                
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

export default CreateCustomSubclassForm;
