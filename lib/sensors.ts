export interface Sensor {
  id: string;
  title: string;
  location: {
    latitude: number;
    longitude: number;
  };
  images: {
    current: {
      preview: string;
    };
    daylight: {
      preview: string;
    }
  };
  urls: {
    webcam: string;
  };
}

export interface WindyResponse {
  webcams: Sensor[];
}

export async function getSensors(): Promise<WindyResponse> {
  const apiKey = process.env.WINDY_API_KEY;
  if (!apiKey || apiKey === 'YOUR_WINDY_API_KEY') {
    console.error('WINDY_API_KEY is not defined or not set in the environment variables.');
    throw new Error('WINDY_API_KEY is not defined or not set in the environment variables.');
  }

  try {
    console.log('Fetching sensors with API key:', apiKey ? 'present' : 'missing');
    const response = await fetch('https://api.windy.com/webcams/api/v3/webcams?include=location,images,urls', {
      method: 'GET',
      headers: {
        'x-windy-api-key': apiKey,
      },
    });

    console.log('Windy API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sensors:', response.statusText, errorText);
      throw new Error(`Failed to fetch sensors: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched sensor data:', data);
    return data;
  } catch (error) {
    console.error('Error in getSensors:', error);
    throw error;
  }
}
