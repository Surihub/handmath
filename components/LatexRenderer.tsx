import React from 'react';

// KaTeX is loaded from CDN, declare it to avoid TS errors
declare const katex: any;

interface LatexRendererProps {
  children: string;
  className?: string;
}

// This component finds and renders LaTeX expressions within a string.
const LatexRenderer: React.FC<LatexRendererProps> = ({ children, className }) => {
  try {
    if (typeof katex === 'undefined' || !children) {
      // Fallback if KaTeX is not loaded or content is empty
      return <span className={className}>{children}</span>;
    }

    // Regex to find all LaTeX blocks, both inline ($...$) and display ($$...$$)
    const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    const parts = children.split(regex).filter(part => part);

    return (
      <div className={className}>
        {parts.map((part, index) => {
          if (part.match(regex)) {
            // This is a LaTeX part
            const isDisplay = part.startsWith('$$');
            const latex = part.substring(isDisplay ? 2 : 1, part.length - (isDisplay ? 2 : 1));
            const html = katex.renderToString(latex, {
              throwOnError: false,
              displayMode: isDisplay,
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } else {
            // This is a plain text part, replace newlines with <br> for proper formatting
            return part.split('\n').map((line, i) => (
              <React.Fragment key={`${index}-${i}`}>
                {line}
                {i < part.split('\n').length - 1 && <br />}
              </React.Fragment>
            ));
          }
        })}
      </div>
    );
  } catch (e) {
    console.error('KaTeX rendering error:', e);
    // Fallback to plain text on error
    return <div className={className}>{children}</div>;
  }
};

export default LatexRenderer;
