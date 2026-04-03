import { NextRequest, NextResponse } from "next/server";

import {
  parseOperatorReplyPayloadFromRequest,
  saveOperatorReply,
  toCommentError
} from "@/lib/comments";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const commentId = Number(id);

  if (!Number.isInteger(commentId) || commentId < 1) {
    return NextResponse.json({ error: "Некорректный идентификатор комментария." }, { status: 400 });
  }

  try {
    let payload: unknown;

    try {
      payload = await parseOperatorReplyPayloadFromRequest(request);
    } catch (error) {
      const normalized = toCommentError(error);
      return NextResponse.json({ error: normalized.message }, { status: normalized.status });
    }

    const item = await saveOperatorReply(commentId, payload);
    return NextResponse.json({ item });
  } catch (error) {
    const normalized = toCommentError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
