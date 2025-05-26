
import { SkillName, AbilityScoreName } from '../types';

export interface SkillDefinition {
  name: SkillName; // Internal key, remains English
  nombre: string; // Spanish display name
  ability: AbilityScoreName;
  description: string; // Spanish description
}

// Note: SkillName type values like 'Acrobatics' remain English for internal use.
// The 'nombre' field is for UI display.
export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // Strength
  { name: 'Athletics', nombre: 'Atletismo', ability: 'Strength', description: 'Hazañas físicas como trepar, saltar, nadar y forcejear.' },
  // Dexterity
  { name: 'Acrobatics', nombre: 'Acrobacias', ability: 'Dexterity', description: 'Equilibrio, volteretas y escapar de ataduras.' },
  { name: 'Sleight of Hand', nombre: 'Juego de Manos', ability: 'Dexterity', description: 'Robar bolsillos, colocar objetos y otros trabajos ágiles con los dedos.' },
  { name: 'Stealth', nombre: 'Sigilo', ability: 'Dexterity', description: 'Moverse sin ser visto ni oído.' },
  // Intelligence
  { name: 'Arcana', nombre: 'Arcanos', ability: 'Intelligence', description: 'Conocimiento de hechizos, objetos mágicos y saberes arcanos.' },
  { name: 'History', nombre: 'Historia', ability: 'Intelligence', description: 'Conocimiento de eventos pasados, civilizaciones y figuras históricas.' },
  { name: 'Investigation', nombre: 'Investigación', ability: 'Intelligence', description: 'Deducir información, encontrar pistas y examinar detalles.' },
  { name: 'Nature', nombre: 'Naturaleza', ability: 'Intelligence', description: 'Conocimiento de plantas, animales, terreno y clima.' },
  { name: 'Religion', nombre: 'Religión', ability: 'Intelligence', description: 'Conocimiento de deidades, ritos sagrados y organizaciones religiosas.' },
  // Wisdom
  { name: 'Animal Handling', nombre: 'Trato con Animales', ability: 'Wisdom', description: 'Calmar animales, intuir intenciones animales y controlar monturas.' },
  { name: 'Insight', nombre: 'Perspicacia', ability: 'Wisdom', description: 'Determinar verdaderas intenciones y detectar mentiras.' },
  { name: 'Medicine', nombre: 'Medicina', ability: 'Wisdom', description: 'Estabilizar a los moribundos y diagnosticar enfermedades.' },
  { name: 'Perception', nombre: 'Percepción', ability: 'Wisdom', description: 'Notar detalles, escuchar conversaciones y encontrar objetos ocultos.' },
  { name: 'Survival', nombre: 'Supervivencia', ability: 'Wisdom', description: 'Rastrear, buscar comida y navegar por la naturaleza.' },
  // Charisma
  { name: 'Deception', nombre: 'Engaño', ability: 'Charisma', description: 'Engañar a otros y contar mentiras convincentes.' },
  { name: 'Intimidation', nombre: 'Intimidación', ability: 'Charisma', description: 'Influir en otros mediante amenazas y comportamiento hostil.' },
  { name: 'Performance', nombre: 'Interpretación', ability: 'Charisma', description: 'Entretener a una audiencia con música, danza o narración.' },
  { name: 'Persuasion', nombre: 'Persuasión', ability: 'Charisma', description: 'Influir en otros con tacto, gracia social y buenos modales.' },
];