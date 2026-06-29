type JsonLd = Record<string, unknown> | Record<string, unknown>[];

interface StructuredDataProps {
  id: string;
  data: JsonLd | null | undefined;
}

export function StructuredData({ id, data }: StructuredDataProps) {
  if (!data) return null;

  return (
    <script
      id={id}
      type="application/ld+json"
      // JSON-LD is generated from typed app data, not user-provided HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
