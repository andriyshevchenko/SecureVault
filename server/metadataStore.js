import { createJsonStore } from './jsonStore.js';

const store = createJsonStore('metadata.json');

export const getMetadataPath = store.getPath;
export const loadMetadata = store.load;
export const saveMetadata = store.save;
