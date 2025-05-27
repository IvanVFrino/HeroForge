
import { DndBackground, StartingEquipmentItem } from '../types';

export const BACKGROUNDS_DATA: DndBackground[] = [
  {
    id: 'base-acolyte',
    name: 'Acólito',
    skillProficiencies: ['Insight', 'Religion'],
    languages: ['Dos idiomas cualesquiera de tu elección'], 
    startingEquipment: { 
      items: [
        { name: "Un símbolo sagrado (un regalo que recibiste al entrar al sacerdocio)", quantity: 1 },
        { name: "Un libro de oraciones o rueda de plegarias", quantity: 1 },
        { name: "5 varitas de incienso", quantity: 1 }, 
        { name: "Vestiduras", quantity: 1 },
        { name: "Un conjunto de ropas comunes", quantity: 1 }
      ], 
      gold: 8 
    },
    originFeat: 'Iniciado en la Magia (Clérigo)', 
    asi: { options: ['Intelligence', 'Wisdom', 'Charisma'] },
    isCustom: false,
  },
  {
    id: 'base-artisan',
    name: 'Artesano', 
    skillProficiencies: ['Investigation', 'Persuasion'],
    toolProficiencies: ["Un tipo de herramientas de artesano", "Otro tipo de herramientas de artesano"], 
    startingEquipment: { 
      items: [
        { name: "Un conjunto de herramientas de artesano (de tu elección)", quantity: 1 },
        { name: "Una carta de presentación de tu gremio", quantity: 1 },
        { name: "Un conjunto de ropas de viajero", quantity: 1 }
      ], 
      gold: 32 
    },
    originFeat: 'Fabricante', 
    asi: { options: ['Strength', 'Dexterity', 'Intelligence'] },
    isCustom: false,
  },
  // Add more backgrounds with 'id' and 'isCustom: false'
];