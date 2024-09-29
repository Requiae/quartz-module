import { Options } from "../components/ExplorerNode";

export const sortFn: Options["sortFn"] = (a, b) => {
  const nameOrderMap: Record<string, number> = {
    Arcadia: 100,
    People: 200,
    Journals: 300,
    Creatures: 300,
    Items: 300,
  };

  let orderA = 9999;
  let orderB = 9999;

  if (a.file?.frontmatter?.prioritise) {
    orderA = 0;
  } else if (a.file?.slug) {
    orderA = nameOrderMap[a.file.slug] || 2;
  } else if (a.name) {
    orderA = nameOrderMap[a.name] || 1;
  }

  if (b.file?.frontmatter?.prioritise) {
    orderB = 0;
  } else if (b.file?.slug) {
    orderB = nameOrderMap[b.file.slug] || 2;
  } else if (b.name) {
    orderB = nameOrderMap[b.name] || 1;
  }

  return orderA - orderB;
};
