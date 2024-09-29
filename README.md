# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>

## Get started

To run the website locally simply run

```
npm run serve
```

## Custom frontmatter

| Item          | Type    | Explanation                                                                                |
| ------------- | ------- | ------------------------------------------------------------------------------------------ |
| prioritise    | boolean | Whether this page should appear above maps in the explorer                                 |
| map           | object  | Custom object containing marker information Whether this page should show the campaign map |
| map.name      | string  | Name of the map                                                                            |
| map.path      | string  | Path to the map image where the content folder is the root                                 |
| map.minZoom   | number  | The minimum zoom the map allows                                                            |
| map.maxZoom   | number  | The maximum zoom the map allows                                                            |
| marker        | object  | Custom object containing marker information                                                |
| marker.x      | number  | Marker x coordinate                                                                        |
| marker.y      | number  | Marker y coordinate                                                                        |
| marker.icon   | string  | `capitol`, `town`, `camp`, `subway`, `star`, `tree`, `shield`                              |
| marker.colour | string  | `green`, `lime`, `yellow`, `pink`, `blue`, `lightblue`, `brown`, `orange`, `red`, `purple` |

> A marker requires `title`, `marker.x`, `marker.x`, and `marker.icon` to be set. Colour defaults to `blue`.

## Custom CSS

We also make use to the the same css [this wiki](https://morrowind-modding.github.io/contributing/custom-formatting-features) uses.
