/* 
Sizes of machines (W x L), Taken from satisfactory wiki.
  Smelter 6 x 9
  Constructor 7.9 x 9.9
  Foundry 10 x 9
  Assembler 10 x 15
  Manufacturer 18 x 20
  Packager 8 x 8
  Refinery 10 x 20
  Blender 18 x 16
  Particle Accelerator 24 x 38

Multiply by 18px/m to get the size in pixels
Width of machine is the "height" in the node, and the length is the "width" in the node

TIP for vscode: using multi-cusor, append *18 to each number and highlight the math expression
  Open the command palette (Ctrl+Shift+P or Cmd+Shift+P or F1) and use "Emmet: Evaluate Math Expression"
  It will evaluate each math expression and replace it with the result (e.g. 6*18 -> 108)
*/

import { Node, NodeProps } from '@xyflow/react';
import { FactoryRecipeNodeData } from '../../engines/data';
import { useAtom } from 'jotai';
import { docsMappedAtom } from '../../lib/store';
import { computeFactoryRecipeNode } from '../../engines/compute';
import { Fragment, useMemo } from 'react';
import { FactoryNodeWrapper } from './BaseNode';
import { ArrowRight } from 'lucide-react';

export const MachineSize = {
  Build_SmelterMk1_C: [108, 162],
  Build_ConstructorMk1_C: [144, 180],
  Build_FoundryMk1_C: [180, 162],
  Build_AssemblerMk1_C: [180, 270],
  Build_ManufacturerMk1_C: [324, 360],
  Build_Packager_C: [144, 144],
  Build_OilRefinery_C: [180, 360],
  Build_Blender_C: [324, 288],
  Build_HadronCollider_C: [432, 684],
} as const satisfies Record<string, [number, number]>;

const defaultSize = 180;

export function RecipeNode(props: NodeProps<Node<FactoryRecipeNodeData>>) {
  const { recipeKey, clockSpeedThou = 100000 } = props.data;
  const [docsMapped] = useAtom(docsMappedAtom);

  const recipe = recipeKey && docsMapped.recipes.get(recipeKey);
  const res = useMemo(() => recipe && computeFactoryRecipeNode(props.data, recipe, k => docsMapped.items.get(k))!, [props.data, recipe]);

  if (!recipeKey) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Unset</p>
      </FactoryNodeWrapper>
    );
  }

  if (!recipe || !res) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Recipe not found</p>
      </FactoryNodeWrapper>
    );
  }

  const { displayName, ingredients, products } = recipe;
  const size = MachineSize[recipe.producedIn as keyof typeof MachineSize] ?? defaultSize;

  return (
    <FactoryNodeWrapper {...props} factoryInterfaces={res.interfaces} size={size}>
      {displayName}
      <div className='grid grid-flow-col grid-rows-12 place-items-center gap-0.5'>
        {[...ingredients, ...products].map(({ itemKey }, i) => {
          const { iconPath, displayName } = docsMapped.items.get(itemKey)!;
          const isIngredient = i < ingredients.length;
          const span = 12 / (isIngredient ? ingredients.length : products.length);
          const gridRow = `span ${span} / span ${span}`;
          return (
            <Fragment key={itemKey}>
              {i === ingredients.length && <ArrowRight className='row-span-full' />}
              {iconPath && <img src={'/extracted/' + iconPath} alt={displayName} className='h-6 w-6' style={{ gridRow }} />}
            </Fragment>
          );
        })}
      </div>
      {clockSpeedThou / 1000}%
    </FactoryNodeWrapper>
  );
}

export function RecipeNodeEditor() {
  return <p>TODO</p>;
}