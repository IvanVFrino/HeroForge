
import React, { useState, useMemo } from 'react';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { DndSpecies, DndClass, DndBackground, Item, ItemCategory } from '../types';
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, ShieldCheckIcon, UserGroupIcon, BookOpenIcon, CubeIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

type ContentCategory = 'species' | 'classes' | 'backgrounds' | 'items';

const ITEM_CATEGORY_ES_SIMPLE: Record<ItemCategory, string> = {
  Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo'
};

const CustomContentManager: React.FC = () => {
  const { data, dispatch } = useHeroForge();
  const [expandedCategories, setExpandedCategories] = useState<Record<ContentCategory, boolean>>({
    species: true,
    classes: true,
    backgrounds: true,
    items: true,
  });

  const [markedSpeciesIds, setMarkedSpeciesIds] = useState<string[]>([]);
  const [markedClassIds, setMarkedClassIds] = useState<string[]>([]);
  const [markedBackgroundIds, setMarkedBackgroundIds] = useState<string[]>([]);
  const [markedItemIds, setMarkedItemIds] = useState<string[]>([]);

  const isDirty = useMemo(() => 
    markedSpeciesIds.length > 0 || 
    markedClassIds.length > 0 || 
    markedBackgroundIds.length > 0 || 
    markedItemIds.length > 0,
  [markedSpeciesIds, markedClassIds, markedBackgroundIds, markedItemIds]);

  const toggleCategory = (category: ContentCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleMarkForDeletion = (type: ContentCategory, id: string) => {
    switch (type) {
      case 'species':
        setMarkedSpeciesIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        break;
      case 'classes':
        setMarkedClassIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        break;
      case 'backgrounds':
        setMarkedBackgroundIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        break;
      case 'items':
        setMarkedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        break;
    }
  };

  const handleSaveChanges = () => {
    // Removed window.confirm for sandboxed environment compatibility
    // if (!window.confirm("¿Estás seguro de que quieres guardar todos los cambios y eliminar los elementos marcados permanentemente?")) {
    //     return;
    // }

    markedSpeciesIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_SPECIES', payload: id }));
    markedClassIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_CLASS', payload: id }));
    markedBackgroundIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_BACKGROUND', payload: id }));
    markedItemIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_ITEM', payload: id }));

    setMarkedSpeciesIds([]);
    setMarkedClassIds([]);
    setMarkedBackgroundIds([]);
    setMarkedItemIds([]);
  };

  const handleCancelChanges = () => {
    // Removed window.confirm for sandboxed environment compatibility
    // if (!window.confirm("¿Estás seguro de que quieres descartar los cambios? Se desmarcarán todos los elementos pendientes de eliminación.")) {
    //     return;
    // }
    setMarkedSpeciesIds([]);
    setMarkedClassIds([]);
    setMarkedBackgroundIds([]);
    setMarkedItemIds([]);
  };
  
  const isMarked = (type: ContentCategory, id: string): boolean => {
    switch (type) {
        case 'species': return markedSpeciesIds.includes(id);
        case 'classes': return markedClassIds.includes(id);
        case 'backgrounds': return markedBackgroundIds.includes(id);
        case 'items': return markedItemIds.includes(id);
        default: return false;
    }
  };

  const renderCategorySection = (
    title: string,
    categoryKey: ContentCategory,
    items: Array<DndSpecies | DndClass | DndBackground | Omit<Item, 'quantity'>>,
    icon: React.ElementType
  ) => {
    const IconComponent = icon;
    const isExpanded = expandedCategories[categoryKey];

    return (
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg overflow-hidden transition-all duration-300 ease-in-out">
        <button
          onClick={() => toggleCategory(categoryKey)}
          className="w-full flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`content-${categoryKey}`}
        >
          <div className="flex items-center">
            <IconComponent className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{title} ({items.length})</h2>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-6 w-6 text-slate-600 dark:text-slate-400 transform transition-transform duration-300" />
          ) : (
            <ChevronRightIcon className="h-6 w-6 text-slate-600 dark:text-slate-400 transform transition-transform duration-300" />
          )}
        </button>
        <div
          id={`content-${categoryKey}`}
          className={`transition-max-height duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-screen' : 'max-h-0'}`}
        >
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic">No hay contenido personalizado en esta categoría.</p>
            ) : (
              items.map(item => {
                const marked = isMarked(categoryKey, item.id);
                return (
                    <div 
                        key={item.id} 
                        className={`flex justify-between items-center p-3 rounded-md shadow-sm hover:shadow-md transition-all duration-150
                                    ${marked 
                                        ? 'bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700' 
                                        : 'bg-slate-50 dark:bg-slate-700/50'}`
                                  }
                    >
                    <div className={`${marked ? 'line-through text-red-700 dark:text-red-300 opacity-70' : 'text-slate-700 dark:text-slate-100'}`}>
                        <p className={`font-medium ${marked ? '' : 'text-slate-700 dark:text-slate-100'}`}>{item.name}</p>
                        {categoryKey === 'items' && 'category' in item && (
                            <p className={`text-xs ${marked ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'} capitalize`}>{ITEM_CATEGORY_ES_SIMPLE[item.category as ItemCategory] || item.category}</p>
                        )}
                        {categoryKey === 'classes' && 'hitDie' in item && (
                            <p className={`text-xs ${marked ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>d{item.hitDie}</p>
                        )}
                    </div>
                    <button
                        onClick={() => toggleMarkForDeletion(categoryKey, item.id)}
                        title={marked ? `Deshacer eliminación de ${item.name}` : `Marcar ${item.name} para eliminar`}
                        className={`p-2 transition-colors rounded-full 
                                    ${marked 
                                        ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                                        : 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'}`
                                    }
                    >
                        {marked ? <ArrowUturnLeftIcon className="h-5 w-5" /> : <TrashIcon className="h-5 w-5" />}
                    </button>
                    </div>
                );
            })
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const totalCustomContent = data.customSpecies.length + data.customClasses.length + data.customBackgrounds.length + data.customItems.length;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-10">
        <header className="text-center sm:text-left mb-4 sm:mb-0">
          <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400">
            Gestor de Contenido Personalizado
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Visualiza y administra todas tus creaciones de HeroForge.
          </p>
        </header>
        {isDirty && (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                 <button
                    onClick={handleSaveChanges}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-green-500"
                >
                    <CheckCircleIcon className="h-5 w-5 mr-2" /> Guardar Cambios
                </button>
                <button
                    onClick={handleCancelChanges}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
                >
                    <XCircleIcon className="h-5 w-5 mr-2" /> Cancelar Cambios
                </button>
            </div>
        )}
      </div>


      {totalCustomContent === 0 && !isDirty ? (
        <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-3">Aún no has creado contenido personalizado.</p>
            <p className="text-slate-500 dark:text-slate-400">
                Dirígete al <Link to="/content-creator" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">Creador de Contenido</Link> para empezar a diseñar.
            </p>
        </div>
      ) : (
        <div className="space-y-6">
            {renderCategorySection("Especies Personalizadas", 'species', data.customSpecies, UserGroupIcon)}
            {renderCategorySection("Clases Personalizadas", 'classes', data.customClasses, ShieldCheckIcon)}
            {renderCategorySection("Trasfondos Personalizados", 'backgrounds', data.customBackgrounds, BookOpenIcon)}
            {renderCategorySection("Objetos Personalizados", 'items', data.customItems, CubeIcon)}
        </div>
      )}
       <style>{`
        .transition-max-height {
          transition-property: max-height;
        }
        .max-h-screen {
          max-height: 1000px; /* Adjust if content can be taller */
        }
      `}</style>
    </div>
  );
};

export default CustomContentManager;
