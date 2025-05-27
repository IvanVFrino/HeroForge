import React, { useState, useRef } from 'react';
import { 
    CharacterSheet, HeroForgeData, HeroForgeAction, ItemCategory, EquippedItem, 
    ITEM_CATEGORIES, DAMAGE_TYPES_CONST, WEAPON_PROPERTIES_CONST, ARMOR_TYPES_CONST, 
    DamageType, WeaponProperty, ArmorType 
} from '../../types';
import { PlusCircleIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const ITEM_CATEGORY_ES: Record<ItemCategory, string> = { Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo' };
const DAMAGE_TYPE_ES: Record<DamageType, string> = { Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico' };
const WEAPON_PROPERTY_ES: Record<WeaponProperty, string> = { Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera', Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial', Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil' };
const ARMOR_TYPE_ES: Record<ArmorType, string> = { Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada' };

// Fix: Added AttackRollMode type, assuming it's defined elsewhere or should be added to types.ts if not.
// For now, let's assume it's part of a global types or imported from a shared location.
// If not, it should be: type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';
type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';


interface InventoryTabContentProps {
    characterSheet: CharacterSheet;
    heroForgeData: HeroForgeData;
    characterId: string;
    heroForgeDispatch: React.Dispatch<HeroForgeAction>;
    onEquipmentChange: (newEquipment: EquippedItem[]) => void;
    // Fix: Add missing props onPerformRoll and attackRollMode
    onPerformRoll: (description: string, dice: number, sides: number, modifier: number, mode?: AttackRollMode) => void;
    attackRollMode: AttackRollMode;
}

const InventoryTabContent: React.FC<InventoryTabContentProps> = ({
    characterSheet, heroForgeData, characterId, heroForgeDispatch, onEquipmentChange,
    // Fix: Destructure the new props
    onPerformRoll, attackRollMode,
}) => {
    const [selectedCustomItemId, setSelectedCustomItemId] = useState<string>('');
    const [addItemQuantity, setAddItemQuantity] = useState<number>(1);
    const [filterCategory, setFilterCategory] = useState<ItemCategory | 'All'>('All');
    const [searchNameQuery, setSearchNameQuery] = useState<string>('');

    const [activeTooltipItem, setActiveTooltipItem] = useState<EquippedItem | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const shouldShowTooltip = (item: EquippedItem): boolean => {
        return !!(item.weaponDetails || item.armorDetails || (item.description && item.description.length > 30) || item.cost || item.weight); 
    };

    const handleMouseEnterItem = (item: EquippedItem, event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
        if (shouldShowTooltip(item)) {
            setActiveTooltipItem(item);
            setTooltipPosition({ top: event.clientY + 15, left: event.clientX + 15 });
        }
    };
    
    const handleMouseMoveItem = (event: React.MouseEvent<HTMLLIElement | HTMLButtonElement>) => {
        if (activeTooltipItem && tooltipRef.current) {
            let newTop = event.clientY + 15;
            let newLeft = event.clientX + 15;
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            if (newLeft + tooltipRect.width > window.innerWidth - 10) newLeft = event.clientX - tooltipRect.width - 15;
            if (newTop + tooltipRect.height > window.innerHeight - 10) newTop = event.clientY - tooltipRect.height - 15;
            setTooltipPosition({ top: newTop, left: newLeft });
        }
    };
    
    const handleMouseLeaveItem = () => setActiveTooltipItem(null);

    const handleAddItemToInventory = () => {
        if (!selectedCustomItemId || addItemQuantity <= 0 || !characterId) {
            alert("Por favor, selecciona un objeto y especifica una cantidad válida."); return;
        }
        const itemDefinition = heroForgeData.customItems.find(item => item.id === selectedCustomItemId);
        if (!itemDefinition) { alert("Objeto personalizado seleccionado no encontrado."); return; }
        
        let newEquipmentList = [...characterSheet.equipment];
        const existingItemIndex = newEquipmentList.findIndex(eq => eq.definitionId === itemDefinition.id && eq.source === 'CustomAddedSheet');

        if (existingItemIndex !== -1) {
            newEquipmentList[existingItemIndex] = { ...newEquipmentList[existingItemIndex], quantity: newEquipmentList[existingItemIndex].quantity + addItemQuantity };
        } else {
            newEquipmentList.push({
                instanceId: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 5)}`,
                definitionId: itemDefinition.id, name: itemDefinition.name, category: itemDefinition.category, quantity: addItemQuantity,
                description: itemDefinition.description, cost: itemDefinition.cost, weight: itemDefinition.weight,
                weaponDetails: itemDefinition.weaponDetails, armorDetails: itemDefinition.armorDetails, source: 'CustomAddedSheet', 
            });
        }
        onEquipmentChange(newEquipmentList);
        setSelectedCustomItemId(''); setAddItemQuantity(1); setFilterCategory('All'); setSearchNameQuery('');
    };

    const handleEquipItem = (instanceIdToEquip: string) => {
        const equipTarget = characterSheet.equipment.find(e => e.instanceId === instanceIdToEquip);
        if (!equipTarget) return;
    
        let newEquipment = characterSheet.equipment.map(e => ({ ...e })); 
    
        if (equipTarget.category === 'Armor') {
            const isEquipTargetBodyArmor = equipTarget.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(equipTarget.armorDetails.armorType);
            const isEquipTargetShield = equipTarget.armorDetails && !equipTarget.armorDetails.armorType;
    
            if (isEquipTargetBodyArmor) newEquipment.forEach(item => { if (item.category === 'Armor' && item.armorDetails?.armorType && ['Light', 'Medium', 'Heavy'].includes(item.armorDetails.armorType) && item.instanceId !== equipTarget.instanceId) item.equipped = false; });
            if (isEquipTargetShield) {
                newEquipment.forEach(item => {
                    if (item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType && item.instanceId !== equipTarget.instanceId) item.equipped = false;
                    if (item.category === 'Weapon' && item.weaponDetails?.properties.includes('Two-Handed')) item.equipped = false;
                });
            }
        } else if (equipTarget.category === 'Weapon') {
            const isEquipTargetTwoHanded = equipTarget.weaponDetails?.properties.includes('Two-Handed');
            if (isEquipTargetTwoHanded) {
                newEquipment.forEach(item => {
                    if (item.category === 'Weapon' && item.instanceId !== equipTarget.instanceId) item.equipped = false; 
                    if (item.category === 'Armor' && item.armorDetails && !item.armorDetails.armorType) item.equipped = false; 
                });
            } else { 
                newEquipment.forEach(item => { if (item.category === 'Weapon' && item.weaponDetails?.properties.includes('Two-Handed')) item.equipped = false; });
                const currentlyEquippedShield = newEquipment.find(e => e.equipped && e.category === 'Armor' && e.armorDetails && !e.armorDetails.armorType);
                let currentlyEquippedOneHandedWeapons = newEquipment.filter(e => e.equipped && e.category === 'Weapon' && e.instanceId !== equipTarget.instanceId && !e.weaponDetails?.properties.includes('Two-Handed'));
    
                if (currentlyEquippedShield) { 
                    currentlyEquippedOneHandedWeapons.forEach(w => { const weaponToUnequip = newEquipment.find(eq => eq.instanceId === w.instanceId); if(weaponToUnequip) weaponToUnequip.equipped = false; });
                } else { 
                    if (!equipTarget.weaponDetails?.properties.includes('Light')) { 
                        currentlyEquippedOneHandedWeapons.forEach(w => { const weaponToUnequip = newEquipment.find(eq => eq.instanceId === w.instanceId); if(weaponToUnequip) weaponToUnequip.equipped = false; });
                    } else { 
                        const otherLightWeapons = currentlyEquippedOneHandedWeapons.filter(w => w.weaponDetails?.properties.includes('Light'));
                        const otherNonLight1HWeapons = currentlyEquippedOneHandedWeapons.filter(w => !w.weaponDetails?.properties.includes('Light'));
                        if (otherNonLight1HWeapons.length > 0) { const weaponToUnequip = newEquipment.find(eq => eq.instanceId === otherNonLight1HWeapons[0].instanceId); if(weaponToUnequip) weaponToUnequip.equipped = false;}
                        else if (otherLightWeapons.length >= 1 && otherLightWeapons.length >=2) { const firstLightToUnequip = newEquipment.find(eq => eq.instanceId === otherLightWeapons[0].instanceId); if(firstLightToUnequip) firstLightToUnequip.equipped = false; }
                    }
                }
            }
        }
        const finalTargetItem = newEquipment.find(e => e.instanceId === equipTarget.instanceId);
        if (finalTargetItem) finalTargetItem.equipped = true;
        onEquipmentChange(newEquipment);
    };

    const handleUnequipItem = (instanceIdToUnequip: string) => {
        onEquipmentChange(characterSheet.equipment.map(item => item.instanceId === instanceIdToUnequip ? { ...item, equipped: false } : item));
    };

    const groupedInventory = characterSheet.equipment.reduce<Record<ItemCategory, EquippedItem[]>>((acc, item) => {
        (acc[item.category] = acc[item.category] || []).push(item);
        return acc;
    }, {} as Record<ItemCategory, EquippedItem[]>);

    const filteredCustomItems = heroForgeData.customItems.filter(item => 
        (filterCategory === 'All' || item.category === filterCategory) && 
        (!searchNameQuery || item.name.toLowerCase().includes(searchNameQuery.toLowerCase()))
    );

    return (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 p-2"> 
            <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Inventario</h3>
            <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-200 mb-1">Oro: <span className="font-normal text-yellow-600 dark:text-yellow-400">{characterSheet.gold} po</span></h4>
            {characterSheet.equipment.length === 0 && characterSheet.gold === 0 ? (
                <p className="italic text-slate-500 dark:text-slate-400">Inventario vacío.</p>
            ) : (
                Object.entries(groupedInventory).sort(([catA], [catB]) => ITEM_CATEGORIES.indexOf(catA as ItemCategory) - ITEM_CATEGORIES.indexOf(catB as ItemCategory)).map(([category, items]) => (
                    <div key={category} className="mt-1">
                        <h5 className="text-md font-semibold text-purple-600 dark:text-purple-200 capitalize">{ITEM_CATEGORY_ES[category as ItemCategory]}</h5>
                        <ul className="list-none pl-0 space-y-0.5">
                            {items.map(item => (
                                <li key={item.instanceId} className={`flex items-center justify-between p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group ${item.equipped ? 'border border-green-500 bg-green-50 dark:bg-green-900/30' : 'border border-transparent'}`}
                                    onMouseEnter={(e) => handleMouseEnterItem(item, e)} onMouseMove={handleMouseMoveItem} onMouseLeave={handleMouseLeaveItem} >
                                    <span className="flex-grow cursor-default text-slate-800 dark:text-slate-200">
                                        {item.name} (x{item.quantity})
                                        {item.equipped && <span className="text-green-600 dark:text-green-400 text-2xs ml-1">(Equipado)</span>}
                                        {item.description && !shouldShowTooltip(item) && item.description.length <= 30 && <span className="text-2xs text-slate-500 dark:text-slate-400 italic ml-1">- {item.description}</span>}
                                    </span>
                                    {(item.category === 'Armor' || item.category === 'Weapon') && (
                                        item.equipped ? ( <button onClick={() => handleUnequipItem(item.instanceId)} className="px-1.5 py-0.5 text-2xs bg-yellow-600 hover:bg-yellow-500 text-white rounded opacity-80 group-hover:opacity-100 transition-opacity" title={`Desequipar ${item.name}`}>Desequipar</button> ) 
                                        : ( <button onClick={() => handleEquipItem(item.instanceId)} className="px-1.5 py-0.5 text-2xs bg-sky-600 hover:bg-sky-500 text-white rounded opacity-80 group-hover:opacity-100 transition-opacity" title={`Equipar ${item.name}`}>Equipar</button> )
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
            {activeTooltipItem && (
                <div ref={tooltipRef} className="fixed bg-slate-50 dark:bg-slate-900 border border-purple-500 rounded-md shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 z-[100] max-w-sm pointer-events-none" style={{ top: tooltipPosition.top, left: tooltipPosition.left, transform: 'translateY(-100%)' }} aria-live="polite">
                    <h6 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1.5">{activeTooltipItem.name}</h6>
                    <p className="italic text-slate-500 dark:text-slate-400 text-2xs mb-2 capitalize">({ITEM_CATEGORY_ES[activeTooltipItem.category]})</p>
                    {activeTooltipItem.description && <p className="mb-2 text-slate-700 dark:text-slate-300">{activeTooltipItem.description}</p>}
                    {activeTooltipItem.weaponDetails && ( <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-0.5"> <p><strong>Daño:</strong> {activeTooltipItem.weaponDetails.damageDice} {DAMAGE_TYPE_ES[activeTooltipItem.weaponDetails.damageType]}</p> {activeTooltipItem.weaponDetails.properties.length > 0 && <p><strong>Propiedades:</strong> {activeTooltipItem.weaponDetails.properties.map(p => WEAPON_PROPERTY_ES[p]).join(', ')}</p>} {(activeTooltipItem.weaponDetails.rangeNormal || activeTooltipItem.weaponDetails.rangeLong) && <p><strong>Alcance:</strong> {activeTooltipItem.weaponDetails.rangeNormal || '-'}/{activeTooltipItem.weaponDetails.rangeLong || '-'} pies</p>} {activeTooltipItem.weaponDetails.versatileDamage && <p><strong>Versátil:</strong> {activeTooltipItem.weaponDetails.versatileDamage}</p>} </div> )}
                    {activeTooltipItem.armorDetails && ( <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-0.5"> <p><strong>CA Base:</strong> {activeTooltipItem.armorDetails.baseAC}</p> {activeTooltipItem.armorDetails.armorType && <p><strong>Tipo:</strong> {ARMOR_TYPE_ES[activeTooltipItem.armorDetails.armorType]}</p>} <p><strong>Añadir Mod. Des:</strong> {activeTooltipItem.armorDetails.addDexModifier ? 'Sí' : 'No'}</p> {activeTooltipItem.armorDetails.addDexModifier && activeTooltipItem.armorDetails.maxDexBonus !== undefined && <p><strong>Bon. Máx. Des:</strong> {activeTooltipItem.armorDetails.maxDexBonus === null || activeTooltipItem.armorDetails.maxDexBonus < 0 ? 'Ninguno' : `+${activeTooltipItem.armorDetails.maxDexBonus}`}</p>} {activeTooltipItem.armorDetails.strengthRequirement && activeTooltipItem.armorDetails.strengthRequirement > 0 && <p><strong>Req. Fuerza:</strong> {activeTooltipItem.armorDetails.strengthRequirement}</p>} {activeTooltipItem.armorDetails.stealthDisadvantage && <p className="text-red-600 dark:text-red-400">Desventaja en Sigilo</p>} </div> )}
                    {(activeTooltipItem.cost || activeTooltipItem.weight) && ( <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-2xs text-slate-500 dark:text-slate-400 space-y-0.5"> {activeTooltipItem.cost && <p>Costo: {typeof activeTooltipItem.cost === 'string' ? activeTooltipItem.cost : `${activeTooltipItem.cost.quantity} ${activeTooltipItem.cost.unit}`}</p>} {activeTooltipItem.weight && <p>Peso: {typeof activeTooltipItem.weight === 'string' ? activeTooltipItem.weight : `${activeTooltipItem.weight.value} ${activeTooltipItem.weight.unit}`}</p>} </div> )}
                </div>
            )}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-200 mb-2">Añadir Objeto Personalizado</h4>
                {heroForgeData.customItems.length === 0 ? ( <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay objetos personalizados. Créalos en el Creador de Contenido.</p> ) 
                : ( <div className="space-y-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div> <label htmlFor="filterCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 flex items-center"><FunnelIcon className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400"/> Filtrar por Categoría:</label> <select id="filterCategory" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as ItemCategory | 'All')} className="w-full p-2 text-sm bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"> <option value="All">Todas las Categorías</option> {ITEM_CATEGORIES.map(cat => (<option key={cat} value={cat}>{ITEM_CATEGORY_ES[cat]}</option>))} </select> </div>
                            <div> <label htmlFor="searchNameQuery" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 flex items-center"><MagnifyingGlassIcon className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400"/> Buscar por Nombre:</label> <input type="text" id="searchNameQuery" value={searchNameQuery} onChange={(e) => setSearchNameQuery(e.target.value)} placeholder="Escribe para buscar..." className="w-full p-2 text-sm bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"/> </div>
                        </div>
                        <div> <label htmlFor="customItemSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">Objeto:</label> <select id="customItemSelect" value={selectedCustomItemId} onChange={(e) => setSelectedCustomItemId(e.target.value)} className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"> <option value="">-- Seleccionar --</option> {filteredCustomItems.map(item => (<option key={item.id} value={item.id}>{item.name} ({ITEM_CATEGORY_ES[item.category]})</option>))} </select> </div>
                        <div> <label htmlFor="addItemQuantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">Cantidad:</label> <input type="number" id="addItemQuantity" value={addItemQuantity} onChange={(e) => setAddItemQuantity(parseInt(e.target.value, 10) || 1)} min="1" className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:ring-purple-500 focus:border-purple-500"/> </div>
                        <button onClick={handleAddItemToInventory} disabled={!selectedCustomItemId || addItemQuantity <= 0} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed"> <PlusCircleIcon className="h-5 w-5 mr-2" /> Añadir al Inventario </button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default InventoryTabContent;