"use client";

import React from "react";

interface JsonLdProps {
  data: Record<string, any>;
}

/**
 * Renders JSON-LD structured data for SEO and AI agents.
 */
export default function JsonLd({ data }: JsonLdProps) {
  // Ensure we have the base context
  const schema = {
    "@context": "https://schema.org",
    ...data,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
