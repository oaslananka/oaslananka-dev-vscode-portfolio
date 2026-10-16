import { ADMIN_CONTENT_LIMITS } from '@/lib/admin/limits';
import {
  getAdminPosts,
  getAdminProfile,
  getAdminProjects,
  getAdminSettings,
} from '@/lib/admin/data';
import { agentRead } from '@/lib/agent-api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return agentRead(request, async () => {
    const [profile, siteSettings, projects, posts] = await Promise.all([
      getAdminProfile(),
      getAdminSettings(),
      getAdminProjects(),
      getAdminPosts(),
    ]);
    return {
      version: 1,
      capabilities: ['context:read', 'profile:read', 'settings:read', 'projects:read', 'posts:read'],
      profile,
      siteSettings,
      projects: projects.map((project) => ({
        id: project.id,
        revision: project.revision,
        slug: project.slug,
        title: project.title,
        description: project.description,
        repo: project.repo,
        coverImage: project.coverImage,
        featured: project.featured,
        sortOrder: project.sortOrder,
        updatedAt: project.updatedAt,
      })),
      posts: posts.map((post) => ({
        id: post.id,
        revision: post.revision,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        published: post.published,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
      })),
      limits: {
        tagCount: ADMIN_CONTENT_LIMITS.tagCount,
        biographyParagraphCount: ADMIN_CONTENT_LIMITS.biographyParagraphCount,
        projectDescriptionLength: ADMIN_CONTENT_LIMITS.projectDescriptionLength,
        projectBodyLength: ADMIN_CONTENT_LIMITS.projectBodyLength,
        postBodyLength: ADMIN_CONTENT_LIMITS.postBodyLength,
      },
    };
  });
}
