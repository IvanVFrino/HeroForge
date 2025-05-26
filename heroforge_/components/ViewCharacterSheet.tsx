
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHeroForge } from '../context/HeroForgeDataContext';
import { CharacterSheet, SavedCharacterCoreData, AbilityScoreName, SkillName, ItemCategory, EquippedItem, Item, Trait, HeroForgeData, HeroForgeAction, ITEM_CATEGORIES, DAMAGE_TYPES_CONST, WEAPON_PROPERTIES_CONST, ARMOR_TYPES_CONST, DamageType, WeaponProperty, ArmorType, WeaponDetails } from '../types';
import { reconstructSheetFromCoreData, convertSheetToCoreData } from '../utils/characterConverter';
import { calculateAllDerivedStats } from '../utils/characterCalculations';
import CharacterSummary from './CharacterSummary';
import { ArrowLeftIcon, PlusCircleIcon, DocumentTextIcon, ArchiveBoxIcon, SparklesIcon as SpellsIcon, UserCircleIcon, FunnelIcon, MagnifyingGlassIcon, ShieldCheckIcon, SunIcon, InformationCircleIcon, CubeIcon as GenericDieIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'; 
import { CLASSES_DATA } from '../constants/dndClasses';
import { BACKGROUNDS_DATA } from '../constants/dndBackgrounds';
import { SPECIES_DATA } from '../constants/dndSpecies';
import { performRoll, RollResult } from '../utils/diceRoller'; 
import { SKILL_DEFINITIONS } from '../constants/skills';

type ActiveMainView = 'characterSheet' | 'inventory' | 'spells' | 'notes';
type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';

const ITEM_CATEGORY_ES: Record<ItemCategory, string> = {
  Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo'
};
const DAMAGE_TYPE_ES: Record<DamageType, string> = {
  Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico'
};
const WEAPON_PROPERTY_ES: Record<WeaponProperty, string> = {
  Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera', Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial', Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil'
};
const ARMOR_TYPE_ES: Record<ArmorType, string> = {
  Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada'
};
const ALIGNMENT_ES_MAP: Record<Alignment, string> = {
  'Lawful Good': 'Legal Bueno', 'Neutral Good': 'Neutral Bueno', 'Chaotic Good': 'Caótico Bueno',
  'Lawful Neutral': 'Legal Neutral', 'True Neutral': 'Neutral Auténtico', 'Chaotic Neutral': 'Caótico Neutral',
  'Lawful Evil': 'Legal Malvado', 'Neutral Evil': 'Neutral Malvado', 'Chaotic Evil': 'Caótico Malvado',
};


const DetailItem: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
  <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="font-medium text-slate-800 dark:text-slate-100">{label}:</strong> {value || 'N/A'}</p>
);

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
}> = ({ label, isActive, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`flex flex-col items-center justify-center w-full p-2 text-xs font-medium transition-colors duration-150 focus:outline-none rounded-l-md
                ${isActive 
                    ? 'bg-slate-200 dark:bg-slate-700 text-purple-700 dark:text-purple-300 border-r-0' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
  >
    <Icon className="h-5 w-5 mb-0.5" />
    {label}
  </button>
);

interface InventoryTabContentProps {
    characterSheet: CharacterSheet;
    heroForgeData: HeroForgeData;
    characterId: string;
    heroForgeDispatch: React.Dispatch<HeroForgeAction>;
    onEquipmentChange: (newEquipment: EquippedItem[]) => void;
}

const InventoryTabContent: React.FC<InventoryTabContentProps> = ({
    characterSheet,
    heroForgeData,
    characterId,
    heroForgeDispatch,
    onEquipmentChange,
}) => {
    const [selectedCustomItemId, setSelectedCustomItemId] = useState<string>('');
    const [addItemQuantity, setAddItemQuantity] = useState<number>(1);
    const [filterCategory, setFilterCategory] = useState<ItemCategory | 'All'>('All');
    const [searchNameQuery, setSearchNameQuery] = useState<string>('');

    const [activeTooltipItem, setActiveTooltipItem] = useState<EquippedItem | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const shouldShowTooltip = (item: EquippedItem): boolean => {
        return !!(item.weaponDetails || 
                  item.armorDetails || 
                  (item.description && item.description.length > 30) ||
                  item.cost || item.weight
                 ); 
    };

    const handleMouseEnterItem = (item: EquippedItem, event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
        if (shouldShowTooltip(item)) {
            setActiveTooltipItem(item);
            setTooltipPosition({ top: event.clientY + 15, left: event.clientX + 15 });
        }
    };
    
    const handleMouseMoveItem = (event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
        if (activeTooltipItem) {
            let newTop = event.clientY + 15;
            let newLeft = event.clientX + 15;

            if (tooltipRef.current) {
                const tooltipRect = tooltipRef.current.getBoundingClientRect();
                if (newLeft + tooltipRect.width > window.innerWidth - 10) { 
                    newLeft = event.clientX - tooltipRect.width - 15;
                }
                if (newTop + tooltipRect.height > window.innerHeight - 10) { 
                    newTop = event.clientY - tooltipRect.height - 15;
                }
            }
            setTooltipPosition({ top: newTop, left: newLeft });
        }
    };
    
    const handleMouseLeaveItem = () => {
        setActiveTooltipItem(null);
    };

    const handleAddItemToInventory = () => {
        if (!selectedCustomItemId || addItemQuantity <= 0 || !characterId) {
            alert("Por favor, selecciona un objeto y especifica una cantidad válida.");
            return;
        }
        const itemDefinition = heroForgeData.customItems.find(item => item.id === selectedCustomItemId);
        if (!itemDefinition) {
            alert("Objeto personalizado seleccionado no encontrado.");
            return;
        }
        let newEquipmentList = [...characterSheet.equipment];
        const existingItemIndex = newEquipmentList.findIndex(eq => 
            eq.definitionId === itemDefinition.id && eq.source === 'CustomAddedSheet' 
        );

        if (existingItemIndex !== -1) {
            newEquipmentList[existingItemIndex] = {
                ...newEquipmentList[existingItemIndex],
                quantity: newEquipmentList[existingItemIndex].quantity + addItemQuantity,
            };
        } else {
            const newItemInstance: EquippedItem = {
                instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}`,
                definitionId: itemDefinition.id,
                name: itemDefinition.name,
                category: itemDefinition.category,
                quantity: addItemQuantity,
                description: itemDefinition.description, cost: itemDefinition.cost, weight: itemDefinition.weight,
                weaponDetails: itemDefinition.weaponDetails, armorDetails: itemDefinition.armorDetails,
                source: 'CustomAddedSheet', 
            };
            newEquipmentList.push(newItemInstance);
        }
        onEquipmentChange(newEquipmentList);
        setSelectedCustomItemId('');
        setAddItemQuantity(1);
        setFilterCategory('All');
        setSearchNameQuery('');
    };

    const handleEquipItem = (instanceIdToEquip: string) => {
        const equipTarget = characterSheet.equipment.find(e => e.instanceId === instanceIdToEquip);
        if (!equipTarget) return;
    
        let newEquipment = characterSheet.equipment.map(e => ({ ...e })); 
    
        if (equipTarget.category === 'Armor') {
            const isEquipTargetBodyArmor = equipTarget.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(equipTarget.armorDetails.armorType);
            const isEquipTargetShield = equipTarget.armorDetails && !equipTarget.armorDetails.armorType;
    
            if (isEquipTargetBodyArmor) {
                newEquipment.forEach(item => {
                    if (item.category === 'Armor' && item.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(item.armorDetails.armorType) && item.instanceId !== equipTarget.instanceId) {
                        item.equipped = false;
                    }
                });
            }
            if (isEquipTargetShield) {
                newEquipment.forEach(item => {
                    if (item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType && item.instanceId !== equipTarget.instanceId) { 
                        item.equipped = false;
                    }
                    // Also unequip two-handed weapons if equipping a shield
                    if (item.category === 'Weapon' && item.weaponDetails?.properties.includes('Two-Handed')) { 
                        item.equipped = false;
                    }
                });
            }
        } else if (equipTarget.category === 'Weapon') {
            const isEquipTargetTwoHanded = equipTarget.weaponDetails?.properties.includes('Two-Handed');
            const isEquipTargetLight = equipTarget.weaponDetails?.properties.includes('Light');
    
            if (isEquipTargetTwoHanded) { // Equipping a two-handed weapon
                newEquipment.forEach(item => {
                    // Unequip all other weapons
                    if (item.category === 'Weapon' && item.instanceId !== equipTarget.instanceId) item.equipped = false; 
                    // Unequip shields
                    if (item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType) item.equipped = false; 
                });
            } else { // Equipping a one-handed weapon (light or not)
                // Unequip any two-handed weapon
                newEquipment.forEach(item => {
                    if (item.category === 'Weapon' && item.weaponDetails?.properties.includes('Two-Handed')) item.equipped = false;
                });
    
                const currentlyEquippedShield = newEquipment.find(e => e.equipped && e.category === 'Armor' && e.armorDetails && !e.armorDetails.armorType);
                let currentlyEquippedOneHandedWeapons = newEquipment.filter(e => e.equipped && e.category === 'Weapon' && e.instanceId !== equipTarget.instanceId && !e.weaponDetails?.properties.includes('Two-Handed'));
    
                if (currentlyEquippedShield) { 
                    // If shield is equipped, can only have one 1H weapon. Unequip all other 1H weapons.
                    currentlyEquippedOneHandedWeapons.forEach(w => { 
                        const weaponToUnequip = newEquipment.find(eq => eq.instanceId === w.instanceId);
                        if(weaponToUnequip) weaponToUnequip.equipped = false;
                    });
                } else { 
                    // No shield. Can have two 1H weapons if both are Light.
                    if (!isEquipTargetLight) { // Equipping a non-Light 1H weapon
                        // Unequip all other 1H weapons
                        currentlyEquippedOneHandedWeapons.forEach(w => { 
                            const weaponToUnequip = newEquipment.find(eq => eq.instanceId === w.instanceId);
                            if(weaponToUnequip) weaponToUnequip.equipped = false;
                        });
                    } else { // Equipping a Light 1H weapon
                        const otherLightWeapons = currentlyEquippedOneHandedWeapons.filter(w => w.weaponDetails?.properties.includes('Light'));
                        const otherNonLight1HWeapons = currentlyEquippedOneHandedWeapons.filter(w => !w.weaponDetails?.properties.includes('Light'));
    
                        if (otherNonLight1HWeapons.length > 0) { 
                            // If a non-light 1H weapon is equipped, unequip it
                             const weaponToUnequip = newEquipment.find(eq => eq.instanceId === otherNonLight1HWeapons[0].instanceId);
                             if(weaponToUnequip) weaponToUnequip.equipped = false;
                        } else if (otherLightWeapons.length >= 1) { 
                            // If already one light weapon equipped, this new one makes two. If more than one already, unequip oldest.
                            if (otherLightWeapons.length >= 2) { 
                                const firstLightToUnequip = newEquipment.find(eq => eq.instanceId === otherLightWeapons[0].instanceId); // Simplistic: unequip the first other light weapon found
                                if(firstLightToUnequip) firstLightToUnequip.equipped = false;
                            }
                        }
                    }
                }
            }
        }
    
        // Finally, equip the target item
        const finalTargetItem = newEquipment.find(e => e.instanceId === equipTarget.instanceId);
        if (finalTargetItem) finalTargetItem.equipped = true;
        
        onEquipmentChange(newEquipment);
    };

    const handleUnequipItem = (instanceIdToUnequip: string) => {
        const newEquipment = characterSheet.equipment.map(item =>
            item.instanceId === instanceIdToUnequip ? { ...item, equipped: false } : item
        );
        onEquipmentChange(newEquipment);
    };

    const groupedInventory = characterSheet.equipment.reduce((acc, item) => {
        (acc[item.category] = acc[item.category] || []).push(item);
        return acc;
    }, {} as Record<ItemCategory, EquippedItem[]>);

    const filteredCustomItems = heroForgeData.customItems.filter(item => {
        const categoryMatch = filterCategory === 'All' || item.category === filterCategory;
        const nameMatch = !searchNameQuery || item.name.toLowerCase().includes(searchNameQuery.toLowerCase());
        return categoryMatch && nameMatch;
    });

    return (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 p-2"> 
            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Inventario</h3>
            <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-200 mb-1">Oro: <span className="font-normal text-yellow-600 dark:text-yellow-400">{characterSheet.gold} po</span></h4>
            {characterSheet.equipment.length === 0 && characterSheet.gold === 0 ? (
                <p className="italic text-slate-500 dark:text-slate-400">Inventario vacío.</p>
            ) : (
                Object.entries(groupedInventory || {}).sort(([catA], [catB]) => ITEM_CATEGORIES.indexOf(catA as ItemCategory) - ITEM_CATEGORIES.indexOf(catB as ItemCategory)).map(([category, items]) => (
                    <div key={category} className="mt-1">
                        <h5 className="text-md font-semibold text-purple-600 dark:text-purple-200 capitalize">{ITEM_CATEGORY_ES[category as ItemCategory]}</h5>
                        <ul className="list-none pl-0 space-y-0.5">
                            {items.map(item => (
                                <li 
                                    key={item.instanceId} 
                                    className={`flex items-center justify-between p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group ${item.equipped ? 'border border-green-500 bg-green-50 dark:bg-green-900/30' : 'border border-transparent'}`}
                                    onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                                    onMouseMove={handleMouseMoveItem}
                                    onMouseLeave={handleMouseLeaveItem}
                                >
                                    <span className="flex-grow cursor-default text-slate-800 dark:text-slate-200">
                                        {item.name} (x{item.quantity})
                                        {item.equipped && <span className="text-green-600 dark:text-green-400 text-2xs ml-1">(Equipado)</span>}
                                        {item.description && !shouldShowTooltip(item) && item.description.length <= 30 && <span className="text-2xs text-slate-500 dark:text-slate-400 italic ml-1">- {item.description}</span>}
                                    </span>
                                    {(item.category === 'Armor' || item.category === 'Weapon') && (
                                        item.equipped ? (
                                            <button 
                                                onClick={() => handleUnequipItem(item.instanceId)}
                                                className="px-1.5 py-0.5 text-2xs bg-yellow-600 hover:bg-yellow-500 text-white rounded opacity-80 group-hover:opacity-100 transition-opacity"
                                                title={`Desequipar ${item.name}`}
                                            >
                                                Desequipar
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleEquipItem(item.instanceId)}
                                                className="px-1.5 py-0.5 text-2xs bg-sky-600 hover:bg-sky-500 text-white rounded opacity-80 group-hover:opacity-100 transition-opacity"
                                                title={`Equipar ${item.name}`}
                                            >
                                                Equipar
                                            </button>
                                        )
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}

            {activeTooltipItem && (
                <div
                    ref={tooltipRef}
                    className="fixed bg-slate-50 dark:bg-slate-900 border border-purple-500 rounded-md shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 z-[100] max-w-sm pointer-events-none"
                    style={{ top: tooltipPosition.top, left: tooltipPosition.left, transform: 'translateY(-100%)' }}
                    aria-live="polite"
                >
                    <h6 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1.5">{activeTooltipItem.name}</h6>
                    <p className="italic text-slate-500 dark:text-slate-400 text-2xs mb-2 capitalize">({ITEM_CATEGORY_ES[activeTooltipItem.category]})</p>
                    
                    {activeTooltipItem.description && (
                        <p className="mb-2 text-slate-700 dark:text-slate-300">{activeTooltipItem.description}</p>
                    )}

                    {activeTooltipItem.weaponDetails && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-0.5">
                            <p><strong>Daño:</strong> {activeTooltipItem.weaponDetails.damageDice} {DAMAGE_TYPE_ES[activeTooltipItem.weaponDetails.damageType]}</p>
                            {activeTooltipItem.weaponDetails.properties.length > 0 && (
                                <p><strong>Propiedades:</strong> {activeTooltipItem.weaponDetails.properties.map(p => WEAPON_PROPERTY_ES[p]).join(', ')}</p>
                            )}
                            {(activeTooltipItem.weaponDetails.rangeNormal || activeTooltipItem.weaponDetails.rangeLong) && (
                                <p><strong>Alcance:</strong> {activeTooltipItem.weaponDetails.rangeNormal || '-'}/{activeTooltipItem.weaponDetails.rangeLong || '-'} pies</p>
                            )}
                            {activeTooltipItem.weaponDetails.versatileDamage && (
                                <p><strong>Versátil:</strong> {activeTooltipItem.weaponDetails.versatileDamage}</p>
                            )}
                        </div>
                    )}

                    {activeTooltipItem.armorDetails && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-0.5">
                            <p><strong>CA Base:</strong> {activeTooltipItem.armorDetails.baseAC}</p>
                            {activeTooltipItem.armorDetails.armorType && <p><strong>Tipo:</strong> {ARMOR_TYPE_ES[activeTooltipItem.armorDetails.armorType]}</p>}
                            <p><strong>Añadir Mod. Des:</strong> {activeTooltipItem.armorDetails.addDexModifier ? 'Sí' : 'No'}</p>
                            {activeTooltipItem.armorDetails.addDexModifier && activeTooltipItem.armorDetails.maxDexBonus !== undefined && (
                                <p><strong>Bon. Máx. Des:</strong> {activeTooltipItem.armorDetails.maxDexBonus === null || activeTooltipItem.armorDetails.maxDexBonus < 0 ? 'Ninguno' : `+${activeTooltipItem.armorDetails.maxDexBonus}`}</p>
                            )}
                            {activeTooltipItem.armorDetails.strengthRequirement && activeTooltipItem.armorDetails.strengthRequirement > 0 && (
                                <p><strong>Req. Fuerza:</strong> {activeTooltipItem.armorDetails.strengthRequirement}</p>
                            )}
                            {activeTooltipItem.armorDetails.stealthDisadvantage && <p className="text-red-600 dark:text-red-400">Desventaja en Sigilo</p>}
                        </div>
                    )}

                    {(activeTooltipItem.cost || activeTooltipItem.weight) && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-2xs text-slate-500 dark:text-slate-400 space-y-0.5">
                            {activeTooltipItem.cost && <p>Costo: {typeof activeTooltipItem.cost === 'string' ? activeTooltipItem.cost : `${activeTooltipItem.cost.quantity} ${activeTooltipItem.cost.unit}`}</p>}
                            {activeTooltipItem.weight && <p>Peso: {typeof activeTooltipItem.weight === 'string' ? activeTooltipItem.weight : `${activeTooltipItem.weight.value} ${activeTooltipItem.weight.unit}`}</p>}
                        </div>
                    )}
                </div>
            )}


            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-200 mb-2">Añadir Objeto Personalizado</h4>
                {heroForgeData.customItems.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay objetos personalizados. Créalos en el Creador de Contenido.</p>
                ) : (
                    <div className="space-y-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label htmlFor="filterCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 flex items-center">
                                    <FunnelIcon className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400"/> Filtrar por Categoría:
                                </label>
                                <select
                                    id="filterCategory"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value as ItemCategory | 'All')}
                                    className="w-full p-2 text-sm bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="All">Todas las Categorías</option>
                                    {ITEM_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{ITEM_CATEGORY_ES[cat]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="searchNameQuery" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 flex items-center">
                                   <MagnifyingGlassIcon className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400"/> Buscar por Nombre:
                                </label>
                                <input
                                    type="text"
                                    id="searchNameQuery"
                                    value={searchNameQuery}
                                    onChange={(e) => setSearchNameQuery(e.target.value)}
                                    placeholder="Escribe para buscar..."
                                    className="w-full p-2 text-sm bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="customItemSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">Objeto:</label>
                            <select
                                id="customItemSelect"
                                value={selectedCustomItemId}
                                onChange={(e) => setSelectedCustomItemId(e.target.value)}
                                className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">-- Seleccionar --</option>
                                {filteredCustomItems.map(item => (
                                    <option key={item.id} value={item.id}>{item.name} ({ITEM_CATEGORY_ES[item.category]})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="addItemQuantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">Cantidad:</label>
                            <input
                                type="number"
                                id="addItemQuantity"
                                value={addItemQuantity}
                                onChange={(e) => setAddItemQuantity(parseInt(e.target.value, 10) || 1)}
                                min="1"
                                className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                        <button
                            onClick={handleAddItemToInventory}
                            disabled={!selectedCustomItemId || addItemQuantity <= 0}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed"
                        >
                            <PlusCircleIcon className="h-5 w-5 mr-2" /> Añadir al Inventario
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SpellsTabContent: React.FC<{characterSheet: CharacterSheet}> = ({ characterSheet}) => {
    if (!characterSheet.class?.spellcasting) {
        return <p className="text-slate-500 dark:text-slate-400 italic text-sm p-2">Este personaje no tiene lanzamiento de hechizos.</p>;
    }
    const { spellcastingAbility, spellSaveDC, spellAttackBonus, knownCantrips, preparedSpells, spellSlots } = characterSheet;
    
    const getAbilityDisplayName = (abilityName?: AbilityScoreName): string => {
      if (!abilityName) return 'N/A';
      const map: Record<AbilityScoreName, string> = {
          Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución",
          Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma"
      };
      return map[abilityName] || abilityName;
    };

    return (
        <div className="space-y-3 p-2 text-slate-700 dark:text-slate-200"> 
            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Lanzamiento de Hechizos</h3>
            <DetailItem label="Característica" value={getAbilityDisplayName(spellcastingAbility)} />
            <DetailItem label="CD Salvación" value={spellSaveDC} />
            <DetailItem label="Bonif. Ataque" value={spellAttackBonus !== undefined && spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus} />

            {knownCantrips && knownCantrips.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-100 mt-3 mb-1">Trucos Conocidos</h4>
                    <ul className="list-disc list-inside pl-2 text-sm space-y-0.5">
                        {knownCantrips.map(spell => <li key={spell}>{spell}</li>)}
                    </ul>
                </div>
            )}
            {preparedSpells && preparedSpells.length > 0 && (
                 <div>
                    <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-100 mt-3 mb-1">Hechizos Preparados</h4>
                    <ul className="list-disc list-inside pl-2 text-sm space-y-0.5">
                        {preparedSpells.map(spell => <li key={spell}>{spell}</li>)}
                    </ul>
                </div>
            )}
            {spellSlots && Object.keys(spellSlots).length > 0 && (
                 <div>
                    <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-100 mt-3 mb-1">Espacios de Hechizo</h4>
                    {Object.entries(spellSlots).map(([level, slots]) => (
                        <p key={level} className="text-sm">Nivel {level.replace('level','_')}: {slots.used}/{slots.total}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

const NotesTabContent: React.FC<{characterSheet: CharacterSheet}> = ({ characterSheet }) => {
    return (
        <div className="p-2 text-slate-700 dark:text-slate-200"> 
            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Notas del Personaje</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm bg-slate-100 dark:bg-slate-700/50 p-3 rounded max-h-[60vh] overflow-y-auto">
                {characterSheet._savedCoreDataHelper?.notes || "No hay notas especiales registradas."}
            </pre>
        </div>
    );
};


const ViewCharacterSheet: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const { data: heroForgeData, dispatch: heroForgeDispatch } = useHeroForge();
  const [characterSheet, setCharacterSheet] = useState<CharacterSheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  const [activeMainView, setActiveMainView] = useState<ActiveMainView>('characterSheet');
  const [attackRollMode, setAttackRollMode] = useState<AttackRollMode>('normal');

  const [activeTooltipTrait, setActiveTooltipTrait] = useState<Trait | null>(null);
  const [traitTooltipPosition, setTraitTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const traitTooltipRef = useRef<HTMLDivElement>(null);

  const saveTimeoutRef = useRef<number | null>(null);


  useEffect(() => {
    if (!characterId) {
      setError("No se proporcionó ID de personaje.");
      setIsLoading(false);
      return;
    }
    const coreData = heroForgeData.characters.find(c => c.id === characterId);
    if (!coreData) {
      setError(`Personaje con ID ${characterId} no encontrado.`);
      setIsLoading(false);
      return;
    }
    try {
      const allClasses = [...CLASSES_DATA, ...heroForgeData.customClasses];
      const allBackgrounds = [...BACKGROUNDS_DATA, ...heroForgeData.customBackgrounds];
      const allSpecies = [...SPECIES_DATA, ...heroForgeData.customSpecies];
      
      const reconstructed = reconstructSheetFromCoreData(coreData, allClasses, allBackgrounds, allSpecies);
      const fullyCalculatedSheet = calculateAllDerivedStats(reconstructed);
      setCharacterSheet(fullyCalculatedSheet);
    } catch (e) {
      console.error("Error procesando hoja de personaje:", e);
      setError("Falló la carga de la hoja de personaje debido a un error.");
    } finally {
      setIsLoading(false);
    }
  }, [characterId, heroForgeData]);

  useEffect(() => {
    if (characterSheet && characterId && !isLoading) {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            const updatedCoreData = convertSheetToCoreData(characterSheet);
            heroForgeDispatch({ type: 'UPDATE_CHARACTER', payload: updatedCoreData });
        }, 500); 
    }
    return () => { 
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, [characterSheet, characterId, isLoading, heroForgeDispatch]);


  useEffect(() => {
      setActiveMainView('characterSheet'); 
  }, [characterId]);

  const handleEquipmentChange = (newEquipment: EquippedItem[]) => {
    setCharacterSheet(prevSheet => {
        if (!prevSheet) return null;
        const updatedSheet = { ...prevSheet, equipment: newEquipment };
        return calculateAllDerivedStats(updatedSheet); 
    });
  };

  const getAbilityDisplayNameShort = (abilityName: AbilityScoreName): string => {
    const map: Record<AbilityScoreName, string> = { Strength: "Fue", Dexterity: "Des", Constitution: "Con", Intelligence: "Int", Wisdom: "Sab", Charisma: "Car"};
    return map[abilityName] || abilityName;
  };
  const getSkillDisplayName = (skillName: SkillName): string => SKILL_DEFINITIONS.find(s => s.name === skillName)?.nombre || skillName;

  const handleInitiativeRoll = () => {
    if (!characterSheet) return;
    const result = performRoll(1, 20, characterSheet.initiative, attackRollMode); // Pass attackRollMode
    setLastRollResult({ ...result, description: `Tirada de Iniciativa${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };
  const handleSavingThrowRoll = (abilityName: AbilityScoreName) => {
    if (!characterSheet?.savingThrows[abilityName]) return;
    const modifier = characterSheet.savingThrows[abilityName]?.value || 0;
    const result = performRoll(1, 20, modifier, attackRollMode); // Pass attackRollMode
    setLastRollResult({ ...result, description: `Tirada de Salvación de ${getAbilityDisplayNameShort(abilityName)}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };
  const handleSkillRoll = (skillName: SkillName) => {
    if (!characterSheet?.skills[skillName]) return;
    const modifier = characterSheet.skills[skillName]?.value || 0;
    const result = performRoll(1, 20, modifier, attackRollMode); // Pass attackRollMode
    setLastRollResult({ ...result, description: `Prueba de ${getSkillDisplayName(skillName)}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };
  const handleAbilityScoreRoll = (abilityName: AbilityScoreName) => {
    if (!characterSheet || characterSheet.abilityScoreModifiers[abilityName] === undefined) return;
    const modifier = characterSheet.abilityScoreModifiers[abilityName];
    const result = performRoll(1, 20, modifier, attackRollMode); // Pass attackRollMode
    setLastRollResult({ ...result, description: `Prueba de ${getAbilityDisplayNameShort(abilityName)}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''}: ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}`});
  };

  const getWeaponAttackDetails = (weapon: EquippedItem, sheet: CharacterSheet): { attackBonus: number; abilityUsed: AbilityScoreName; modifier: number} => {
    if (!weapon.weaponDetails) return { attackBonus: 0, abilityUsed: 'Strength', modifier: 0 };

    let abilityName: AbilityScoreName = 'Strength';
    const props = weapon.weaponDetails.properties;
    
    // Check for ranged weapon type - simple check based on common ranged weapon names or Ammunition property
    const isRangedWeapon = weapon.name.toLowerCase().includes("bow") || 
                           weapon.name.toLowerCase().includes("crossbow") ||
                           weapon.name.toLowerCase().includes("sling") ||
                           weapon.name.toLowerCase().includes("dart") || // Darts are finesse and thrown, use Dex
                           props.includes('Ammunition');

    if (isRangedWeapon) {
        abilityName = 'Dexterity';
    } else if (props.includes('Finesse')) {
        abilityName = 'Dexterity'; // Could also be Strength if higher, but Dex is common for Finesse
    }
    // Thrown property by itself uses Strength, unless Finesse is also present (covered by Finesse check)

    const abilityMod = sheet.abilityScoreModifiers[abilityName] || 0;
    // Basic proficiency check - assumes proficiency with equipped weapons for simplicity
    // A more robust check would verify based on sheet.proficiencies
    const isProficient = true; // Placeholder
    const profBonus = isProficient ? sheet.proficiencyBonus : 0;
    
    return { attackBonus: abilityMod + profBonus, abilityUsed: abilityName, modifier: abilityMod };
  };

  const getWeaponDamageModifier = (weapon: EquippedItem, sheet: CharacterSheet): number => {
    if (!weapon.weaponDetails) return 0;
    // Use the same ability for damage as for attack (excluding proficiency bonus)
    const { modifier } = getWeaponAttackDetails(weapon, sheet);
    return modifier;
  };

  const parseDamageDiceString = (diceString: string): { numDice: number; dieSides: number; bonus: number } => {
    const match = diceString.match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
    if (match) {
      const numDice = parseInt(match[1], 10);
      const dieSides = parseInt(match[2], 10);
      let bonus = 0;
      if (match[3] && match[4]) {
        bonus = parseInt(match[4], 10);
        if (match[3] === '-') {
          bonus *= -1;
        }
      }
      return { numDice, dieSides, bonus };
    }
    return { numDice: 0, dieSides: 0, bonus: 0 }; // Should not happen with valid dice strings
  };

  const handleWeaponAttackRoll = (weapon: EquippedItem) => {
    if (!characterSheet || !weapon.weaponDetails) return;
    const { attackBonus, abilityUsed } = getWeaponAttackDetails(weapon, characterSheet);
    const result = performRoll(1, 20, attackBonus, attackRollMode);
    setLastRollResult({ ...result, description: `Ataque con ${weapon.name}${result.rollModeUsed ? (result.rollModeUsed === 'advantage' ? ' (Ventaja)' : ' (Desventaja)') : ''} (${getAbilityDisplayNameShort(abilityUsed)}): ${result.description.replace(result.rollModeUsed ? / \((Ventaja|Desventaja)\)/ : '', '')}` });
  };

  const handleWeaponDamageRoll = (weapon: EquippedItem, useVersatile: boolean = false) => {
    if (!characterSheet || !weapon.weaponDetails) return;
    const damageDetails = weapon.weaponDetails;
    const diceString = useVersatile && damageDetails.versatileDamage ? damageDetails.versatileDamage : damageDetails.damageDice;
    
    const { numDice, dieSides, bonus: bonusFromDiceString } = parseDamageDiceString(diceString);
    if (numDice === 0) return;

    const abilityDamageModifier = getWeaponDamageModifier(weapon, characterSheet);
    // Total modifier for damage is ability mod + any bonus baked into the dice string (e.g. Flame Tongue "2d6+2 fire")
    const totalDamageModifier = abilityDamageModifier + bonusFromDiceString; 

    // Damage rolls typically don't use advantage/disadvantage unless it's a critical hit (doubling dice)
    const result = performRoll(numDice, dieSides, totalDamageModifier, 'normal'); 
    
    const damageTypeDisplay = DAMAGE_TYPE_ES[damageDetails.damageType] || damageDetails.damageType;
    const versatileTag = useVersatile ? " (Versátil)" : "";
    
    setLastRollResult({ ...result, description: `Daño con ${weapon.name}${versatileTag} (${damageTypeDisplay}): ${result.description}` });
  };


  const handleMouseEnterTrait = (trait: Trait, event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
    setActiveTooltipTrait(trait);
    setTraitTooltipPosition({ top: event.clientY + 15, left: event.clientX + 15 });
  };

  const handleMouseMoveTrait = (event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
    if (activeTooltipTrait && traitTooltipRef.current) {
      let newTop = event.clientY + 15;
      let newLeft = event.clientX + 15;
      const tooltipRect = traitTooltipRef.current.getBoundingClientRect();
      
      if (newLeft + tooltipRect.width > window.innerWidth - 10) { 
          newLeft = event.clientX - tooltipRect.width - 15;
      }
      if (newTop + tooltipRect.height > window.innerHeight - 10) { 
          newTop = event.clientY - tooltipRect.height - 15;
      }
      setTraitTooltipPosition({ top: newTop, left: newLeft });
    }
  };

  const handleMouseLeaveTrait = () => {
    setActiveTooltipTrait(null);
  };

  if (isLoading) return <div className="text-center p-10 text-slate-700 dark:text-slate-300">Cargando hoja de personaje...</div>;
  if (error) return (
    <div className="text-center p-10 text-red-600 dark:text-red-400">
      <p>{error}</p>
      <Link to="/character-manager" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700">
        <ArrowLeftIcon className="h-5 w-5 mr-2" /> Volver al Gestor
      </Link>
    </div>
  );
  if (!characterSheet) return <div className="text-center p-10 text-slate-700 dark:text-slate-300">No se pudo cargar la hoja de personaje.</div>;

  const alignmentDisplay = characterSheet.alignment ? ALIGNMENT_ES_MAP[characterSheet.alignment] : 'No Establecido';
  const equippedWeapons = characterSheet.equipment.filter(item => item.equipped && item.category === 'Weapon' && item.weaponDetails);


  return (
    <div className="container mx-auto p-4 md:p-6 max-w-full xl:max-w-screen-xl"> 
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg">
            <div className="flex flex-col md:flex-row w-full min-h-[calc(100vh-150px)]"> 
                {/* Left Combat Actions Panel */}
                <div className="w-full md:w-[320px] md:flex-shrink-0 p-3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[40vh] md:max-h-none custom-scrollbar">
                    <h2 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3 sticky top-0 bg-white dark:bg-slate-800 py-1 z-10">Acciones de Combate</h2>
                    
                    <div className="mb-4 space-y-1">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Modo de Tirada d20:</label>
                        <div className="flex rounded-md shadow-sm bg-slate-100 dark:bg-slate-700 p-0.5">
                            {(['advantage', 'normal', 'disadvantage'] as AttackRollMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setAttackRollMode(mode)}
                                    className={`flex-1 px-2 py-1 text-xs rounded-sm transition-colors
                                        ${attackRollMode === mode 
                                            ? (mode === 'advantage' ? 'bg-green-500 text-white' : mode === 'disadvantage' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white')
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {mode === 'advantage' ? 'Ventaja' : mode === 'disadvantage' ? 'Desventaja' : 'Normal'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {lastRollResult && (
                        <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow text-center text-xs">
                            <p className="text-purple-600 dark:text-purple-300 font-semibold">{lastRollResult.description}</p>
                            <p className="text-slate-800 dark:text-slate-200 text-lg font-bold">Total: {lastRollResult.total}</p>
                            <p className="text-2xs text-slate-500 dark:text-slate-400">
                            (Dados: [{lastRollResult.individualRolls.join(', ')}] Suma: {lastRollResult.diceSum} 
                            {lastRollResult.modifier !== 0 ? `, Mod: ${lastRollResult.modifier > 0 ? '+' : ''}${lastRollResult.modifier}` : ''})
                            </p>
                        </div>
                    )}

                    <h3 className="text-md font-medium text-purple-600 dark:text-purple-200 mb-1.5 mt-3">Armas Equipadas</h3>
                    {equippedWeapons.length > 0 ? (
                        <ul className="space-y-2">
                            {equippedWeapons.map(weapon => {
                                const { attackBonus } = getWeaponAttackDetails(weapon, characterSheet);
                                const damageMod = getWeaponDamageModifier(weapon, characterSheet);
                                const damageTypeDisplay = weapon.weaponDetails ? DAMAGE_TYPE_ES[weapon.weaponDetails.damageType] || weapon.weaponDetails.damageType : '';
                                return (
                                    <li key={weapon.instanceId} className="p-2 bg-slate-50 dark:bg-slate-700/30 rounded-md shadow-sm text-xs">
                                        <button 
                                            onClick={() => handleWeaponAttackRoll(weapon)} 
                                            className="font-semibold text-slate-800 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer text-left w-full block mb-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded"
                                            title={`Atacar con ${weapon.name}`}
                                        >
                                            {weapon.name}
                                        </button>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Ataque: {attackBonus >= 0 ? '+' : ''}{attackBonus} | 
                                            Daño: {weapon.weaponDetails?.damageDice}{damageMod !== 0 ? (damageMod > 0 ? `+${damageMod}` : `${damageMod}`) : ''} {damageTypeDisplay}
                                            {weapon.weaponDetails?.versatileDamage && ` (V: ${weapon.weaponDetails.versatileDamage}${damageMod !== 0 ? (damageMod > 0 ? `+${damageMod}` : `${damageMod}`) : ''})`}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            <button onClick={() => handleWeaponAttackRoll(weapon)} className="flex-1 text-2xs px-1.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded min-w-[50px]">Ataque</button>
                                            <button onClick={() => handleWeaponDamageRoll(weapon, false)} className="flex-1 text-2xs px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded min-w-[50px]">Daño</button>
                                            {weapon.weaponDetails?.versatileDamage && (
                                                <button onClick={() => handleWeaponDamageRoll(weapon, true)} className="flex-1 text-2xs px-1.5 py-0.5 bg-orange-500 hover:bg-orange-400 text-white rounded min-w-[50px]">Daño (V)</button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">Ninguna arma equipada.</p>
                    )}
                </div>
                
                {/* Main Content Area */}
                <div className="flex-grow p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[60vh] md:max-h-none custom-scrollbar"> 
                    <div className="mb-6 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-purple-700 dark:text-purple-400">{characterSheet.name || "Personaje sin Nombre"}</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            Nivel {characterSheet.level} {characterSheet.species?.name} {characterSheet.class?.name}
                        </p>
                         <p className="text-slate-500 dark:text-slate-400 text-xs"> Alineamiento: {alignmentDisplay} </p>
                    </div>
                    
                    {activeMainView === 'characterSheet' && (
                        <CharacterSummary 
                            sheet={characterSheet} 
                            onInitiativeClick={handleInitiativeRoll}
                            onSavingThrowClick={handleSavingThrowRoll}
                            onSkillClick={handleSkillRoll}
                            onAbilityScoreClick={handleAbilityScoreRoll}
                            onFeatureTraitMouseEnter={handleMouseEnterTrait}
                            onFeatureTraitMouseMove={handleMouseMoveTrait}
                            onFeatureTraitMouseLeave={handleMouseLeaveTrait}
                        />
                    )}
                    {activeMainView === 'inventory' && characterId && (
                        <InventoryTabContent 
                            characterSheet={characterSheet} 
                            heroForgeData={heroForgeData}
                            characterId={characterId}
                            heroForgeDispatch={heroForgeDispatch}
                            onEquipmentChange={handleEquipmentChange}
                        />
                    )}
                    {activeMainView === 'spells' && (
                        <SpellsTabContent characterSheet={characterSheet} />
                    )}
                    {activeMainView === 'notes' && (
                        <NotesTabContent characterSheet={characterSheet} />
                    )}
                </div>

                {/* Right Tabs */}
                <div className="w-full md:w-[80px] md:flex-shrink-0 flex md:flex-col bg-white dark:bg-slate-800"> 
                    <div className="flex md:flex-col space-x-0.5 md:space-x-0 md:space-y-0.5 pt-0 md:pt-2 flex-grow"> 
                        <TabButton label="Hoja" icon={UserCircleIcon} isActive={activeMainView === 'characterSheet'} onClick={() => setActiveMainView('characterSheet')} />
                        <TabButton label="Inv." icon={ArchiveBoxIcon} isActive={activeMainView === 'inventory'} onClick={() => setActiveMainView('inventory')} />
                        {characterSheet.class?.spellcasting && (
                            <TabButton label="Hechizos" icon={SpellsIcon} isActive={activeMainView === 'spells'} onClick={() => setActiveMainView('spells')} />
                        )}
                        <TabButton label="Notas" icon={DocumentTextIcon} isActive={activeMainView === 'notes'} onClick={() => setActiveMainView('notes')} />
                    </div>
                </div>
            </div>
            <div className="p-4 text-center border-t border-slate-200 dark:border-slate-700">
                <Link 
                    to="/character-manager"
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-purple-500"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Volver al Gestor de Personajes
                </Link>
            </div>
        </div>
        {activeTooltipTrait && (
            <div
                ref={traitTooltipRef}
                className="fixed bg-slate-100 dark:bg-slate-900 border border-purple-500 rounded-md shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 z-[100] max-w-md pointer-events-none"
                style={{ top: traitTooltipPosition.top, left: traitTooltipPosition.left, transform: 'translateY(-100%)' }}
                aria-live="polite"
                role="tooltip"
            >
                <h6 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1.5 flex items-center">
                   <InformationCircleIcon className="h-4 w-4 mr-1 text-purple-500 dark:text-purple-400"/> {activeTooltipTrait.name}
                </h6>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{activeTooltipTrait.description}</p>
                 {activeTooltipTrait.source && <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 italic">Fuente: {activeTooltipTrait.source}</p>}
            </div>
        )}
        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1; /* slate-300 */
                border-radius: 3px;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #475569; /* slate-600 */
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8; /* slate-400 */
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #64748b; /* slate-500 */
            }
        `}</style>
    </div>
  );
};

export default ViewCharacterSheet;

import { Alignment } from '../types';
