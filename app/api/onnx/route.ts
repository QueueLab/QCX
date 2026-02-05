import { NextResponse } from 'next/server';

// Simulate sending an error to a monitoring service (e.g., Sentry, DataDog)
const reportErrorToMonitoringService = (error: Error, context: object) => {
  // In a real application, this would send the error to a service like Sentry.
  console.log("Reporting error to monitoring service:", {
    errorMessage: error.message,
    stack: error.stack,
    context,
  });
};

export async function POST(request: Request) {
  // 1. Input Validation for FormData
  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid FormData body' }, { status: 400 });
  }

  const query = formData.get('query') as string | null;
  const file = formData.get('file') as File | null;

  if (!query && !file) {
    return NextResponse.json({ error: 'Request must contain a non-empty "query" string or a "file"' }, { status: 400 });
  }

  if (query && (typeof query !== 'string' || query.trim() === '')) {
      return NextResponse.json({ error: 'Field "query" must be a non-empty string if provided' }, { status: 400 });
  }

  // 2. Use Environment Variable for Endpoint and Provide Mock Fallback
  const azureVmEndpoint = process.env.AZURE_ONNX_ENDPOINT;

  if (!azureVmEndpoint) {
    console.warn('AZURE_ONNX_ENDPOINT is not configured. Falling back to mock response.');
    const mockResponse = {
      prediction: "This is a simulated response because the Azure endpoint is not configured.",
      confidence: 0.98,
      input: {
        query: query,
        fileName: file?.name,
        fileSize: file?.size,
      }
    };
    return NextResponse.json(mockResponse);
  }

  // 3. Forward Request and Handle Errors
  try {
    // Pass the FormData directly to the fetch call.
    // The browser will automatically set the 'Content-Type' to 'multipart/form-data' with the correct boundary.
    const response = await fetch(azureVmEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Create an error with status to be caught by the catch block
      const error = new Error(`Azure endpoint returned an error: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred';
    let errorStatus = 500;
    let errorContext: { [key: string]: any } = { query, fileName: file?.name };

    if (error instanceof Error) {
      errorMessage = error.message;
      // Use status from the error if it exists, otherwise default to 500
      errorStatus = (error as any).status || 500;
    }

    // In a production environment, send the error to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      reportErrorToMonitoringService(error as Error, errorContext);
    } else {
      // Log detailed error in development
      console.error('Error in ONNX proxy API:', error);
    }

    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: errorStatus });
  }
}