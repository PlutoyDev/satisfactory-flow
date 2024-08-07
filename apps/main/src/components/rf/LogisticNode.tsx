import { NodeProps, Node } from '@xyflow/react';
import { FactoryLogisticNodeData } from '../../engines/data';
import { useMemo } from 'react';
import { computeFactoryItemNode, computeFactoryLogisticsNode } from '../../engines/compute';
import { useAtom } from 'jotai';
import { docsMappedAtom, additionNodePropMapAtom, nodesMapAtom, edgesMapAtom } from '../../lib/store';
import { FactoryNodeEditorWrapper, FactoryNodeWrapper } from './BaseNode';

const defaultSize = 36;

export function LogisticNode(props: NodeProps<Node<FactoryLogisticNodeData>>) {
  const [docsMapped] = useAtom(docsMappedAtom);
  const usedAPM = useAtom(additionNodePropMapAtom);
  const [nodeMap] = useAtom(nodesMapAtom);
  const [edgeMap] = useAtom(edgesMapAtom);

  const res = useMemo(
    () =>
      computeFactoryLogisticsNode({
        nodeId: props.id,
        docsMapped,
        nodeMap,
        edgeMap,
        usedAdditionalNodePropMapAtom: usedAPM,
      }),
    [props.data],
  );

  if (!res) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Item not found</p>
      </FactoryNodeWrapper>
    );
  }

  return <FactoryNodeWrapper {...props} factoryInterfaces={res?.interfaces} size={defaultSize} />;
}

export function LogisticNodeEditor(props: NodeProps<Node<FactoryLogisticNodeData>>) {
  return <FactoryNodeEditorWrapper {...props}> </FactoryNodeEditorWrapper>;
}
