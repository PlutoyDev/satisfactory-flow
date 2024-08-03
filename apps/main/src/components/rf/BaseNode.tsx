// TODO: Custom Node Wrapper
/* 
  Wrapper for custom node that providies rendering of:
  - inputs / outputs (and its type)
  - background color
  - rotation
  - sizes
*/

// TODO: Custom Node Editor Wrapper
/*
  Wrapper for custom node editor that
  - follows the [render prop pattern](https://www.patterns.dev/react/render-props-pattern#children-as-a-function)
  - provides a form for editing node properties (maybe with Formik)
  - provide field for rotations, color
  - validate the field (onChange)
  - handles changes and debounces the update into node
  
  FLow of data update (for number/string fields):
    - onChange -> validate -> updateFieldUI -> preventClosing (of editor) & showLoader (in reactflow) -> 
      debounced -> updateNode (stored separately in node) -> propogateAndCompute (update other nodes/edges) -> hideLoader
    - onSubmit -> updateNode (update node with new values) -> allowClosing

  Flow of data update (for other fields):
    onChange -> updateNode (stored directly in node) -> propogateAndCompute (update other nodes/edges)
*/
