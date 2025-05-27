
import { SpellSchoolName } from '../types';

export interface SpellSchoolDefinition {
  name: SpellSchoolName;
  nombre: string; // Spanish display name
  color: string; // Tailwind CSS background color class
  textColor: string; // Tailwind CSS text color class
  borderColor?: string; // Tailwind CSS border color class
}

export const SPELL_SCHOOLS_DATA: SpellSchoolDefinition[] = [
  { name: 'Abjuration',   nombre: 'Abjuración',    color: 'bg-blue-500',     textColor: 'text-white',  borderColor: 'border-blue-700' },
  { name: 'Conjuration',  nombre: 'Conjuración',   color: 'bg-yellow-400',   textColor: 'text-black',  borderColor: 'border-yellow-600' },
  { name: 'Divination',   nombre: 'Adivinación',   color: 'bg-indigo-500',   textColor: 'text-white',  borderColor: 'border-indigo-700' },
  { name: 'Enchantment',  nombre: 'Encantamiento', color: 'bg-pink-500',     textColor: 'text-white',  borderColor: 'border-pink-700' },
  { name: 'Evocation',    nombre: 'Evocación',     color: 'bg-red-500',      textColor: 'text-white',  borderColor: 'border-red-700' },
  { name: 'Illusion',     nombre: 'Ilusión',       color: 'bg-purple-500',   textColor: 'text-white',  borderColor: 'border-purple-700' },
  { name: 'Necromancy',   nombre: 'Nigromancia',   color: 'bg-slate-600',    textColor: 'text-white',  borderColor: 'border-slate-800' },
  { name: 'Transmutation',nombre: 'Transmutación', color: 'bg-green-500',    textColor: 'text-white',  borderColor: 'border-green-700' },
  { name: 'Universal',    nombre: 'Universal',     color: 'bg-teal-500',     textColor: 'text-white',  borderColor: 'border-teal-700' },
] as const;

// Export SPELL_SCHOOL_NAMES for consistency if needed elsewhere, derived from SPELL_SCHOOLS_DATA
export const SPELL_SCHOOL_NAMES = SPELL_SCHOOLS_DATA.map(s => s.name) as readonly SpellSchoolName[];


export const getSpellSchoolDisplayData = (schoolName?: SpellSchoolName): SpellSchoolDefinition | undefined => {
  if (!schoolName) return undefined;
  return SPELL_SCHOOLS_DATA.find(s => s.name === schoolName);
};
