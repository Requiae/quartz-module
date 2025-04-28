import { ComponentChildren } from "preact";
import { htmlToJsx } from "../../util/jsx";
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types";
import { MapConstructor } from "../";

/*****************************************
 * HAS CUSTOMISED CODE
 ****************************************/

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const { tree, fileData } = props;
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren;
  const classes: string[] = fileData.frontmatter?.cssclasses ?? [];
  const classString = ["popover-hint", ...classes].join(" ");

  const Map: QuartzComponent = MapConstructor();
  return (
    <article class={classString}>
      {content}
      <Map {...props} />
    </article>
  );
};

export default (() => Content) satisfies QuartzComponentConstructor;
