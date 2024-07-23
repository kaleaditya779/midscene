/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ChatCompletionMessageParam } from 'openai/resources';

export interface Point {
  left: number;
  top: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Rect = Point & Size;

enum NodeType {
  'INPUT' = 'INPUT Node',
  'BUTTON' = 'BUTTON Node',
  'IMG' = 'IMG Node',
  'TEXT' = 'TEXT Node',
}

export abstract class BaseElement {
  abstract id: string;

  abstract attributes: {
    ['nodeType']: NodeType;
    [key: string]: string;
  };

  abstract content: string;

  abstract rect: Rect;

  abstract center: [number, number];

  abstract locator?: string;
}

// export type EnhancedTextElement<DataScheme extends object = {}> = TextElement & {
//   [K in keyof DataScheme]: DataScheme[K];
// };

/**
 * openai
 *
 */
export enum AIResponseFormat {
  JSON = 'json_object',
  TEXT = 'text',
}

export interface AIElementParseResponse {
  elements: {
    id: string;
    reason: string;
    text: string;
  }[];
  errors?: string[];
}

export interface AISectionParseResponse<DataShape> {
  data: DataShape;
  sections?: LiteUISection[];
  errors?: string[];
}

/**
 * context
 */

// export type ContextDescriberFn = () => Promise<{
//   description: string;
//   elementById: (id: string) => BaseElement;
// }>;

export abstract class UIContext<ElementType extends BaseElement = BaseElement> {
  abstract screenshotBase64: string;

  abstract content: ElementType[];

  // abstract describer: () => Promise<{
  //   description: string;
  //   elementById: (id: string) => ElementType;
  // }>;
}

/**
 * insight
 */

export type CallAIFn = <T>(messages: ChatCompletionMessageParam[]) => Promise<T>;

export interface InsightOptions {
  taskInfo?: Omit<InsightTaskInfo, 'durationMs'>;
  aiVendorFn?: CallAIFn;
}

export interface UISection {
  name: string;
  description: string;
  sectionCharacteristics: string;
  rect: Rect;
  content: BaseElement[];
}

export type EnsureObject<T> = { [K in keyof T]: any };

export interface BasicSectionQuery {
  name?: string;
  description?: string;
}

export type InsightExtractParam = string | Record<string, string>;

export interface InsightTaskInfo {
  // TODO: remove name / url
  name?: string;
  url?: string;
  durationMs: number;
  systemPrompt?: string;
  rawResponse?: string;
}

export interface DumpMeta {
  sdkVersion: string;
  logTime: number;
}

export interface InsightDump extends DumpMeta {
  type: 'find' | 'extract';
  logId: string;
  context: UIContext;
  userQuery: {
    element?: string;
    dataDemand?: InsightExtractParam;
    sections?: Record<string, string>;
  }; // ?
  matchedSection: UISection[];
  matchedElement: BaseElement[];
  data: any;
  taskInfo: InsightTaskInfo;
  error?: string;
}

export type PartialInsightDumpFromSDK = Omit<InsightDump, 'sdkVersion' | 'logTime' | 'logId'>;

export type DumpSubscriber = (dump: InsightDump) => Promise<void> | void;

// intermediate variables to optimize the return value by AI
export interface LiteUISection {
  name: string;
  description: string;
  sectionCharacteristics: string;
  textIds: string[];
}

export type ElementById = (id: string) => BaseElement | null;

/**
 * planning
 *
 */

export interface PlanningAction<ParamType = any> {
  thought: string;
  type: 'Find' | 'Tap' | 'Hover' | 'Input' | 'KeyboardPress' | 'Scroll' | 'Error';
  param: ParamType;
}

export interface PlanningAIResponse {
  queryLanguage: string;
  actions: PlanningAction[];
  error?: string;
}

export type PlanningActionParamTap = null;
export type PlanningActionParamHover = null;
export interface PlanningActionParamInputOrKeyPress {
  value: string;
}
export interface PlanningActionParamScroll {
  scrollType: 'ScrollUntilBottom' | 'ScrollUntilTop' | 'ScrollDown' | 'ScrollUp';
}

/**
 * misc
 */

export interface Color {
  name: string;
  hex: string;
}

export interface BaseAgentParserOpt {
  selector: string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PuppeteerParserOpt extends BaseAgentParserOpt {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PlaywrightParserOpt extends BaseAgentParserOpt {}

/*
action
*/

export interface ExecutionRecorderItem {
  type: 'screenshot';
  ts: number;
  screenshot?: string;
  timing?: string;
}

export type ExecutionTaskType = 'Planning' | 'Insight' | 'Action';

export interface ExecutorContext {
  task: ExecutionTask;
  element?: BaseElement | null;
}

export interface ExecutionTaskApply<
  Type extends ExecutionTaskType = any,
  TaskParam = any,
  TaskOutput = any,
  TaskLog = any,
> {
  type: Type;
  subType?: string;
  param?: TaskParam;
  executor: (
    param: TaskParam,
    context: ExecutorContext,
  ) => Promise<ExecutionTaskReturn<TaskOutput, TaskLog> | void> | void;
}

export interface ExecutionTaskReturn<TaskOutput = unknown, TaskLog = unknown> {
  output?: TaskOutput;
  log?: TaskLog;
  recorder?: ExecutionRecorderItem[];
}

export type ExecutionTask<E extends ExecutionTaskApply<any, any, any> = ExecutionTaskApply<any, any, any>> =
  E &
    ExecutionTaskReturn<
      E extends ExecutionTaskApply<any, any, infer TaskOutput, any> ? TaskOutput : unknown,
      E extends ExecutionTaskApply<any, any, any, infer TaskLog> ? TaskLog : unknown
    > & {
      status: 'pending' | 'running' | 'success' | 'fail' | 'cancelled';
      error?: string;
      timing?: {
        start: number;
        end?: number;
        cost?: number;
      };
    };

export interface ExecutionDump extends DumpMeta {
  name: string;
  description?: string;
  tasks: ExecutionTask[];
}

/*
task - insight-find
*/
export interface ExecutionTaskInsightFindParam {
  query: string;
}

export interface ExecutionTaskInsightFindOutput {
  element: BaseElement | null;
}

export interface ExecutionTaskInsightFindLog {
  dump?: InsightDump;
}

export type ExecutionTaskInsightFindApply = ExecutionTaskApply<
  'Insight',
  ExecutionTaskInsightFindParam,
  ExecutionTaskInsightFindOutput,
  ExecutionTaskInsightFindLog
>;

export type ExecutionTaskInsightFind = ExecutionTask<ExecutionTaskInsightFindApply>;

/*
task - insight-extract
*/
// export interface ExecutionTaskInsightExtractParam {
//   dataDemand: InsightExtractParam;
// }

// export interface ExecutionTaskInsightExtractOutput {
//   data: any;
// }

// export type ExecutionTaskInsightExtractApply = ExecutionTaskApply<
//   'insight-extract', // TODO: remove task-extract ?
//   ExecutionTaskInsightExtractParam
// >;

// export type ExecutionTaskInsightExtract = ExecutionTask<ExecutionTaskInsightExtractApply>;

export type ExecutionTaskInsight = ExecutionTaskInsightFind; // | ExecutionTaskInsightExtract;

/*
task - action (i.e. interact) 
*/
export type ExecutionTaskActionApply<ActionParam = any> = ExecutionTaskApply<
  'Action',
  ActionParam,
  void,
  void
>;

export type ExecutionTaskAction = ExecutionTask<ExecutionTaskActionApply>;

/*
task - planning
*/

export type ExectuionTaskPlanningParam = PlanningAIResponse;

export type ExecutionTaskPlanningApply = ExecutionTaskApply<
  'Planning',
  { userPrompt: string },
  { plans: PlanningAction[] }
>;

export type ExecutionTaskPlanning = ExecutionTask<ExecutionTaskPlanningApply>;

/*
Grouped dump
*/
export interface GroupedActionDump {
  groupName: string;
  executions: ExecutionDump[];
}
