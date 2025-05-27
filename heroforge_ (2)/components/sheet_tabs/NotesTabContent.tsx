import React, { useState } from 'react';
import { CharacterSheet } from '../../types';

interface NotesTabContentProps {
    characterSheet: CharacterSheet;
    onNotesUpdate: (newNotes: string) => void;
}

const NotesTabContent: React.FC<NotesTabContentProps> = ({ characterSheet, onNotesUpdate }) => {
    const [notes, setNotes] = useState(characterSheet._savedCoreDataHelper?.notes || "");
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        onNotesUpdate(e.target.value);
    };
    return (
        <div className="p-1 md:p-4 text-slate-700 dark:text-slate-200"> 
            <h3 className="text-2xl font-semibold text-purple-700 dark:text-purple-400 mb-4">Notas del Personaje</h3>
            <textarea 
                value={notes}
                onChange={handleNotesChange}
                rows={15}
                className="w-full p-3 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Escribe aquí tus notas, historia del personaje, detalles de campaña, etc..."
            />
        </div>
    );
};

export default NotesTabContent;
