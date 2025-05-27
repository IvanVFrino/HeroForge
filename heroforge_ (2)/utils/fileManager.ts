export const downloadJson = (data: any, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2); // Pretty print JSON
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseJsonFile = <T,>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const jsonData = JSON.parse(jsonString) as T;
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Error parsing JSON file: ' + (error as Error).message));
      }
    };
    // Correctly handle FileReader error by accessing reader.error.message
    reader.onerror = () => {
      reject(new Error('Error reading file: ' + (reader.error ? reader.error.message : 'Unknown file reading error')));
    };
    reader.readAsText(file);
  });
};