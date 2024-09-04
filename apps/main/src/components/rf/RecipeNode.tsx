import { Fragment, useMemo } from 'react';
import { Node, NodeProps } from '@xyflow/react';
import { useAtom } from 'jotai';
import { ArrowRight } from 'lucide-react';
import { getFactoryInterfaceForRecipeNode } from '../../engines/interface';
import { clockSpeedThouToPercentString, FACTORY_MACHINE_PROPERTIES, FactoryRecipeNodeData, resolveRecipeNodeData } from '../../lib/data';
import { docsMappedAtom } from '../../lib/store';
import ItemOrRecipeComboBox from '../form/ItemOrRecipeComboBox';
import NumberInput from '../form/NumberInput';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryNodeWrapper, useEditorField } from './BaseNode';

/* 
Multiply by 24px/m to get the size in pixels
Width of machine is the "height" in the node, and the length is the "width" in the node

TIP for vscode: using multi-cusor, append *18 to each number and highlight the math expression
  Open the command palette (Ctrl+Shift+P or Cmd+Shift+P or F1) and use "Emmet: Evaluate Math Expression"
  It will evaluate each math expression and replace it with the result (e.g. 6*24 -> 144)
*/

const defaultSize = 90;

export function RecipeNode(props: NodeProps<Node<FactoryRecipeNodeData>>) {
  const { recipeKey, clockSpeedThou, rotIdx = 0 } = resolveRecipeNodeData(props.data);
  const [docsMapped] = useAtom(docsMappedAtom);

  const recipe = recipeKey && docsMapped.recipes.get(recipeKey);
  const swapSides = rotIdx % 2 === 1; // Left becomes top, right becomes bottom
  const flipSides = rotIdx / 2 >= 1; // Left becomes right, top becomes bottom

  const { elements } = useMemo(() => {
    if (!recipe) return { elements: [] };
    const { ingredients, products } = recipe;
    const elements: JSX.Element[] = [];
    const itemsLength = ingredients.length + products.length;

    for (let i = 0; i < itemsLength; i++) {
      const isIngredient = i < ingredients.length;
      let iconPath: string | null, displayName: string, span: number, start: number;
      if (isIngredient) {
        const itemKey = ingredients[i].itemKey;
        const item = docsMapped.items.get(itemKey)!;
        iconPath = item.iconPath;
        displayName = item.displayName;
        span = 12 / ingredients.length;
        start = (swapSides !== flipSides ? ingredients.length - 1 - i : i) * span;
      } else {
        const itemKey = products[products.length - (i - ingredients.length) - 1].itemKey;
        const item = docsMapped.items.get(itemKey)!;
        iconPath = item.iconPath;
        displayName = item.displayName;
        span = 12 / products.length;
        start = (swapSides !== flipSides ? products.length - 1 - (i - ingredients.length) : i - ingredients.length) * span;
      }

      elements.push(
        <Fragment key={i}>
          {i === ingredients.length && (
            <ArrowRight style={{ [swapSides ? 'gridColumn' : 'gridRow']: '1 / -1', transform: `rotate(${rotIdx * 90}deg)` }} />
          )}
          {iconPath && (
            <img
              src={'/extracted/' + iconPath}
              alt={displayName}
              className='h-6 w-6'
              style={{
                [swapSides ? 'gridColumn' : 'gridRow']: `${start + 1} / span ${span}`,
                [swapSides ? 'gridRow' : 'gridColumn']: flipSides ? (isIngredient ? 3 : 1) : isIngredient ? 1 : 3,
              }}
            />
          )}
        </Fragment>,
      );
    }
    return { elements };
  }, [docsMapped, recipe, rotIdx]);

  const size = useMemo(
    () =>
      recipe && recipe.producedIn in FACTORY_MACHINE_PROPERTIES
        ? ([FACTORY_MACHINE_PROPERTIES[recipe.producedIn].length * 24, FACTORY_MACHINE_PROPERTIES[recipe.producedIn].width * 24] as [
            number,
            number,
          ])
        : defaultSize,
    [recipeKey, docsMapped],
  );

  const interfaces = getFactoryInterfaceForRecipeNode({ nodeId: props.id, data: props.data, docsMapped });

  if (!recipeKey) {
    return (
      <FactoryNodeWrapper {...props} size={defaultSize}>
        <p>Unset</p>
      </FactoryNodeWrapper>
    );
  }

  if (!recipe || !interfaces) {
    return (
      <FactoryNodeWrapper {...props} size={defaultSize}>
        <p>Recipe not found</p>
      </FactoryNodeWrapper>
    );
  }

  const machineName = docsMapped.productionMachines.get(recipe.producedIn)!.displayName;

  return (
    <FactoryNodeWrapper {...props} factoryInterfaces={interfaces} size={size}>
      <span>{recipe.displayName}</span>
      <div
        className='grid place-items-center gap-0.5'
        style={{
          gridAutoFlow: swapSides ? 'row' : 'column',
          [swapSides ? 'gridTemplateColumns' : 'gridTemplateRows']: 'repeat(12, minmax(0, 1fr))',
        }}
      >
        {elements}
      </div>

      <span>{clockSpeedThouToPercentString(clockSpeedThou)}%</span>
      <span>{machineName}</span>
    </FactoryNodeWrapper>
  );
}

export function RecipeNodeEditor() {
  const { currentValue: recipeKey, setValue: setRecipeKey } = useEditorField<string | undefined>('recipeKey');
  return (
    <>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Recipe: </p>
        <ItemOrRecipeComboBox type='recipe' defaultKey={recipeKey} onKeySelected={setRecipeKey} />
      </div>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Clock Speed: </p>
        <NumberInput name='clockSpeedThou' unit='%' defaultValue={100} step={1} minValue={1} maxValue={250} />
      </div>
      <RotationAndColorFields />
    </>
  );
}
