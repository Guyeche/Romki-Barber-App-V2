// Helper to format date to DD/MM/YYYY
export const formatIsraeliDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};
