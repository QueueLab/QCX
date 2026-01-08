import { Polar } from "@polar-sh/sdk";
import { getCurrentUserIdOnServer } from "./auth/get-current-user";

const polar = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? "",
});

export async function trackUsage(eventName: string, metadata: Record<string, any> = {}) {
  if (!process.env["POLAR_ACCESS_TOKEN"]) {
    console.warn("[Metering] POLAR_ACCESS_TOKEN is not set. Skipping usage tracking.");
    return;
  }

  try {
    const customerId = await getCurrentUserIdOnServer();

    if (!customerId) {
      console.warn("[Metering] No customer ID found. Skipping usage tracking.");
      return;
    }

    await polar.events.ingest({
      events: [
        {
          name: eventName,
          externalCustomerId: customerId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      ],
    });
  } catch (error) {
    console.error("[Metering] Error tracking usage:", error instanceof Error ? error.message : error);
  }
}
