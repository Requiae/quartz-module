import { Options } from "../../components/Explorer";

export const customSortFn: Options["sortFn"] = (a, b) => {
  if (b.data?.frontmatter?.priority) {
    if (!a.data?.frontmatter?.priority) {
      return 1;
    } else {
      // Prioritise the node with a higher priority
      return b.data?.frontmatter?.priority < a.data?.frontmatter?.priority ? -1 : 1;
    }
  }

  if ((!a.isFolder && !b.isFolder) || (a.isFolder && b.isFolder)) {
    return a.displayName.localeCompare(b.displayName, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  if (!a.isFolder && b.isFolder) {
    return 1;
  } else {
    return -1;
  }
};
