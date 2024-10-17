'use client';
import './player.less';
import { mousePointer, paramStr, typeStr } from '@/utils';
import type {
  ExecutionDump,
  ExecutionTaskInsightLocate,
  ExecutionTaskPlanning,
  InsightDump,
  Rect,
} from '@midscene/core/.';

export interface CameraState {
  left: number;
  top: number;
  width: number;
  pointer: {
    left: number;
    top: number;
  };
}

export type TargetCameraState = Omit<CameraState, 'pointer'> &
  Partial<Pick<CameraState, 'pointer'>>;

export interface AnimationScript {
  type:
    | 'img'
    | 'insight'
    | 'clear-insight'
    | 'pointer'
    | 'spinning-pointer'
    | 'sleep';
  img?: string;
  camera?: TargetCameraState;
  insightDump?: InsightDump;
  duration: number;
  insightCameraDuration?: number;
  title?: string;
  subTitle?: string;
}

const stillDuration = 1200;
const stillAfterInsightDuration = 300;
const locateDuration = 800;
const actionDuration = 1000;
const clearInsightDuration = 200;

// fit rect to camera
export const cameraStateForRect = (
  rect: Rect,
  imageWidth: number,
  imageHeight: number,
): TargetCameraState => {
  const canvasRatio = imageWidth / imageHeight;
  const rectRatio = rect.width / rect.height;

  let rectWidthOnPage: number;

  if (rectRatio >= canvasRatio) {
    rectWidthOnPage = rect.width;
  } else {
    rectWidthOnPage = (rect.height / imageHeight) * imageWidth;
  }

  const cameraPaddingRatio =
    rectWidthOnPage > 400 ? 0.1 : rectWidthOnPage > 50 ? 0.2 : 0.3;
  const cameraWidth = Math.min(
    imageWidth,
    rectWidthOnPage + imageWidth * cameraPaddingRatio * 2,
  );
  const cameraHeight = cameraWidth * (imageHeight / imageWidth);

  let left = Math.min(
    rect.left - imageWidth * cameraPaddingRatio,
    imageWidth - cameraWidth,
  );
  left = Math.max(left, 0);

  let top = Math.min(
    rect.top - imageHeight * cameraPaddingRatio,
    imageHeight - cameraHeight,
  );
  top = Math.max(top, 0);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cameraWidth),
  };
};

export const mergeTwoCameraState = (
  cameraState1: TargetCameraState,
  cameraState2: TargetCameraState,
): TargetCameraState => {
  const newLeft = Math.min(cameraState1.left, cameraState2.left);
  const newTop = Math.min(cameraState1.top, cameraState2.top);
  const newRight = Math.max(
    cameraState1.left + cameraState1.width,
    cameraState2.left + cameraState2.width,
  );
  const newWidth = newRight - newLeft;
  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
  };
};

export const generateAnimationScripts = (
  execution: ExecutionDump | null,
  imageWidth: number,
  imageHeight: number,
): AnimationScript[] | null => {
  if (!execution) return null;
  if (imageWidth === 0 || imageHeight === 0) {
    return null;
  }

  const fullPageCameraState = cameraStateForRect(
    {
      left: 0,
      top: 0,
      width: imageWidth,
      height: imageHeight,
    },
    imageWidth,
    imageHeight,
  );

  const pointerScript = (
    img: string,
    title: string,
    subTitle: string,
  ): AnimationScript => {
    return {
      type: 'pointer',
      img,
      duration: 0,
      title,
      subTitle,
    };
  };

  if (execution.tasks.length === 1 && execution.tasks[0].subType === 'Query') {
    console.log('query task', execution.tasks[0]);
    return [];
  }
  const scripts: AnimationScript[] = [];
  let insightCameraState: TargetCameraState | undefined = undefined;
  let currentCameraState: TargetCameraState = fullPageCameraState;
  let insightOnTop = false;
  const taskCount = execution.tasks.length;
  let initSubTitle = '';
  execution.tasks.forEach((task, index) => {
    if (task.type === 'Planning') {
      const planningTask = task as ExecutionTaskPlanning;
      if (planningTask.recorder && planningTask.recorder.length > 0) {
        scripts.push({
          type: 'img',
          img: planningTask.recorder?.[0]?.screenshot,
          camera: fullPageCameraState,
          duration: stillDuration,
          title: typeStr(task),
          subTitle: paramStr(task),
        });
        initSubTitle = paramStr(task);
      }
    } else if (task.type === 'Insight') {
      const insightTask = task as ExecutionTaskInsightLocate;
      const resultElement = insightTask.output?.element;
      const title = typeStr(task);
      const subTitle = paramStr(task);
      if (resultElement?.rect) {
        insightCameraState = {
          ...cameraStateForRect(resultElement.rect, imageWidth, imageHeight),
          pointer: {
            left: resultElement.center[0],
            top: resultElement.center[1],
          },
        };
      }
      if (insightTask.log?.dump) {
        const insightDump = insightTask.log.dump;
        if (!insightDump?.context?.screenshotBase64) {
          throw new Error('insight dump is required');
        }
        const insightContentLength = insightDump.context.content.length;

        if (insightDump.context.screenshotBase64WithElementMarker) {
          // show the original screenshot first
          scripts.push({
            type: 'img',
            img: insightDump.context.screenshotBase64,
            duration: stillAfterInsightDuration,
            title,
            subTitle,
          });
        }

        scripts.push({
          type: 'insight',
          img:
            insightDump.context.screenshotBase64WithElementMarker ||
            insightDump.context.screenshotBase64,
          insightDump: insightDump,
          camera:
            currentCameraState === fullPageCameraState || !insightCameraState
              ? undefined
              : mergeTwoCameraState(currentCameraState, insightCameraState),
          duration:
            insightContentLength > 20 ? locateDuration : locateDuration * 0.5,
          insightCameraDuration: locateDuration,
          title,
          subTitle,
        });

        scripts.push({
          type: 'sleep',
          duration: stillAfterInsightDuration,
          title,
          subTitle,
        });
        insightOnTop = true;
      }
    } else if (task.type === 'Action') {
      const title = typeStr(task);
      const subTitle = paramStr(task);
      scripts.push(pointerScript(mousePointer, title, subTitle));

      currentCameraState = insightCameraState ?? fullPageCameraState;
      scripts.push({
        type: 'img',
        img: task.recorder?.[0]?.screenshot,
        duration: actionDuration,
        camera: insightCameraState,
        title,
        subTitle,
      });

      if (insightOnTop) {
        scripts.push({
          type: 'clear-insight',
          duration: clearInsightDuration,
          title,
          subTitle,
        });
        insightOnTop = false;
      }

      // if this is the last task, we don't need to wait
      const imgStillDuration = index < taskCount - 1 ? stillDuration : 0;

      if (task.recorder?.[1]?.screenshot) {
        scripts.push({
          type: 'spinning-pointer',
          duration: stillDuration,
          title,
          subTitle,
        });

        scripts.push(pointerScript(mousePointer, title, subTitle));
        scripts.push({
          type: 'img',
          img: task.recorder?.[1]?.screenshot,
          duration: imgStillDuration,
          title,
          subTitle,
        });
      } else {
        scripts.push({
          type: 'sleep',
          duration: imgStillDuration,
          title,
          subTitle,
        });
      }
    }
  });

  // end, back to full page
  scripts.push({
    title: 'Done',
    subTitle: initSubTitle,
    type: 'img',
    duration: stillDuration,
    camera: fullPageCameraState,
  });

  return scripts;
};
