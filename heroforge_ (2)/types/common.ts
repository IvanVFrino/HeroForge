
// types/common.ts

export type AbilityScoreName = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';
export const ABILITY_SCORE_NAMES_ORDERED: AbilityScoreName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

export type SkillName = 
  'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics' | 'Deception' | 'History' | 
  'Insight' | 'Intimidation' | 'Investigation' | 'Medicine' | 'Nature' | 'Perception' | 
  'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand' | 'Stealth' | 'Survival';

export type Alignment = 
  'Lawful Good' | 'Neutral Good' | 'Chaotic Good' | 
  'Lawful Neutral' | 'True Neutral' | 'Chaotic Neutral' | 
  'Lawful Evil' | 'Neutral Evil' | 'Chaotic Evil';
export const ALIGNMENTS_LIST: Alignment[] = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

export type Size = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
export const SIZES_LIST: Size[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export type Language = string; // e.g., "Common", "Elvish"

export type AttackRollMode = 'normal' | 'advantage' | 'disadvantage';
