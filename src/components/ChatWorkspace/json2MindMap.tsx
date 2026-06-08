interface Subtopic {
  title: string;
  description: string;
}

interface Topic {
  title: string;
  subtopics: Subtopic[];
}

export interface MindMapInput {
  topics: Topic[];
}

interface MindMapNode {
  id: string;
  content: string;
  children?: MindMapNode[];
}

export interface MindMapOutput {
  content: string;
  attachment: {
    type: "mindmap";
    tree: MindMapNode[];
  };
}

/**
 * Reverse of convertToMindMap.
 * Converts a question.json-shaped MindMapOutput back to a mockedAPI.json-shaped MindMapInput.
 *
 * Parsing rules (mirrors the encoding in convertToMindMap):
 *   section content  "## Topic Title"           → topic.title
 *   subtopic content "**Subtopic**\n\nDesc..."  → subtopic.title + subtopic.description
 */
export function convertFromMindMap(output: MindMapOutput): MindMapInput {
  const root = output.attachment.tree[0];
  if (!root) return { topics: [] };

  const topics: Topic[] = (root.children ?? []).map((section) => {
    const title = section.content.replace(/^##\s*/, "").trim();

    const subtopics: Subtopic[] = (section.children ?? []).map((node) => {
      const match = node.content.match(/^\*\*(.+?)\*\*\n\n([\s\S]*)$/);
      if (match) {
        return { title: match[1].trim(), description: match[2].trim() };
      }
      return { title: node.content.trim(), description: "" };
    });

    return { title, subtopics };
  });

  return { topics };
}

export function convertToMindMap(
  input: MindMapInput,
  rootTitle = "Mind Map",
  rootDescription = "",
  responseContent = ""
): MindMapOutput {
  const children: MindMapNode[] = input.topics.map((topic, topicIndex) => {
    const sectionId = `section-${topicIndex + 1}`;

    const subtopicNodes: MindMapNode[] = topic.subtopics.map(
      (subtopic, subtopicIndex) => ({
        id: `${sectionId}-q-${subtopicIndex + 1}`,
        content: `**${subtopic.title}**\n\n${subtopic.description}`,
      })
    );

    const sectionNode: MindMapNode = {
      id: sectionId,
      content: `## ${topic.title}`,
      ...(subtopicNodes.length > 0 && { children: subtopicNodes }),
    };

    return sectionNode;
  });

  const rootContent = rootDescription
    ? `# ${rootTitle}\n${rootDescription}`
    : `# ${rootTitle}`;

  return {
    content: responseContent,
    attachment: {
      type: "mindmap",
      tree: [
        {
          id: "root",
          content: rootContent,
          ...(children.length > 0 && { children }),
        },
      ],
    },
  };
}
