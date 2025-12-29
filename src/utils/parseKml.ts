export interface Place {
  name: string;
  lat: number;
  lng: number;
  color: string;
  category: 'been' | 'want';
}

const colorMap: Record<string, string> = {
  'placemark-red': '#e53935',
  'placemark-blue': '#1e88e5',
  'placemark-purple': '#8e24aa',
  'placemark-yellow': '#fdd835',
  'placemark-pink': '#d81b60',
  'placemark-brown': '#6d4c41',
  'placemark-green': '#43a047',
  'placemark-orange': '#fb8c00',
  'placemark-deeppurple': '#5e35b1',
  'placemark-lightblue': '#039be5',
  'placemark-cyan': '#00acc1',
  'placemark-teal': '#00897b',
  'placemark-lime': '#c0ca33',
  'placemark-deeporange': '#f4511e',
  'placemark-gray': '#757575',
  'placemark-bluegray': '#546e7a',
};

function extractName(content: string, lang: string): string | null {
  const regex = new RegExp(`<mwm:lang code="${lang}">([^<]*)</mwm:lang>`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

export function parseKml(kmlContent: string, category: 'been' | 'want'): Place[] {
  const places: Place[] = [];

  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let match;

  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    const placemarkContent = match[1];

    const defaultNameMatch = placemarkContent.match(/<name>([^<]*)<\/name>/);
    const coordMatch = placemarkContent.match(/<coordinates>([^<]*)<\/coordinates>/);
    const styleMatch = placemarkContent.match(/<styleUrl>#([^<]*)<\/styleUrl>/);

    if (defaultNameMatch && coordMatch) {
      // Try Russian first, then English, then default
      const name =
        extractName(placemarkContent, 'ru') ||
        extractName(placemarkContent, 'en') ||
        defaultNameMatch[1];

      const [lng, lat] = coordMatch[1].split(',').map(Number);
      const styleId = styleMatch ? styleMatch[1] : 'placemark-blue';
      const color = colorMap[styleId] || '#1e88e5';

      places.push({
        name,
        lat,
        lng,
        color,
        category,
      });
    }
  }

  return places;
}
