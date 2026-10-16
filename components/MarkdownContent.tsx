import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

function MarkdownHeading1({ children }: { children?: React.ReactNode }) {
  return <h2>{children}</h2>;
}

const markdownComponents = {
  // The page title owns the only H1; editor-authored headings start at H2.
  h1: MarkdownHeading1,
};

export default function MarkdownContent({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={markdownComponents}
    >
      {children}
    </Markdown>
  );
}
