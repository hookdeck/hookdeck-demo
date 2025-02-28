import { NextRequest, NextResponse } from "next/server";

export function POST(request: NextRequest) {
  return NextResponse.json({ message: "Hello from the Hookdeck demo!" });
}
