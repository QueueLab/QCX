import { Polar } from "@polar-sh/sdk";
import { getCurrentUserIdOnServer } from "@/lib/auth/get-current-user";
import { NextRequest, NextResponse } from "next/server";

const polar = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? "",
});

export const GET = async (req: NextRequest) => {
  try {
    const customerId = await getCurrentUserIdOnServer();

    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await polar.events.ingest({
      events: [
        {
          name: "api_call",
          externalCustomerId: customerId,
          metadata: {
            route: "/api/meter",
            method: "GET",
          },
        },
      ],
    });

    return NextResponse.json({ hello: "world" });
  } catch (error) {
    console.error("Error in GET /api/meter:", error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
