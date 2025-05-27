
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacter, getFinalCoreData } from '../../context/CharacterContext';
import { useHeroForge } from '../../context/HeroForgeDataContext';
import CharacterSummary from '../CharacterSummary'; 
import { CheckCircleIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { ItemCategory, EquippedItem, DndClass, StartingEquipmentItem, EquipmentBundle } from '../../types';

interface ChoiceGroup {
    id: string; // Unique ID for the choice group, e.g., "choicegroup_barb_A"
    prompt: string; 
    options: EquipmentBundle[]; // The actual options the user can pick from
}

const FinalDetails: React.FC = () => {
  const { character, dispatch: characterDispatch } = useCharacter();
  const { dispatch: heroForgeDispatch } = useHeroForge();
  const navigate = useNavigate();

  const [selectedEquipmentOptions, setSelectedEquipmentOptions] = useState<Record<string, string>>(
    character._savedCoreDataHelper?.chosenClassEquipmentSelections || {}
  );
  
  useEffect(() => {
    // This effect ensures that derived stats are recalculated whenever equipment or gold changes.
    // It's kept separate from the equipment application logic to avoid unintended complexities.
    characterDispatch({ type: 'RECALCULATE_DERIVED_STATS' });
  }, [characterDispatch, character.equipment, character.gold]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    characterDispatch({ type: 'SET_NAME', payload: e.target.value });
  };

  const isInstructionalBundle = (bundle: EquipmentBundle): boolean => {
    if (bundle.isInstructional === true) return true;
    // Robust check for description type
    const desc = (typeof bundle.description === 'string') ? bundle.description.toLowerCase() : "";
    return (
        (desc.startsWith("choose one") || desc.startsWith("select one") || desc.startsWith("elige uno") || desc.startsWith("elige una") || desc.startsWith("elije uno") || desc.startsWith("elije una") || desc.startsWith("choose any") || desc.includes("o (b)") || desc.includes("or (b)")) &&
        (!bundle.items || bundle.items.length === 0) &&
        (bundle.gold === undefined || bundle.gold === 0)
    );
  };
  
  const isOptionBundle = (bundle: EquipmentBundle): boolean => {
    if (isInstructionalBundle(bundle)) return false;
    return (bundle.items && bundle.items.length > 0) || (bundle.gold !== undefined && bundle.gold > 0);
  };

  const { actualChoiceGroups, fixedGrantBundles } = useMemo(() => {
    if (!character.class?.startingEquipmentBundles) {
        return { actualChoiceGroups: [], fixedGrantBundles: [] };
    }

    const choiceGroupsOutput: ChoiceGroup[] = [];
    const fixedBundlesOutput: EquipmentBundle[] = [];
    
    let currentChoiceGroupOptions: EquipmentBundle[] = [];
    let currentChoiceGroupPrompt: string | undefined = undefined;
    let currentChoiceGroupIdBase: string | undefined = undefined;

    character.class.startingEquipmentBundles.forEach((bundle, index) => {
        const bundleKey = bundle.key || `bundle_auto_${index}_${Date.now().toString(36).substring(2, 7)}`;

        if (isInstructionalBundle(bundle)) {
            if (currentChoiceGroupOptions.length > 0 && currentChoiceGroupPrompt && currentChoiceGroupIdBase) {
                choiceGroupsOutput.push({ id: currentChoiceGroupIdBase, prompt: currentChoiceGroupPrompt, options: currentChoiceGroupOptions });
            }
            currentChoiceGroupOptions = [];
            currentChoiceGroupPrompt = bundle.description;
            currentChoiceGroupIdBase = `choicegroup_${bundleKey}`;
        } else if (isOptionBundle(bundle)) {
            if (currentChoiceGroupPrompt && currentChoiceGroupIdBase) { 
                currentChoiceGroupOptions.push({ ...bundle, key: bundleKey });
            } else { 
                fixedBundlesOutput.push({ ...bundle, key: bundleKey });
            }
        }
    });

    if (currentChoiceGroupOptions.length > 0 && currentChoiceGroupPrompt && currentChoiceGroupIdBase) {
        choiceGroupsOutput.push({ id: currentChoiceGroupIdBase, prompt: currentChoiceGroupPrompt, options: currentChoiceGroupOptions });
    }
    
    return { actualChoiceGroups: choiceGroupsOutput, fixedGrantBundles: fixedBundlesOutput };
  }, [character.class?.startingEquipmentBundles]);


  useEffect(() => {
    if (!character.class || !character.class.startingEquipmentBundles) {
      if (Object.keys(selectedEquipmentOptions).length > 0) {
        setSelectedEquipmentOptions({});
      }
      return;
    }
  
    const newSelectionsFromCore = character._savedCoreDataHelper?.chosenClassEquipmentSelections || {};
    const newSelectionsWorkingCopy: Record<string, string> = { ...newSelectionsFromCore };
    let selectionsChangedInThisEffect = false;
  
    actualChoiceGroups.forEach(group => {
      const currentSelectionForGroup = newSelectionsWorkingCopy[group.id];
      
      if (group.options.length === 1) {
        if (currentSelectionForGroup !== group.options[0].key) {
          newSelectionsWorkingCopy[group.id] = group.options[0].key;
          selectionsChangedInThisEffect = true;
        }
      } else if (currentSelectionForGroup && !group.options.some(opt => opt.key === currentSelectionForGroup)) {
        delete newSelectionsWorkingCopy[group.id];
        selectionsChangedInThisEffect = true;
      }
      // If no selection and multiple options, user must choose. No auto-selection here.
    });
  
    const validGroupIds = new Set(actualChoiceGroups.map(g => g.id));
    Object.keys(newSelectionsWorkingCopy).forEach(key => {
      if (!validGroupIds.has(key)) {
        delete newSelectionsWorkingCopy[key];
        selectionsChangedInThisEffect = true;
      }
    });
  
    // Only update state if the derived selections are different from current local state
    // OR if selectionsChangedInThisEffect is true (meaning we made automatic adjustments).
    if (selectionsChangedInThisEffect || JSON.stringify(newSelectionsWorkingCopy) !== JSON.stringify(selectedEquipmentOptions)) {
      setSelectedEquipmentOptions(newSelectionsWorkingCopy);
    }
  }, [
    character.class, 
    actualChoiceGroups, 
    character._savedCoreDataHelper?.chosenClassEquipmentSelections
    // selectedEquipmentOptions IS INTENTIONALLY EXCLUDED to prevent re-running when it's set by this effect.
  ]);


  useEffect(() => {
    if (!character.class) {
        if (character.equipment.some(eq => eq.source === 'ClassEquipment') || (character._savedCoreDataHelper?.chosenClassEquipmentSelections && Object.keys(character._savedCoreDataHelper.chosenClassEquipmentSelections).length > 0)) {
            characterDispatch({
                type: 'APPLY_CLASS_EQUIPMENT_CHOICES',
                payload: { chosenItems: [], totalGold: 0, selections: {} }
            });
        }
        return;
    }

    if (actualChoiceGroups.length === 0 && fixedGrantBundles.length === 0) {
        const prevCoreSelections = character._savedCoreDataHelper?.chosenClassEquipmentSelections || {};
        if (Object.keys(prevCoreSelections).length === 0 && character.equipment.some(eq => eq.source === 'ClassEquipment')) {
             characterDispatch({
                type: 'APPLY_CLASS_EQUIPMENT_CHOICES',
                payload: { chosenItems: [], totalGold: 0, selections: {} }
            });
        }
        return;
    }

    const allChosenItems: StartingEquipmentItem[] = [];
    let totalGoldFromClassChoices = 0;

    actualChoiceGroups.forEach(group => {
        const selectedKey = selectedEquipmentOptions[group.id];
        if (selectedKey) {
            const selectedBundle = group.options.find(opt => opt.key === selectedKey);
            if (selectedBundle) {
                allChosenItems.push(...selectedBundle.items);
                totalGoldFromClassChoices += selectedBundle.gold || 0;
            }
        }
    });

    fixedGrantBundles.forEach(bundle => {
        allChosenItems.push(...bundle.items);
        totalGoldFromClassChoices += bundle.gold || 0;
    });
    
    const prevCoreSelections = character._savedCoreDataHelper?.chosenClassEquipmentSelections || {};
    const selectionsAreDifferentFromCore = JSON.stringify(selectedEquipmentOptions) !== JSON.stringify(prevCoreSelections);

    const currentClassEquipmentItems = character.equipment
        .filter(e => e.source === 'ClassEquipment')
        .map(e => ({ name: e.name, quantity: e.quantity }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    const derivedClassEquipmentItems = allChosenItems
        .map(e => ({ name: e.name, quantity: e.quantity }))
        .sort((a, b) => a.name.localeCompare(b.name));
        
    const goldFromBackground = character.background?.startingEquipment.gold || 0;
    const expectedTotalGoldOnSheet = goldFromBackground + totalGoldFromClassChoices;
  
    const equipmentIsDifferent = JSON.stringify(currentClassEquipmentItems) !== JSON.stringify(derivedClassEquipmentItems);
    const goldIsDifferentOnSheet = character.gold !== expectedTotalGoldOnSheet;

    if (selectionsAreDifferentFromCore || equipmentIsDifferent || goldIsDifferentOnSheet) {
         characterDispatch({
            type: 'APPLY_CLASS_EQUIPMENT_CHOICES',
            payload: { chosenItems: allChosenItems, totalGold: totalGoldFromClassChoices, selections: selectedEquipmentOptions }
        });
    }

  }, [
      character.class, 
      actualChoiceGroups, 
      fixedGrantBundles,
      selectedEquipmentOptions, 
      characterDispatch, 
      character._savedCoreDataHelper?.chosenClassEquipmentSelections,
      character.equipment,
      character.gold,
      character.background?.startingEquipment.gold
  ]);


  const handleEquipmentOptionSelect = (groupId: string, optionKey: string) => {
    setSelectedEquipmentOptions(prev => ({ ...prev, [groupId]: optionKey }));
  };

  const handleSaveCharacter = () => {
    const coreData = getFinalCoreData(character);
    if (!coreData.characterName || coreData.characterName.trim() === "") {
        alert("Por favor, introduce un nombre para el personaje antes de guardarlo.");
        return;
    }
    if (!coreData.classId) { alert("Por favor, selecciona una clase antes de guardarlo."); return; }
    if (!coreData.backgroundId) { alert("Por favor, selecciona un trasfondo antes de guardarlo."); return; }
    if (!coreData.speciesId) { alert("Por favor, selecciona una especie antes de guardarlo."); return; }
    
    // Ensure the latest selections are part of the core data being saved.
    coreData.chosenClassEquipmentSelections = { ...selectedEquipmentOptions };
    coreData.chosenClassEquipmentBundleKey = undefined; // Obsolete this key
    
    heroForgeDispatch({ type: 'ADD_CHARACTER', payload: coreData });
    alert(`¡${coreData.characterName} guardado en HeroForge! Volviendo al Menú Principal.`);
    characterDispatch({ type: 'RESET_CHARACTER_SHEET' }); 
    navigate('/main-menu', { replace: true }); 
  };
  
  const handleResetCreator = () => {
    if (window.confirm("¿Estás seguro de que quieres reiniciar el creador de personajes? Cualquier progreso no guardado se perderá.")) {
        characterDispatch({ type: 'RESET_CHARACTER_SHEET' });
        setSelectedEquipmentOptions({}); // Also reset local selections state
        navigate('/character-creator/new/class', { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-purple-600 dark:text-purple-400">Finaliza tu Personaje</h2>
        <button
            onClick={handleResetCreator}
            title="Reiniciar Creador"
            className="p-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
        >
            <ArrowPathIcon className="h-5 w-5 mr-1" /> Reiniciar Creador
        </button>
      </div>
      
      <div className="mb-6">
        <label htmlFor="characterName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Nombre del Personaje
        </label>
        <input
          type="text"
          id="characterName"
          value={character.name}
          onChange={handleNameChange}
          placeholder="Ej: Elara Luzdelprado"
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400"
        />
      </div>

      {character.class && (actualChoiceGroups.length > 0 || fixedGrantBundles.length > 0) && (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">Equipo Inicial de Clase ({character.class.name})</h3>
          
          {actualChoiceGroups.length > 0 && actualChoiceGroups.map((group) => (
              <div 
                key={group.id} 
                className="mb-4 p-3 border rounded-md border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{group.prompt}</p>
                <div className="space-y-1.5">
                    {group.options.map(optionBundle => (
                      <label
                        key={optionBundle.key}
                        className={`flex items-start p-2.5 rounded-lg shadow-sm border-2 transition-all cursor-pointer
                          ${selectedEquipmentOptions[group.id] === optionBundle.key
                            ? 'bg-purple-100 dark:bg-purple-900/60 border-purple-500 dark:border-purple-400 ring-2 ring-purple-500 dark:ring-purple-400'
                            : 'bg-white dark:bg-slate-600/50 border-slate-300 dark:border-slate-500 hover:border-purple-400 dark:hover:border-purple-500'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`equipmentGroup_${group.id}`} // Unique name per group for radio button behavior
                          value={optionBundle.key}
                          checked={selectedEquipmentOptions[group.id] === optionBundle.key}
                          onChange={() => handleEquipmentOptionSelect(group.id, optionBundle.key)}
                          className="form-radio h-4 w-4 text-purple-600 dark:text-purple-400 border-slate-400 dark:border-slate-500 focus:ring-purple-500 dark:focus:ring-purple-400 mr-3 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                            {optionBundle.description}
                            {optionBundle.gold ? <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Oro: {optionBundle.gold} po)</span> : null}
                            {optionBundle.items.length > 0 && (
                                <ul className="text-2xs text-slate-500 dark:text-slate-400 list-disc list-inside pl-4 mt-0.5">
                                    {optionBundle.items.map(item => <li key={item.name}>{item.name} (x{item.quantity})</li>)}
                                </ul>
                            )}
                        </span>
                      </label>
                    ))}
                  </div>
              </div>
            ))
          }
          
          {fixedGrantBundles.length > 0 && (
            <div className="mt-4 p-3 border rounded-md border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/40">
                <h4 className="text-md font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
                    <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                    También recibes automáticamente:
                </h4>
                {fixedGrantBundles.map(bundle => (
                    <div key={bundle.key} className="mb-1 text-sm">
                        <p className="text-slate-800 dark:text-slate-100">{bundle.description}:</p>
                        {bundle.items.length > 0 && (
                            <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside pl-5">
                                {bundle.items.map(item => <li key={item.name}>{item.name} (x{item.quantity})</li>)}
                            </ul>
                        )}
                         {bundle.gold ? <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">Oro adicional: {bundle.gold} po</p> : null}
                    </div>
                ))}
            </div>
          )}

          {actualChoiceGroups.length === 0 && fixedGrantBundles.length === 0 && character.class?.startingEquipmentBundles && character.class.startingEquipmentBundles.length > 0 && (
             <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                <InformationCircleIcon className="h-5 w-5 inline mr-1 align-text-bottom text-sky-500 dark:text-sky-400" />
                Esta clase parece tener lotes de equipo definidos, pero no se pudieron procesar como opciones de elección o concesiones fijas. Revisa la estructura de los datos de la clase.
            </p>
          )}
           {character.class && (!character.class.startingEquipmentBundles || character.class.startingEquipmentBundles.length === 0) && (
             <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                 <InformationCircleIcon className="h-5 w-5 inline mr-1 align-text-bottom text-sky-500 dark:text-sky-400" />
                Esta clase no tiene equipo inicial específico definido.
            </p>
           )}
        </div>
      )}
      
      <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg shadow-inner">
        <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Resumen del Personaje</h3>
        <CharacterSummary />
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleSaveCharacter}
          className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-green-500 transition-transform hover:scale-105"
        >
          <CheckCircleIcon className="h-6 w-6 mr-2" />
          Guardar Personaje en HeroForge
        </button>
        <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">
          Revisa los detalles de tu personaje arriba. Una vez guardado, podrás gestionarlos en el "Gestor de Personajes".
        </p>
      </div>
    </div>
  );
};

export default FinalDetails;
