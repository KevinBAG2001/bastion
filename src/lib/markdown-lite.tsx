function inlineFormat(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function MarkdownLite({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\n+/);
  return (
    <div className="prose-lesson">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("- ")) {
          const items = trimmed.split("\n").map((line) => line.replace(/^-\s*/, ""));
          return (
            <ul key={index}>
              {items.map((item, i) => (
                <li key={i}>{inlineFormat(item)}</li>
              ))}
            </ul>
          );
        }
        if (/^\d+\./.test(trimmed)) {
          const items = trimmed.split("\n").map((line) => line.replace(/^\d+\.\s*/, ""));
          return (
            <ol key={index} className="list-decimal pl-5 mb-4 text-slate-300 space-y-1">
              {items.map((item, i) => (
                <li key={i}>{inlineFormat(item)}</li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{inlineFormat(trimmed)}</p>;
      })}
    </div>
  );
}
