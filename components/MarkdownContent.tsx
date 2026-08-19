import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export default function MarkdownContent({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        // The page title owns the only H1; editor-authored headings start at H2.
        h1: ({ children: heading }) => <h2>{heading}</h2>,
      }}
    >
      {children}
    </Markdown>
  );
}
