import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // The Azure VM API endpoint URL will be placed here.
    // For now, we will use a placeholder.
    const azureVmEndpoint = 'https://your-azure-vm-api-endpoint.com/terramind.onnx';

    // Forward the request to the Azure VM.
    const response = await fetch(azureVmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to get response from Azure VM: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ONNX proxy API:', error);
    // It's better to check if error is an instance of Error
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}