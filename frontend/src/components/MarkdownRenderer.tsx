import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Preprocess text: normalize unicode bullets to standard markdown list items
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    // Replace leading unicode bullet characters (•, ●, ▪) with markdown bullet '- '
    return content.replace(/^[ \t]*[•●▪]\s+/gm, '- ');
  }, [content]);

  return (
    <div className={`markdown-content text-xs leading-relaxed font-sans ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-sm font-bold text-white mt-3 mb-2 flex items-center gap-1.5" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xs font-bold text-white mt-2.5 mb-1.5 flex items-center gap-1.5 border-b border-[#242432] pb-1" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-semibold text-slate-100 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-slate-200 mb-2 last:mb-0 leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-300" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 my-2 text-slate-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 my-2 text-slate-300" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props} />
          ),
          a: ({ node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[#f95721] hover:text-[#ff7438] underline inline-flex items-center gap-0.5 font-medium transition-colors"
              {...props}
            >
              <span>{children}</span>
              <ExternalLink className="w-2.5 h-2.5 inline shrink-0 ml-0.5" />
            </a>
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-[#f95721] bg-[#161622]/60 px-3 py-1.5 my-2 text-slate-300 italic rounded-r-lg" {...props} />
          ),
          code: ({ node, className, children, ...props }) => {
            const isCodeBlock = className && className.includes('language-');
            if (isCodeBlock) {
              return (
                <code className="text-xs font-mono text-emerald-300" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#28283a] text-[11px] font-mono text-amber-300" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => (
            <pre className="p-3 rounded-xl bg-[#0d0d12] border border-[#20202c] overflow-x-auto text-[11px] font-mono text-slate-200 my-2" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-[#222230] my-3" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-[#222230]">
              <table className="w-full text-left text-xs border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-1.5 bg-[#161620] text-white font-bold border-b border-[#222230]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-1.5 border-b border-[#1c1c28] text-slate-300" {...props} />
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
