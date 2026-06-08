interface Subtopic {
  title: string;
  description: string;
}

interface Topic {
  title: string;
  subtopics: Subtopic[];
}

interface MindMapInput {
  topics: Topic[];
}

interface MindMapNode {
  id: string;
  content: string;
  children?: MindMapNode[];
}

interface MindMapOutput {
  content: string;
  attachment: {
    type: "mindmap";
    tree: MindMapNode[];
  };
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
