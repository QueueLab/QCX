export function extractLocations(text: string) {
  const locationRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  const locations = [];
  let match;

  while ((match = locationRegex.exec(text)) !== null) {
    locations.push(match[1]);
  }

  return locations;
}

export function linkLocations(text: string) {
  const locations = extractLocations(text);
  locations.forEach(location => {
    const locationLink = `<a href="#" onclick="window.renderMapToLocation('${location}')">${location}</a>`;
    text = text.replace(new RegExp(`\\b${location}\\b`, 'g'), locationLink);
  });

  return text;
}
