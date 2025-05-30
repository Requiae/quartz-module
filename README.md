# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

Original code found on https://github.com/jackyzha0/quartz

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>

### Updating Quartz from Source

- Create a clean update branch from `main`
- Overwrite the `quartz` directory and `package.json` with the source code from [GitHub](https://github.com/jackyzha0/quartz)
- Ensure no `leaflet` libraries are removed from `package.json`
- Run `npm install`
- Run `npm run format` to get rid of all the `;` changes
- Go through the changes and ensure none of the changes undo custom code, otherwise you'll need to do some manual work. Below is a non-exhaustive list of file to check:
  - `quartz/components/pages/Content.tsx`
  - `quartz/components/Head.tsx`
  - `quartz/plugins/emitters/contentIndex.tsx`
  - `quartz/styles/custom.scss`
- Commit and make a PR

## Get started

To run the website locally simply run

```
npm run serve
```

## Custom frontmatter

| Item           | Type   | Explanation                                                                                                                                  |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| priority       | number | Higher number gives node a higher priority in the explorer, this supersedes folders having priority over notes                               |
| map            | object | Custom object containing marker information Whether this page should show the campaign map                                                   |
| map.name       | string | Name of the map                                                                                                                              |
| map.path       | string | Path to the map image where the content folder is the root                                                                                   |
| map.minZoom    | number | The minimum zoom the map allows                                                                                                              |
| map.maxZoom    | number | The maximum zoom the map allows                                                                                                              |
| marker         | object | Custom object containing marker information                                                                                                  |
| marker.x       | number | (Integer) Marker x coordinate                                                                                                                |
| marker.y       | number | (Integer) Marker y coordinate                                                                                                                |
| marker.icon    | string | `anchor`, `anvil`, `bed`, `branch`, `camp`, `capitol`, `cauldron`, `diner`, `farm`, `shield`, `star`, `subway`, `town`, `tree`, `university` |
| marker.colour  | string | (Optional, defaults to `blue`) `green`, `lime`, `yellow`, `pink`, `blue`, `lightblue`, `brown`, `orange`, `red`, `purple`                    |
| marker.minZoom | number | (Optional Integer) The minimum zoom from which the marker is shown on the map                                                                |

> A marker requires `title`, `marker.x`, `marker.x`, and `marker.icon` to be set.

## Custom CSS

We also make use to the the same css [this wiki](https://morrowind-modding.github.io/contributing/custom-formatting-features) uses.

## Adding a new map image

Due to limitations currently present in Quartz it was not possible to add maps to nested folders. To circumvent this we always try to GET the image from the `baseUrl` set in `quartz.config.ts` or your `package.json`. During development you might need to temporarily set this to `http://localhost:8080/` if the map does not load.
