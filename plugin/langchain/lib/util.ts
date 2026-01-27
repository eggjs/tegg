import { ObjectInfo, ModuleConfig } from '@eggjs/tegg';
import {
  ChatModelQualifierAttribute,
  FileSystemQualifierAttribute,
} from '@eggjs/tegg-langchain-decorator';
import assert from 'node:assert';

export type ConfigTypeHelper<T extends 'ChatModel' | 'filesystem'> =
  Required<ModuleConfig>[T]['clients'][keyof Required<ModuleConfig>[T]['clients']];

export function getClientNames(config: ModuleConfig | undefined, key: string): string[] {
  const clients = config?.[key]?.clients;
  if (!clients) return [];
  return Object.keys(clients);
}

export function getChatModelConfig(config: ModuleConfig, objectInfo: ObjectInfo): ConfigTypeHelper<'ChatModel'> {
  const chatModelName = objectInfo.qualifiers.find(t => t.attribute === ChatModelQualifierAttribute)?.value;
  assert(chatModelName, 'not found ChatModel name');
  const chatModelConfig = config.ChatModel?.clients[chatModelName];
  if (!config) {
    throw new Error(`not found ChatModel config for ${chatModelName}`);
  }
  return chatModelConfig!;
}

export function getFileSystemConfig(config: ModuleConfig, objectInfo: ObjectInfo): ConfigTypeHelper<'filesystem'> {
  const filesystemName = objectInfo.qualifiers.find(t => t.attribute === FileSystemQualifierAttribute)?.value;
  assert(filesystemName, 'not found filesystem name');
  const fsConfig = config.filesystem?.clients[filesystemName];
  if (!config) {
    throw new Error(`not found FsMiddleware config for ${filesystemName}`);
  }
  return fsConfig!;
}
