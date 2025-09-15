export interface Webcam {
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
  webcams: Webcam[];
}

export async function getWebcams(): Promise<WindyResponse> {
  const apiKey = process.env.WINDY_API_KEY;
  if (!apiKey) {
    throw new Error('WINDY_API_KEY is not defined in the environment variables.');
  }

  const response = await fetch('https://api.windy.com/webcams/api/v3/webcams', {
    method: 'GET',
    headers: {
      'x-windy-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webcams: ${response.statusText}`);
  }

  return response.json();
}
