export interface ApprovalField {
  field: string;
  current: unknown;
  proposed: unknown;
}

export interface ApprovalGroup {
  heading: string;
  description: string;
  fields: ApprovalField[];
}

const groupIndex: Record<string, number> = {
  title: 0, slug: 0, description: 0, excerpt: 0, role: 0, repo: 0, link: 0,
  longDescription: 1, body: 1,
  coverImage: 2, coverImageAlt: 2, logo: 2, media: 2, avatarUrl: 2,
  tags: 3, outcomes: 3, links: 3, sortOrder: 3, featured: 3, published: 3,
};

export function groupApprovalFields(
  patch: Record<string, unknown>,
  current: Record<string, unknown>,
): ApprovalGroup[] {
  const groups: ApprovalGroup[] = [
    { heading: 'Project details', description: 'Identification and short summary', fields: [] },
    { heading: 'Main content', description: 'Rendered Markdown preview', fields: [] },
    { heading: 'Visual assets', description: 'Media previews and accessibility descriptions', fields: [] },
    { heading: 'Metadata and resources', description: 'Tags, outcomes, links and visibility settings', fields: [] },
    { heading: 'Additional changes', description: 'Other fields in the submitted proposal', fields: [] },
  ];
  for (const [field, proposed] of Object.entries(patch)) {
    const index = groupIndex[field] ?? 4;
    groups[index].fields.push({ field, current: current[field], proposed });
  }
  return groups.filter(group => group.fields.length > 0);
}
