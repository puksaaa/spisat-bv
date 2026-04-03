import type { Schema } from "hast-util-sanitize";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const schema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    pre: [...(defaultSchema.attributes?.pre ?? []), ["className"]],
    a: [...(defaultSchema.attributes?.a ?? []), ["target"], ["rel"]]
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "section"
  ]
};

export async function compileMarkdown(markdown: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}
