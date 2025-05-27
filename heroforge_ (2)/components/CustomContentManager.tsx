
import React, { useState, useMemo } from 'react';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { DndSpecies, DndClass, SubclassDefinition, DndBackground, Item, ItemCategory, SpellDefinition, SpellSchoolName, NPCData } from '../types'; 
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, ShieldCheckIcon, UserGroupIcon, BookOpenIcon, CubeIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon, CheckCircleIcon, XCircleIcon, SparklesIcon as SpellIcon, AcademicCapIcon, UsersIcon as NpcIcon } from '@heroicons/react/24/outline'; 
import { Link } from 'react-router-dom';
import { SPELL_SCHOOLS_DATA } from '../../constants/spells'; 
import CustomContentDetailModal from './modal/CustomContentDetailModal'; 
import { CLASSES_DATA } from '../../constants/dndClasses'; 

export type ContentCategory = 'species' | 'classes' | 'subclasses' | 'backgrounds' | 'items' | 'spells' | 'npcs';

const ITEM_CATEGORY_ES_SIMPLE: Record<ItemCategory, string> = {
  Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo'
};

const getSpellSchoolDisplayName = (schoolName: SpellSchoolName): string => {
    return SPELL_SCHOOLS_DATA.find(s => s.name === schoolName)?.nombre || schoolName;
};

export const CustomContentManager: React.FC = () => {
  const { data, dispatch } = useHeroForge();
  const [expandedCategories, setExpandedCategories] = useState<Record<ContentCategory, boolean>>({
    species: true, classes: true, subclasses: true, backgrounds: true, items: true, spells: true, npcs: true,
  });

  const [markedSpeciesIds, setMarkedSpeciesIds] = useState<string[]>([]);
  const [markedClassIds, setMarkedClassIds] = useState<string[]>([]);
  const [markedSubclassIds, setMarkedSubclassIds] = useState<string[]>([]); 
  const [markedBackgroundIds, setMarkedBackgroundIds] = useState<string[]>([]);
  const [markedItemIds, setMarkedItemIds] = useState<string[]>([]);
  const [markedSpellIds, setMarkedSpellIds] = useState<string[]>([]); 
  const [markedNpcIds, setMarkedNpcIds] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<DndSpecies | DndClass | SubclassDefinition | DndBackground | Item | SpellDefinition | NPCData | null>(null);
  const [selectedItemTypeForModal, setSelectedItemTypeForModal] = useState<ContentCategory | null>(null);


  const isDirty = useMemo(() => 
    markedSpeciesIds.length > 0 || markedClassIds.length > 0 || markedSubclassIds.length > 0 || 
    markedBackgroundIds.length > 0 || markedItemIds.length > 0 || markedSpellIds.length > 0 || markedNpcIds.length > 0, 
  [markedSpeciesIds, markedClassIds, markedSubclassIds, markedBackgroundIds, markedItemIds, markedSpellIds, markedNpcIds]);

  const toggleCategory = (category: ContentCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleMarkForDeletion = (type: ContentCategory, id: string) => {
    switch (type) {
      case 'species': setMarkedSpeciesIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'classes': setMarkedClassIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'subclasses': setMarkedSubclassIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'backgrounds': setMarkedBackgroundIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'items': setMarkedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'spells': setMarkedSpellIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
      case 'npcs': setMarkedNpcIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); break;
    }
  };

  const handleSaveChanges = () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar los elementos marcados? Esta acción no se puede deshacer.")) {
        markedSpeciesIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_SPECIES', payload: id }));
        markedClassIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_CLASS', payload: id }));
        markedSubclassIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_SUBCLASS', payload: id })); 
        markedBackgroundIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_BACKGROUND', payload: id }));
        markedItemIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_ITEM', payload: id }));
        markedSpellIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_SPELL', payload: id })); 
        markedNpcIds.forEach(id => dispatch({ type: 'DELETE_CUSTOM_NPC', payload: id }));
        clearMarkedItems();
    }
  };

  const handleCancelChanges = () => clearMarkedItems();
  
  const clearMarkedItems = () => {
    setMarkedSpeciesIds([]); setMarkedClassIds([]); setMarkedSubclassIds([]); 
    setMarkedBackgroundIds([]); setMarkedItemIds([]); setMarkedSpellIds([]); setMarkedNpcIds([]);
  };

  const isMarked = (type: ContentCategory, id: string): boolean => {
    switch (type) {
        case 'species': return markedSpeciesIds.includes(id);
        case 'classes': return markedClassIds.includes(id);
        case 'subclasses': return markedSubclassIds.includes(id); 
        case 'backgrounds': return markedBackgroundIds.includes(id);
        case 'items': return markedItemIds.includes(id);
        case 'spells': return markedSpellIds.includes(id); 
        case 'npcs': return markedNpcIds.includes(id);
        default: return false;
    }
  };

  const handleItemClick = (item: DndSpecies | DndClass | SubclassDefinition | DndBackground | Item | SpellDefinition | NPCData, itemType: ContentCategory) => {
    setSelectedItemForModal(item);
    setSelectedItemTypeForModal(itemType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItemForModal(null);
    setSelectedItemTypeForModal(null);
  };

  const handleSaveItemFromModal = (updatedItem: any, itemType: ContentCategory) => {
    switch (itemType) {
      case 'species': dispatch({ type: 'UPDATE_CUSTOM_SPECIES', payload: updatedItem as DndSpecies }); break;
      case 'classes': dispatch({ type: 'UPDATE_CUSTOM_CLASS', payload: updatedItem as DndClass }); break;
      case 'subclasses': dispatch({ type: 'UPDATE_CUSTOM_SUBCLASS', payload: updatedItem as SubclassDefinition }); break;
      case 'backgrounds': dispatch({ type: 'UPDATE_CUSTOM_BACKGROUND', payload: updatedItem as DndBackground }); break;
      case 'items': dispatch({ type: 'UPDATE_CUSTOM_ITEM', payload: updatedItem as Item }); break;
      case 'spells': dispatch({ type: 'UPDATE_CUSTOM_SPELL', payload: updatedItem as SpellDefinition }); break;
      case 'npcs': dispatch({ type: 'UPDATE_CUSTOM_NPC', payload: updatedItem as NPCData }); break;
    }
    handleCloseModal(); // Close modal after saving
  };


  const renderCategorySection = (
    title: string,
    categoryKey: ContentCategory,
    items: Array<DndSpecies | DndClass | SubclassDefinition | DndBackground | Item | SpellDefinition | NPCData>, 
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
                let subtext = '';
                if (categoryKey === 'items' && 'category' in item) subtext = ITEM_CATEGORY_ES_SIMPLE[item.category as ItemCategory] || item.category as string;
                if (categoryKey === 'classes' && 'hitDie' in item) subtext = `d${item.hitDie}`;
                if (categoryKey === 'subclasses' && 'parentClassId' in item) {
                    const parentClassName = [...CLASSES_DATA, ...data.customClasses].find(c => c.id === (item as SubclassDefinition).parentClassId)?.name || (item as SubclassDefinition).parentClassId;
                    subtext = `Subclase de ${parentClassName}`;
                }
                if (categoryKey === 'spells' && 'level' in item && 'school' in item) subtext = `${(item as SpellDefinition).level === 0 ? "Truco" : `Nivel ${(item as SpellDefinition).level}`} de ${getSpellSchoolDisplayName((item as SpellDefinition).school as SpellSchoolName)}`;
                if (categoryKey === 'npcs' && 'type' in item && 'challengeRating' in item) {
                    subtext = `${(item as NPCData).type || 'Tipo desconocido'}, CR ${(item as NPCData).challengeRating}`;
                }

                return (
                    <div 
                        key={item.id} 
                        className={`flex justify-between items-center p-3 rounded-md shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer
                                    ${marked 
                                        ? 'bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700' 
                                        : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50'}`
                                  }
                        onClick={() => handleItemClick(item, categoryKey)}
                    >
                    <div className={`${marked ? 'line-through text-red-700 dark:text-red-300 opacity-70' : 'text-slate-700 dark:text-slate-100'}`}>
                        <p className={`font-medium ${marked ? '' : 'text-slate-700 dark:text-slate-100'}`}>{item.name}</p>
                        {subtext && <p className={`text-xs ${marked ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'} capitalize`}>{subtext}</p>}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMarkForDeletion(categoryKey, item.id);}} // Prevent modal open when clicking delete
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
  
  const totalCustomContent = data.customSpecies.length + data.customClasses.length + data.customSubclasses.length + data.customBackgrounds.length + data.customItems.length + data.customSpells.length + data.customNPCs.length; 

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
                        <CheckCircleIcon className="h-5 w-5 mr-2" /> Guardar Cambios (Eliminar Marcados)
                    </button>
                    <button
                        onClick={handleCancelChanges}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
                    >
                        <XCircleIcon className="h-5 w-5 mr-2" /> Cancelar
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
            {renderCategorySection("Subclases Personalizadas", 'subclasses', data.customSubclasses, AcademicCapIcon)} 
            {renderCategorySection("Trasfondos Personalizados", 'backgrounds', data.customBackgrounds, BookOpenIcon)}
            {renderCategorySection("Objetos Personalizados", 'items', data.customItems, CubeIcon)}
            {renderCategorySection("PNJs Personalizados", 'npcs', data.customNPCs, NpcIcon)}
            {renderCategorySection("Conjuros Personalizados", 'spells', data.customSpells, SpellIcon)} 
        </div>
      )}
      
      {isModalOpen && selectedItemForModal && selectedItemTypeForModal && (
        <CustomContentDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={selectedItemForModal}
          itemType={selectedItemTypeForModal}
          onSave={handleSaveItemFromModal}
          heroForgeData={data}
        />
      )}

       <style>{`
        .transition-max-height { transition-property: max-height; }
        .max-h-screen { max-height: 1000px; /* Adjust if content can be taller */ }
      `}</style>
    </div>
  );
};
// No default export; component is exported as a named export.
