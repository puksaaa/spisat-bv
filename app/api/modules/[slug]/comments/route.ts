import { NextRequest, NextResponse } from "next/server";

import {
  createCommentForModule,
  getCommentsByModuleSlug,
  parseCommentPayloadFromRequest,
  toCommentError
} from "@/lib/comments";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const cursorParam = request.nextUrl.searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;

  if (cursorParam && (Number.isNaN(cursor) || Number(cursor) < 1)) {
    return NextResponse.json({ error: "Неверный курсор пагинации." }, { status: 400 });
  }

  try {
    const data = await getCommentsByModuleSlug(slug, cursor);
    return NextResponse.json(data);
  } catch (error) {
    const normalized = toCommentError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    let payload: unknown;

    try {
      payload = await parseCommentPayloadFromRequest(request);
    } catch (error) {
      const normalized = toCommentError(error);
      return NextResponse.json({ error: normalized.message }, { status: normalized.status });
    }

    const item = await createCommentForModule(slug, payload, request.headers);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const normalized = toCommentError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
