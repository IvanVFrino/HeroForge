
import React, { useState, useEffect } from 'react';
import { DndSpecies, DndClass, SubclassDefinition, DndBackground, Item, SpellDefinition, NPCData, Size, SIZES_LIST, Trait, SkillName, AbilityScoreName, ItemCategory, ITEM_CATEGORIES, StartingEquipmentItem, WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType, HeroForgeData } from '../../types';
import { ContentCategory } from '../CustomContentManager';
import { XMarkIcon, PencilIcon, CheckIcon, ArrowPathIcon as CancelIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SKILL_DEFINITIONS } from '../../constants/skills';
import { CLASSES_DATA } from '../../constants/dndClasses';
import { ABILITY_SCORE_NAMES_ORDERED, DAMAGE_TYPES_CONST, WEAPON_PROPERTIES_CONST, ARMOR_TYPES_CONST } from '../../types';
import { DAMAGE_TYPE_ES_MAP, WEAPON_PROPERTY_ES, ARMOR_TYPE_ES, ITEM_CATEGORY_ES as ITEM_CAT_ES_DETAIL } from '../../constants/displayMaps'; // Using more general display maps

const SIZE_ES_MAP: Record<Size, string> = { Tiny: "Diminuta", Small: "Pequeña", Medium: "Mediana", Large: "Grande", Huge: "Enorme", Gargantuan: "Gargantuesca" };
const ABILITY_SCORE_ES_MAP: Record<AbilityScoreName, string> = { Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución", Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma" };
const ALL_SKILL_NAMES_OBJECT = SKILL_DEFINITIONS.map(skill => ({ name: skill.name, nombre: skill.nombre }));


interface CustomContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DndSpecies | DndClass | SubclassDefinition | DndBackground | Item | SpellDefinition | NPCData | null;
  itemType: ContentCategory | null;
  onSave: (updatedItem: any, itemType: ContentCategory) => void;
  heroForgeData: HeroForgeData; 
}

const CustomContentDetailModal: React.FC<CustomContentDetailModalProps> = ({ isOpen, onClose, item: propItem, itemType, onSave, heroForgeData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<any>(null);

  useEffect(() => {
    if (propItem) {
      setEditableData(JSON.parse(JSON.stringify(propItem))); 
      setIsEditing(false); 
    }
  }, [propItem]);

  if (!isOpen || !propItem || !itemType) return null;

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setEditableData(JSON.parse(JSON.stringify(propItem))); 
    setIsEditing(false);
  };
  const handleSave = () => {
    onSave(editableData, itemType);
    setIsEditing(false); 
  };

  const handleChange = (field: string, value: any, subField?: string, index?: number, subSubField?: string) => {
    setEditableData((prev: any) => {
      if (subField && index !== undefined && Array.isArray(prev[field])) { 
        const newList = [...prev[field]];
        if (subSubField) { 
            newList[index] = { ...newList[index], [subSubField]: value };
        } else { 
             newList[index] = { ...newList[index], ...value }; 
        }
        return { ...prev, [field]: newList };
      } else if (subField) { 
        return { ...prev, [field]: { ...(prev[field] || {}), [subField]: value } };
      }
      return { ...prev, [field]: value };
    });
  };
  
  const handleArrayChange = (field: string, index: number, subField: string, value: string) => {
     setEditableData((prev: any) => {
        const newList = [...(prev[field] || [])];
        // Ensure the object at the index exists and is an object before trying to spread it
        if (index < newList.length && newList[index] !== null && typeof newList[index] === 'object') {
            newList[index] = {...newList[index], [subField]: value};
        } else {
            // If trying to set a property on a non-existent/non-object array item, create it.
            // This primarily handles cases where an empty item object was added via addToArray
            // and is now being populated.
            const newItem: any = { [subField]: value };
            // If index is beyond current length, this effectively adds it.
            // If index is within length but item was null/not object, it replaces it.
            newList[index] = newItem;
        }
        return {...prev, [field]: newList };
     });
  };

  const addToArray = (field: string, newItem: any) => {
     setEditableData((prev: any) => ({ ...prev, [field]: [...(prev[field] || []), newItem] }));
  };
  const removeFromArray = (field: string, index: number) => {
     setEditableData((prev: any) => ({ ...prev, [field]: (prev[field] || []).filter((_:any, i:number) => i !== index) }));
  };

  const safeRenderString = (value: any): string => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'string') return value === '' ? 'N/A' : value;
    if (value instanceof String) return value.toString() === '' ? 'N/A' : value.toString(); // Handle String objects
    if (typeof value === 'object' && !React.isValidElement(value)) {
      try {
        return `[Object: ${JSON.stringify(value)}]`;
      } catch (e) {
        return '[Object: Unserializable]';
      }
    }
    // For numbers, booleans, React elements (which will become like "[object Object]"), functions (toString)
    const strVal = String(value);
    return strVal === '' ? 'N/A' : strVal;
  };

  const renderDisplayField = (label: string, value: React.ReactNode) => (
    <div className="mb-2 text-sm">
      <strong className="text-slate-600 dark:text-slate-400">{label}: </strong>
      <span className="text-slate-800 dark:text-slate-200">
        {safeRenderString(value)}
      </span>
    </div>
  );

  const renderInputField = (label: string, fieldName: string, type: string = 'text', subField?: string) => (
    <div className="mb-3">
      <label htmlFor={`${fieldName}-${subField || ''}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        id={`${fieldName}-${subField || ''}`}
        value={subField ? (editableData[fieldName]?.[subField] || '') : (editableData[fieldName] || '')}
        onChange={(e) => handleChange(fieldName, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value, subField)}
        className="mt-1 input-field-modal"
      />
    </div>
  );
  
  const renderTextareaField = (label: string, fieldName: string, subField?: string) => (
     <div className="mb-3">
      <label htmlFor={`${fieldName}-${subField || ''}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <textarea
        id={`${fieldName}-${subField || ''}`}
        value={subField ? (editableData[fieldName]?.[subField] || '') : (editableData[fieldName] || '')}
        onChange={(e) => handleChange(fieldName, e.target.value, subField)}
        rows={3}
        className="mt-1 input-field-modal"
      />
    </div>
  );

  const renderSelectField = (label: string, fieldName: string, options: Array<{value: string; label: string}>, subField?: string) => (
    <div className="mb-3">
      <label htmlFor={`${fieldName}-${subField || ''}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <select
        id={`${fieldName}-${subField || ''}`}
        value={subField ? (editableData[fieldName]?.[subField] || '') : (editableData[fieldName] || '')}
        onChange={(e) => handleChange(fieldName, e.target.value, subField)}
        className="mt-1 input-field-modal"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const renderTraitListItem = (trait: Trait, keyPrefix: string, index: number) => (
    <li key={`${keyPrefix}-${index}`} className="p-1 rounded bg-slate-100 dark:bg-slate-700/50">
        <strong className="text-slate-600 dark:text-slate-300">{safeRenderString(trait.name)}:</strong>
        {' '}
        {safeRenderString(trait.description)}
    </li>
  );


  const renderContent = () => {
    if (!editableData) return <p>Cargando datos...</p>;

    switch (itemType) {
      case 'species':
        const species = editableData as DndSpecies;
        return (
          <div className="space-y-3">
            {isEditing ? renderInputField('Nombre', 'name') : renderDisplayField('Nombre', species.name)}
            {isEditing ? renderSelectField('Tamaño', 'size', SIZES_LIST.map(s => ({value: s, label: SIZE_ES_MAP[s]}))) : renderDisplayField('Tamaño', SIZE_ES_MAP[species.size] || species.size)}
            {isEditing ? renderInputField('Velocidad (pies)', 'speed', 'number') : renderDisplayField('Velocidad', `${species.speed} pies`)}
            
            <div>
              <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Idiomas:</h4>
              {isEditing ? (
                <div className="space-y-1">
                  {(species.languages || []).map((lang, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="text" value={lang} onChange={(e) => handleChange('languages', (species.languages || []).map((l, i) => i === index ? e.target.value : l))} className="input-field-modal flex-grow text-xs" />
                      <button onClick={() => removeFromArray('languages', index)} className="btn-remove-modal"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                  ))}
                  <button onClick={() => addToArray('languages', '')} className="btn-add-modal text-xs w-full mt-1">Añadir Idioma</button>
                </div>
              ) : (
                <ul className="list-disc list-inside text-xs pl-4">{(species.languages || []).map((lang, i) => <li key={i}>{safeRenderString(lang)}</li>)}</ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Rasgos:</h4>
              {isEditing ? (
                <div className="space-y-2">
                  {(species.traits || []).map((trait, index) => (
                    <div key={index} className="p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700/50">
                       <div className="flex justify-between items-center mb-1">
                         <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Nombre Rasgo #{index+1}</label>
                         <button onClick={() => removeFromArray('traits', index)} className="btn-remove-modal"><TrashIcon className="h-4 w-4"/></button>
                       </div>
                      <input type="text" value={trait.name} onChange={(e) => handleArrayChange('traits', index, 'name', e.target.value)} placeholder="Nombre del Rasgo" className="input-field-modal mb-1 text-xs"/>
                      <textarea value={trait.description} onChange={(e) => handleArrayChange('traits', index, 'description', e.target.value)} placeholder="Descripción del Rasgo" rows={2} className="input-field-modal text-xs"/>
                    </div>
                  ))}
                  <button onClick={() => addToArray('traits', {name: '', description: ''})} className="btn-add-modal text-xs w-full mt-1">Añadir Rasgo</button>
                </div>
              ) : (
                <ul className="list-none space-y-1 text-xs">
                    {(species.traits || []).map((trait, i) => renderTraitListItem(trait, `species-trait`, i))}
                </ul>
              )}
            </div>
          </div>
        );
      case 'items':
        const currentItemData = editableData as Item;
        return (
           <div className="space-y-3">
            {isEditing ? renderInputField('Nombre', 'name') : renderDisplayField('Nombre', currentItemData.name)}
            {isEditing ? renderSelectField('Categoría', 'category', ITEM_CATEGORIES.map(c=>({value: c, label: ITEM_CAT_ES_DETAIL[c]}))) : renderDisplayField('Categoría', ITEM_CAT_ES_DETAIL[currentItemData.category] || currentItemData.category)}
            {isEditing ? renderTextareaField('Descripción', 'description') : renderDisplayField('Descripción', currentItemData.description)}
            {isEditing ? renderInputField('Costo (ej: 10 gp)', 'costString', 'text') : renderDisplayField('Costo', typeof currentItemData.cost === 'string' ? currentItemData.cost : currentItemData.cost ? `${currentItemData.cost.quantity} ${currentItemData.cost.unit}` : 'N/A')}
            {isEditing ? renderInputField('Peso (ej: 5 lb)', 'weightString', 'text') : renderDisplayField('Peso', typeof currentItemData.weight === 'string' ? currentItemData.weight : currentItemData.weight ? `${currentItemData.weight.value} ${currentItemData.weight.unit}` : 'N/A')}
            
            {currentItemData.category === 'Weapon' && currentItemData.weaponDetails && (
              <fieldset className="form-section-modal">
                <legend className="legend-title-modal">Detalles de Arma</legend>
                {isEditing ? renderInputField('Dados de Daño', 'weaponDetails', 'text', 'damageDice') : renderDisplayField('Dados de Daño', currentItemData.weaponDetails.damageDice)}
                {isEditing ? renderSelectField('Tipo de Daño', 'weaponDetails', DAMAGE_TYPES_CONST.map(dt => ({value: dt, label: DAMAGE_TYPE_ES_MAP[dt]})), 'damageType') : renderDisplayField('Tipo de Daño', DAMAGE_TYPE_ES_MAP[currentItemData.weaponDetails.damageType as DamageType] || currentItemData.weaponDetails.damageType)}
                 <div className="mb-2 text-sm">
                  <strong className="text-slate-600 dark:text-slate-400">Propiedades: </strong>
                   <span className="text-slate-800 dark:text-slate-200">{(currentItemData.weaponDetails.properties || []).map(p => WEAPON_PROPERTY_ES[p]).join(', ') || 'Ninguna'}</span>
                 </div>
              </fieldset>
            )}
            {currentItemData.category === 'Armor' && currentItemData.armorDetails && (
              <fieldset className="form-section-modal">
                <legend className="legend-title-modal">Detalles de Armadura</legend>
                 {isEditing ? renderInputField('CA Base', 'armorDetails', 'number', 'baseAC') : renderDisplayField('CA Base', currentItemData.armorDetails.baseAC)}
                 {isEditing ? renderSelectField('Tipo de Armadura', 'armorDetails', [{value: '', label: 'Genérica/Escudo'}, ...ARMOR_TYPES_CONST.map(at => ({value: at, label: ARMOR_TYPE_ES[at]}))], 'armorType') : renderDisplayField('Tipo Armadura', ARMOR_TYPE_ES[currentItemData.armorDetails.armorType as ArmorType] || currentItemData.armorDetails.armorType || 'Genérica/Escudo')}
              </fieldset>
            )}
          </div>
        );
       case 'classes':
        const dndClass = editableData as DndClass;
        return (
            <div>
                {renderDisplayField('Nombre', dndClass.name)}
                {renderDisplayField('Dado de Golpe', `d${dndClass.hitDie}`)}
                {renderDisplayField('Características Primarias', dndClass.primaryAbilities.map(ab => ABILITY_SCORE_ES_MAP[ab]).join(', '))}
                <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Características de Clase:</h4>
                <div className="text-xs max-h-60 overflow-y-auto custom-scrollbar-modal-content bg-slate-50 dark:bg-slate-700/30 p-2 rounded">
                {Object.entries(dndClass.classFeaturesByLevel || {}).map(([level, features]) => (
                    <div key={level} className="mb-1.5">
                        <strong className="block text-purple-600 dark:text-purple-400">Nivel {level}:</strong>
                        <ul className="list-none space-y-0.5 pl-2">
                            {(features as Trait[]).map((feat, idx) => renderTraitListItem(feat, `class-${level}-feat`, idx))}
                        </ul>
                    </div>
                ))}
                </div>
            </div>
        );
    case 'subclasses':
        const subclass = editableData as SubclassDefinition;
        const parentCls = CLASSES_DATA.find(c => c.id === subclass.parentClassId) || heroForgeData.customClasses.find(c => c.id === subclass.parentClassId);
        return (
            <div>
                {renderDisplayField('Nombre', subclass.name)}
                {renderDisplayField('Clase Principal', parentCls ? parentCls.name : subclass.parentClassId)}
                {renderDisplayField('Descripción', subclass.description)}
                 <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Características de Subclase:</h4>
                <div className="text-xs max-h-60 overflow-y-auto custom-scrollbar-modal-content bg-slate-50 dark:bg-slate-700/30 p-2 rounded">
                {Object.entries(subclass.featuresByLevel || {}).map(([level, features]) => (
                    <div key={level} className="mb-1.5">
                        <strong className="block text-purple-600 dark:text-purple-400">Nivel {level}:</strong>
                        <ul className="list-none space-y-0.5 pl-2">
                             {(features as Trait[]).map((feat, idx) => renderTraitListItem(feat, `subclass-${level}-feat`, idx))}
                        </ul>
                    </div>
                ))}
                </div>
            </div>
        );
    case 'npcs':
        const npc = editableData as NPCData;
        return (
             <div>
                {renderDisplayField('Nombre', npc.name)}
                {/* Display a few key NPC stats. More complex NPC editing would need a dedicated form. */}
                {renderDisplayField('Tipo', npc.type)}
                {renderDisplayField('CA', npc.armorClass)}
                {renderDisplayField('PG', `${npc.hitPoints} (${npc.hitDice})`)}
                <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Habilidades Especiales:</h4>
                 <ul className="list-none space-y-1 text-xs max-h-24 overflow-y-auto custom-scrollbar-modal-content pr-1">
                    {(npc.specialAbilities || []).map((trait, i) => renderTraitListItem(trait, 'npc-sa', i))}
                </ul>
                <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300">Acciones:</h4>
                 <ul className="list-none space-y-1 text-xs max-h-24 overflow-y-auto custom-scrollbar-modal-content pr-1">
                    {(npc.actions || []).map((trait, i) => renderTraitListItem(trait, 'npc-act', i))}
                </ul>
             </div>
        );
      default:
        return <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96 custom-scrollbar-modal-content">{JSON.stringify(propItem, null, 2)}</pre>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center p-4 z-[500]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-300">
            {isEditing ? `Editando: ${propItem.name}` : `Detalles de: ${propItem.name}`}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-4 md:p-6 flex-grow overflow-y-auto custom-scrollbar-modal-content">
          {renderContent()}
        </div>

        <footer className="flex justify-end items-center p-4 border-t border-slate-200 dark:border-slate-700 space-x-3">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="btn-secondary-modal"><CancelIcon className="h-5 w-5 mr-1.5"/>Cancelar</button>
              <button onClick={handleSave} className="btn-primary-modal"><CheckIcon className="h-5 w-5 mr-1.5"/>Guardar Cambios</button>
            </>
          ) : (
            <>
              {(itemType === 'species' || itemType === 'items') && 
                <button onClick={handleEdit} className="btn-edit-modal"><PencilIcon className="h-5 w-5 mr-1.5"/>Editar</button>
              }
              <button onClick={onClose} className="btn-secondary-modal">Cerrar</button>
            </>
          )}
        </footer>
      </div>
      <style>{`
        .input-field-modal { margin-top: 0.25rem; display: block; width: 100%; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; color: #111827; }
        .dark .input-field-modal { background-color: #374151; border-color: #4b5563; color: #f3f4f6; }
        .btn-remove-modal { padding: 0.25rem; color: #ef4444; background-color: transparent; border: 1px solid #ef4444; border-radius: 0.25rem;}
        .dark .btn-remove-modal { color: #f87171; border-color: #f87171; }
        .btn-remove-modal:hover { background-color: #fee2e2; } .dark .btn-remove-modal:hover { background-color: #7f1d1d; }
        .btn-add-modal { padding: 0.375rem 0.75rem; font-size: 0.75rem; background-color: #22c55e; color: white; border-radius: 0.375rem; }
        .dark .btn-add-modal { background-color: #16a34a; }
        .form-section-modal { padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; margin-top: 0.75rem; background-color: #f9fafb; }
        .dark .form-section-modal { border-color: #374151; background-color: #1f2937; }
        .legend-title-modal { font-size: 0.875rem; font-weight: 600; color: #4f46e5; margin-bottom: 0.25rem; }
        .dark .legend-title-modal { color: #818cf8; }
        .btn-primary-modal { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #16a34a; color: white; font-weight: 500; font-size: 0.875rem; }
        .btn-primary-modal:hover { background-color: #15803d; }
        .dark .btn-primary-modal { background-color: #22c55e; } .dark .btn-primary-modal:hover { background-color: #16a34a; }
        .btn-secondary-modal { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #e5e7eb; color: #374151; font-weight: 500; font-size: 0.875rem; }
        .btn-secondary-modal:hover { background-color: #d1d5db; }
        .dark .btn-secondary-modal { background-color: #4b5563; color: #e5e7eb; } .dark .btn-secondary-modal:hover { background-color: #374151; }
        .btn-edit-modal { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #3b82f6; color: white; font-weight: 500; font-size: 0.875rem; }
        .btn-edit-modal:hover { background-color: #2563eb; }
        .dark .btn-edit-modal { background-color: #60a5fa; } .dark .btn-edit-modal:hover { background-color: #3b82f6; }
        .custom-scrollbar-modal-content::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar-modal-content::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 0 0 0.375rem 0; }
        .dark .custom-scrollbar-modal-content::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar-modal-content::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
        .dark .custom-scrollbar-modal-content::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  );
};

export default CustomContentDetailModal;
