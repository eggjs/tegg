import { AccessLevel, SingletonProto } from '@eggjs/tegg';
import { GraphInfoUtil } from '@eggjs/tegg-langchain-decorator';
import * as uuid from 'uuid';

// Magic NAMESPACE from
// https://github.com/langchain-ai/langgraphjs/blob/main/libs/langgraph-api/src/graph/load.mts#L27
// Dont ask me why...
export const NAMESPACE_GRAPH = uuid.parse(
  '6ba7b821-9dad-11d1-80b4-00c04fd430c8',
);

@SingletonProto({ accessLevel: AccessLevel.PRIVATE })
export class Graph {

  public getAssistantId(graphId: string): string {
    if (GraphInfoUtil.getGraphByName(graphId)) {
      return uuid.v5(graphId, NAMESPACE_GRAPH);
    }

    return graphId;
  }

  public getGraph(graphId: string) {
    return GraphInfoUtil.getGraphByName(graphId);
  }
}

