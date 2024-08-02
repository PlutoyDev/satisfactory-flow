// IndexedDB for the app

/*
How data is stored:
- 'main' database
  - flows store { id, name, description, lastModified }
  - settings store { key, value }
    - 'lastOpenedFlowId' - id of the last opened flow
- 'flow-{id}' database
  - nodes store { id, type, data, postion } from [Node](https://reactflow.dev/api-reference/types/node)
  - edges store { id, type, data, source, target, sourceHandle, targetHandle } from [Edge](https://reactflow.dev/api-reference/types/edge)
  - propeties store { key, value }
    - 'name' - name of the flow
    - 'description' - description of the flow
    - 'lastModified' - last modified timestamp
    - 'created' - created timestamp
    - 'viewportX' - x position of the viewport
    - 'viewportY' - y position of the viewport
    - 'viewportZoom' - zoom level of the viewport
  TODO: History of changes
*/
