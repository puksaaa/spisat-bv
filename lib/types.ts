export type ModuleLevel = "base" | "core" | "advanced";
export type ModuleSectionKind = "theory" | "example" | "practice" | "summary";
export type ModuleFileType = "pdf" | "csv" | "txt";

export type CommentAttachmentView = {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export type ModuleSectionView = {
  kind: ModuleSectionKind;
  heading: string;
  sortOrder: number;
  markdownSource: string;
  htmlCached: string;
  anchorId: string;
};

export type ModuleAssetView = {
  id?: number;
  title: string;
  fileType: ModuleFileType;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum: string;
  publicUrl: string;
  previewJson: {
    excerpt: string;
    formatNote: string;
    ctaLabel: string;
  };
};

export type ModuleCommentView = {
  id: number;
  authorLabel: string;
  body: string;
  createdAt: string;
  status: string;
  attachments: CommentAttachmentView[];
  adminAttachments: CommentAttachmentView[];
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  adminReply?: string | null;
  adminReplyAt?: string | null;
  adminReplyBy?: string | null;
  adminAttachmentName?: string | null;
  adminAttachmentUrl?: string | null;
  adminAttachmentMimeType?: string | null;
  adminAttachmentSizeBytes?: number | null;
};

export type OperatorCommentTaskView = {
  id: number;
  moduleId: number;
  moduleSlug: string;
  moduleTitle: string;
  moduleOrder: number;
  attachments: CommentAttachmentView[];
  adminAttachments: CommentAttachmentView[];
  attachmentUrl: string | null;
  attachmentName: string | null;
  body: string;
  createdAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  adminReplyBy: string | null;
  adminAttachmentName: string | null;
  adminAttachmentUrl: string | null;
  adminAttachmentMimeType: string | null;
  adminAttachmentSizeBytes: number | null;
};

export type ModuleSummaryView = {
  id?: number;
  slug: string;
  title: string;
  summary: string;
  order: number;
  level: ModuleLevel;
  tags: string[];
  readingTime: number;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  assetCount: number;
  commentCount: number;
  sectionCount: number;
};

export type ModuleSeedSection = {
  kind: ModuleSectionKind;
  heading: string;
  sortOrder: number;
  markdownSource: string;
};

export type ModuleSeedAsset = Omit<ModuleAssetView, "id">;

export type ModuleDetailView = ModuleSummaryView & {
  sections: ModuleSectionView[];
  assets: ModuleAssetView[];
};

export type ModuleSeedInput = Omit<
  ModuleSummaryView,
  "id" | "assetCount" | "commentCount" | "sectionCount"
> & {
  sections: ModuleSeedSection[];
  assets: ModuleSeedAsset[];
};
