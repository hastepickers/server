export function capitalize(str) {
  if (!str) return "";
  const words = str.replace(/-/g, ' ').split(' ').filter(word => word.length > 0);
  const capitalizedWords = words.map(word => {
    if (word.length === 0) {
      return "";
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return capitalizedWords.join(' ');
}