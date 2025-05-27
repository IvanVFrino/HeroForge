
// components/content_creator/form_parts/BundleItemCreator.tsx
import React, { useState, useEffect } from 'react';
import { StartingEquipmentItem, ItemCategory, ITEM_CATEGORIES, WeaponDetails, ArmorDetails, DamageType, WeaponProperty, ArmorType } from '../../../types';
import { WEAPON_PROPERTIES_LIST, DAMAGE_TYPES_LIST, ARMOR_TYPES_LIST } from '../../../constants/items';

const ITEM_CATEGORY_ES: Record<ItemCategory, string> = { Weapon: 'Arma', Armor: 'Armadura', Miscellaneous: 'Misceláneo' };
const DAMAGE_TYPE_ES: Record<DamageType, string> = { Slashing: 'Cortante', Piercing: 'Perforante', Bludgeoning: 'Contundente', Fire: 'Fuego', Cold: 'Frío', Acid: 'Ácido', Poison: 'Veneno', Radiant: 'Radiante', Necrotic: 'Necrótico', Lightning: 'Rayo', Thunder: 'Trueno', Force: 'Fuerza', Psychic: 'Psíquico' };
const WEAPON_PROPERTY_ES: Record<WeaponProperty, string> = { Ammunition: 'Munición', Finesse: 'Sutileza', Heavy: 'Pesada', Light: 'Ligera', Loading: 'Carga', Range: 'Distancia', Reach: 'Alcance', Special: 'Especial', Thrown: 'Arrojadiza', 'Two-Handed': 'A Dos Manos', Versatile: 'Versátil' };
const ARMOR_TYPE_ES: Record<ArmorType, string> = { Light: 'Ligera', Medium: 'Media', Heavy: 'Pesada' };

const initialMiniItemState: Omit<StartingEquipmentItem, 'name' | 'quantity'> = {
    category: 'Miscellaneous', description: '', cost: '', weight: '',
    weaponDetails: undefined, armorDetails: undefined,
};

interface BundleItemCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveItem: (item: StartingEquipmentItem) => void;
    initialItemData?: StartingEquipmentItem | null;
}

const BundleItemCreator: React.FC<BundleItemCreatorProps> = ({ isOpen, onClose, onSaveItem, initialItemData }) => {
    const [itemName, setItemName] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemDetails, setItemDetailsState] = useState<Omit<StartingEquipmentItem, 'name' | 'quantity'>>(initialMiniItemState);

    useEffect(() => {
        if (initialItemData) {
            setItemName(initialItemData.name);
            setItemQty(initialItemData.quantity);
            setItemDetailsState({
                category: initialItemData.category || 'Miscellaneous',
                description: initialItemData.description || '',
                cost: initialItemData.cost || '',
                weight: initialItemData.weight || '',
                weaponDetails: initialItemData.weaponDetails,
                armorDetails: initialItemData.armorDetails,
            });
        } else {
            setItemName('');
            setItemQty(1);
            setItemDetailsState({...initialMiniItemState});
        }
    }, [initialItemData, isOpen]); // Re-initialize when opened or initial data changes

    if (!isOpen) return null;

    const handleSave = () => {
        if (!itemName.trim() || itemQty <= 0) {
            alert("Nombre del objeto y cantidad son requeridos.");
            return;
        }
        let finalWeaponDetails: WeaponDetails | undefined = undefined;
        if (itemDetails.category === 'Weapon') {
            if (!itemDetails.weaponDetails?.damageDice?.trim() || !itemDetails.weaponDetails?.damageType) {
                alert('Para armas, se requieren dados de daño y tipo de daño.'); return;
            }
            finalWeaponDetails = { ...itemDetails.weaponDetails };
        }

        let finalArmorDetails: ArmorDetails | undefined = undefined;
        if (itemDetails.category === 'Armor') {
            if (itemDetails.armorDetails?.baseAC === undefined || itemDetails.armorDetails.baseAC < 0) {
                 alert('Para armaduras, se requiere CA Base y debe ser no negativa.'); return;
            }
            finalArmorDetails = { ...itemDetails.armorDetails };
        }

        const newItem: StartingEquipmentItem = {
            name: itemName.trim(),
            quantity: itemQty,
            category: itemDetails.category,
            description: itemDetails.description?.trim() || undefined,
            cost: typeof itemDetails.cost === 'string' ? itemDetails.cost.trim() || undefined : itemDetails.cost,
            weight: typeof itemDetails.weight === 'string' ? itemDetails.weight.trim() || undefined : itemDetails.weight,
            weaponDetails: finalWeaponDetails,
            armorDetails: finalArmorDetails,
        };
        onSaveItem(newItem);
        onClose(); // Close after saving
    };
    
    // Simplified input field style for brevity in this example
    const inputStyle = "input-field-small"; 

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar-thin" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">{initialItemData ? "Editar Objeto del Lote" : "Añadir Objeto al Lote"}</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="col-span-2">
                        <label htmlFor="bundleItemNameModal" className="block text-xs font-medium">Nombre*</label>
                        <input type="text" id="bundleItemNameModal" value={itemName} onChange={e => setItemName(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="bundleItemQtyModal" className="block text-xs font-medium">Cantidad*</label>
                        <input type="number" id="bundleItemQtyModal" value={itemQty} min="1" onChange={e => setItemQty(parseInt(e.target.value) || 1)} className={inputStyle} />
                    </div>
                </div>
                <div className="mb-3">
                    <label htmlFor="bundleItemCategoryModal" className="block text-xs font-medium">Categoría</label>
                    <select id="bundleItemCategoryModal" value={itemDetails.category} 
                        onChange={e => {
                            const newCategory = e.target.value as ItemCategory;
                            const defaultWeaponDetails: WeaponDetails = { damageDice: '', damageType: DAMAGE_TYPES_LIST[0], properties: [] };
                            const defaultArmorDetails: ArmorDetails = { baseAC: undefined, addDexModifier: true, armorType: 'Light' };
                            setItemDetailsState(prev => ({
                                ...prev, 
                                category: newCategory, 
                                weaponDetails: newCategory === 'Weapon' ? (prev.weaponDetails || defaultWeaponDetails) : undefined, 
                                armorDetails: newCategory === 'Armor' ? (prev.armorDetails || defaultArmorDetails) : undefined 
                            }));
                        }} 
                        className={inputStyle}>
                        {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{ITEM_CATEGORY_ES[cat]}</option>)}
                    </select>
                </div>
                <div className="mb-3"> <label htmlFor="bundleItemDescModal" className="block text-xs font-medium">Descripción</label> <textarea id="bundleItemDescModal" value={itemDetails.description || ''} onChange={e => setItemDetailsState({...itemDetails, description: e.target.value})} rows={2} className={inputStyle}/> </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div><label htmlFor="bundleItemCostModal" className="block text-xs font-medium">Costo (ej: 10 gp)</label><input type="text" id="bundleItemCostModal" value={itemDetails.cost as string || ''} onChange={e => setItemDetailsState({...itemDetails, cost: e.target.value})} className={inputStyle}/></div>
                    <div><label htmlFor="bundleItemWeightModal" className="block text-xs font-medium">Peso (ej: 5 lb)</label><input type="text" id="bundleItemWeightModal" value={itemDetails.weight as string || ''} onChange={e => setItemDetailsState({...itemDetails, weight: e.target.value})} className={inputStyle}/></div>
                </div>
                {itemDetails.category === 'Weapon' && (
                    <fieldset className="form-subsection border-purple-400 dark:border-purple-600 mb-3">
                        <legend className="legend-title-small text-purple-600 dark:text-purple-400">Detalles de Arma</legend>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-2xs">Dados Daño*</label><input type="text" value={itemDetails.weaponDetails?.damageDice || ''} onChange={e=>setItemDetailsState({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, damageDice:e.target.value}})} className={inputStyle}/></div>
                            <div><label className="text-2xs">Tipo Daño*</label><select value={itemDetails.weaponDetails?.damageType || DAMAGE_TYPES_LIST[0]} onChange={e=>setItemDetailsState({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, damageType:e.target.value as DamageType}})} className={inputStyle}>{DAMAGE_TYPES_LIST.map(dt=><option key={dt} value={dt}>{DAMAGE_TYPE_ES[dt]}</option>)}</select></div>
                        </div>
                        <label className="text-2xs mt-1 block">Propiedades</label>
                        <div className="grid grid-cols-2 gap-1 text-2xs">
                            {WEAPON_PROPERTIES_LIST.map(prop => <label key={prop} className="checkbox-label-small"><input type="checkbox" checked={itemDetails.weaponDetails?.properties?.includes(prop)} onChange={() => { const oldProps = itemDetails.weaponDetails?.properties || []; const newProps = oldProps.includes(prop) ? oldProps.filter(p=>p!==prop) : [...oldProps, prop]; setItemDetailsState({...itemDetails, weaponDetails: {...itemDetails.weaponDetails!, properties: newProps}});}} className="checkbox-input-small"/>{WEAPON_PROPERTY_ES[prop]}</label>)}
                        </div>
                    </fieldset>
                )}
                {itemDetails.category === 'Armor' && (
                    <fieldset className="form-subsection border-sky-400 dark:border-sky-600 mb-3">
                        <legend className="legend-title-small text-sky-600 dark:text-sky-400">Detalles de Armadura</legend>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-2xs">CA Base*</label><input type="number" placeholder="Ej: 12" value={itemDetails.armorDetails?.baseAC === undefined ? '' : itemDetails.armorDetails.baseAC} onChange={e=>setItemDetailsState({...itemDetails, armorDetails: {...itemDetails.armorDetails!, baseAC: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className={inputStyle}/></div>
                            <div><label className="text-2xs">Tipo Armadura</label><select value={itemDetails.armorDetails?.armorType || ''} onChange={e=>setItemDetailsState({...itemDetails, armorDetails: {...itemDetails.armorDetails!, armorType:e.target.value as ArmorType || undefined}})} className={inputStyle}><option value="">Genérica/Escudo</option>{ARMOR_TYPES_LIST.map(at=><option key={at} value={at}>{ARMOR_TYPE_ES[at]}</option>)}</select></div>
                        </div>
                        <label className="checkbox-label-small mt-1"><input type="checkbox" checked={itemDetails.armorDetails?.addDexModifier} onChange={e=>setItemDetailsState({...itemDetails, armorDetails: {...itemDetails.armorDetails!, addDexModifier: e.target.checked}})} className="checkbox-input-small"/>Añadir Mod. Destreza</label>
                        {itemDetails.armorDetails?.addDexModifier && <div><label className="text-2xs">Max Dex Bonus (0 o vacío si no hay)</label><input type="number" min="0" value={itemDetails.armorDetails?.maxDexBonus ?? ''} onChange={e=>setItemDetailsState({...itemDetails, armorDetails: {...itemDetails.armorDetails!, maxDexBonus: e.target.value === '' ? undefined : parseInt(e.target.value)}})} className={inputStyle}/></div>}
                        <label className="checkbox-label-small mt-1"><input type="checkbox" checked={itemDetails.armorDetails?.stealthDisadvantage} onChange={e=>setItemDetailsState({...itemDetails, armorDetails: {...itemDetails.armorDetails!, stealthDisadvantage: e.target.checked}})} className="checkbox-input-small"/>Desventaja Sigilo</label>
                    </fieldset>
                )}
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={onClose} className="btn-secondary-small">Cancelar</button>
                    <button type="button" onClick={handleSave} className="btn-primary-small">Guardar Objeto</button>
                </div>
            </div>
        </div>
    );
};
export default BundleItemCreator;
