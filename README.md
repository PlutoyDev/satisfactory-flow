# Satisfactory Flow

A tool to help you plan your factory in Satisfactory using a node-based graph editor.

> [!CAUTION]
> This project is still in early development and is not ready for use.

## Legacy Version

I have previously worked on [PlutoyDev/satisfactory-planning-tool](https://github.com/PlutoyDev/satisfactory-planning-tool) which is a similar project that never got finished. This project is a complete rewrite of that project with a new design and new features. Some part of the codebase will be reused from the old project.

<!-- TODO: Split development instructions into a separate file. I'm too lazy to do it now -->

## Extracting Data and Icons

### Docs.json

Provided by Coffee Stain Studios and can be found in the game files. This file contains all the information about the items, buildings, and resources in the game. This file is used to extract the data and icons for the items in the game.

For steam users, the file can be found in the following location: `C:\Program Files (x86)\Steam\steamapps\common\Satisfactory\CommunityResources\Docs\Docs.json`

I have no idea where the file is located for Epic Games users. If you know, please create a pull request to update this README.

Copy the `Docs.json` file to the `extracted` folder.

### Icons

The icons are in the game executable. I'll be using [FModel](https://fmodel.app/) to extract the icons from the game.

Refer to the [extracting-icon.md](docs/extracting-icon.md) for more information on how to extract the icons using FModel.

Copy the items in `Output\Exports\FactoryGame\Content\FactoryGame` to the `extracted` folder.

### End Result

Put all the extracted data and icons in the `extracted` folder. You should be left with a folder structure that looks like this:

```
extracted
├── Docs.json
├── Buildable
│   ├── -Shared
│   ├── Building
│   ├── Factory
│   ├── Vehicle
│   └── _Imposters
├── Equipment
│   ├── RebarGun
│   └── Rifle
├── Events
│   └── Christmas
├── Resource
│   ├── Environment
│   ├── Equipment
│   ├── Parts
│   ├── RawResources
│   └── Tape
├── Interface
│   └── UI
├── IconDesc_PortableMiner_256.png
└── put-extracted-file-here
```

---

<!-- TODO: README.md -->

TODO: Add more information here
