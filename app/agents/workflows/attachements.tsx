import { StateGraph, END, addMessages, BaseMessage, HumanMessage, State } from '@langchain/langgraph';
import { detectMapImage, overlayMapImage } from '@/lib/utils/map-utils';

type AttachmentState = {
  messages: BaseMessage[];
  isMap: boolean;
  overlayData: any;
}

const attachmentWorkflow = new StateGraph<AttachmentState>();

// Entry point
attachmentWorkflow.setEntryPoint('attachmentInput');

// Nodes
attachmentWorkflow.addNode('attachmentInput', async state => {
  const imageAttachment = state.messages.find(
    message => message.type === 'image'
  );

  if (imageAttachment) {
    state.isMap = await detectMapImage(imageAttachment.content);
    if (state.isMap) {
      state.overlayData = await overlayMapImage(imageAttachment.content);
    }
  }

  return state;
});

attachmentWorkflow.addNode('mapboxOverlay', state => {
  if (state.isMap && state.overlayData) {
    // Logic to overlay map images on Mapbox
    // This is a placeholder, actual implementation will depend on the Mapbox API
    console.log('Overlaying map image on Mapbox', state.overlayData);
  }
  return state;
});

// Edges
attachmentWorkflow.addEdge('attachmentInput', 'mapboxOverlay');

// Compile
export const attachmentGraph = attachmentWorkflow.compile();
