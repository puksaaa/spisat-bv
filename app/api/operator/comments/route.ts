import { NextRequest, NextResponse } from "next/server";

import { listOperatorTasks, toCommentError } from "@/lib/comments";

export async function GET(request: NextRequest) {
  const afterIdParam = request.nextUrl.searchParams.get("afterId");
  const afterId = afterIdParam ? Number(afterIdParam) : undefined;

  if (afterIdParam && (!Number.isInteger(afterId) || Number(afterId) < 1)) {
    return NextResponse.json({ error: "Некорректный afterId." }, { status: 400 });
  }

  try {
    const items = await listOperatorTasks({ afterId });
    return NextResponse.json({ items });
  } catch (error) {
    const normalized = toCommentError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
