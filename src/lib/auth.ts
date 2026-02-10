import { NextRequest } from "next/server";

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === process.env.API_KEY;
}
