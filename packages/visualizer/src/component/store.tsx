import * as Z from 'zustand';
// import { createStore } from 'zustand/vanilla';
import type {
  BaseElement,
  ExecutionTask,
  ExecutionTaskInsightLocate,
  GroupedActionDump,
  InsightDump,
} from '../../../midscene/dist/types';

const { create } = Z;
export const useBlackboardPreference = create<{
  bgVisible: boolean;
  elementsVisible: boolean;
  setBgVisible: (visible: boolean) => void;
  setTextsVisible: (visible: boolean) => void;
}>((set) => ({
  bgVisible: true,
  elementsVisible: false,
  setBgVisible: (visible: boolean) => {
    set({ bgVisible: visible });
  },
  setTextsVisible: (visible: boolean) => {
    set({ elementsVisible: visible });
  },
}));

export const useExecutionDump = create<{
  dump: GroupedActionDump | null;
  setGroupedDump: (dump: GroupedActionDump) => void;
  activeTask: ExecutionTask | null;
  setActiveTask: (task: ExecutionTask) => void;
  hoverTask: ExecutionTask | null;
  hoverTimestamp: number | null;
  setHoverTask: (task: ExecutionTask | null, timestamp?: number | null) => void;
  hoverPreviewConfig: { x: number; y: number } | null;
  setHoverPreviewConfig: (config: { x: number; y: number } | null) => void;
  reset: () => void;
}>((set, get) => {
  const initData = {
    dump: null,
    activeTask: null,
    hoverTask: null,
    hoverTimestamp: null,
    hoverPreviewConfig: null,
  };

  const syncToInsightDump = (dump: InsightDump) => {
    const { loadData } = useInsightDump.getState();
    loadData(dump);
  };

  const resetInsightDump = () => {
    const { reset } = useInsightDump.getState();
    reset();
  };

  return {
    ...initData,
    setGroupedDump: (dump: GroupedActionDump) => {
      console.log('will set ExecutionDump', dump);
      set({
        ...initData,
        dump,
      });
      resetInsightDump();

      // set the first task as selected
      if (
        dump &&
        dump.executions.length > 0 &&
        dump.executions[0].tasks.length > 0
      ) {
        get().setActiveTask(dump.executions[0].tasks[0]);
      }
    },
    setActiveTask(task: ExecutionTask) {
      set({ activeTask: task });
      console.log('task set', task);
      if (task.type === 'Insight') {
        syncToInsightDump((task as ExecutionTaskInsightLocate).log?.dump!);
      } else {
        resetInsightDump();
      }
    },
    setHoverTask(task: ExecutionTask | null, timestamp?: number | null) {
      set({ hoverTask: task, hoverTimestamp: timestamp || null });
    },
    setHoverPreviewConfig(config: { x: number; y: number } | null) {
      if (config) {
        set({
          hoverPreviewConfig: {
            x: Math.floor(config.x),
            y: Math.floor(config.y),
          },
        });
      } else {
        set({ hoverPreviewConfig: null });
      }
    },
    reset: () => {
      set(initData);
      resetInsightDump();
    },
  };
});

export const useAllCurrentTasks = (): ExecutionTask[] => {
  const groupedDump = useExecutionDump((store) => store.dump);
  if (!groupedDump) return [];

  const tasksInside = groupedDump.executions.reduce<ExecutionTask[]>(
    (acc2, execution) => acc2.concat(execution.tasks),
    [],
  );

  return tasksInside;
};

export const useInsightDump = create<{
  _loadId: number;
  data: InsightDump | null;
  highlightSectionNames: string[];
  setHighlightSectionNames: (sections: string[]) => void;
  highlightElements: BaseElement[];
  setHighlightElements: (elements: BaseElement[]) => void;
  loadData: (data: InsightDump) => void;
  reset: () => void;
}>((set) => {
  let loadId = 0;
  const initData = {
    _loadId: 0,
    highlightSectionNames: [],
    highlightElements: [],
    data: null,
  };

  return {
    ...initData,
    loadData: (data: InsightDump) => {
      // console.log('will load dump data');
      // console.log(data);
      set({
        _loadId: ++loadId,
        data,
        highlightSectionNames: [],
        highlightElements: [],
      });
    },
    setHighlightSectionNames: (sections: string[]) => {
      set({ highlightSectionNames: sections });
    },
    setHighlightElements: (elements: BaseElement[]) => {
      set({ highlightElements: elements });
    },
    reset: () => {
      set(initData);
    },
  };
});
