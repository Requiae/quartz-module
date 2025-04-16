import { Options } from "../components/ExplorerNode";

export function sortFnFactory(config: string | undefined): Options["sortFn"] {
  const nameOrderMap: Record<string, number> = (config || "")
    .replace(/, */g, ",")
    .split(",")
    .reduce(
      (previous, item) => ({
        ...previous,
        [item]: (Object.keys(previous).length + 1) * 100,
      }),
      {},
    );

  // Handle the undefined case
  if (nameOrderMap[""]) {
    delete nameOrderMap[""];
  }

  return (a, b) => {
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

    // Default alphabetic sorting will handle the case where this is 0, so we need not bother
    return orderA - orderB;
  };
}
