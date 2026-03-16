import { createJsonStore } from './jsonStore.js';

const store = createJsonStore('profiles.json');

export const getProfilesPath = store.getPath;
export const loadProfiles = store.load;
export const saveProfiles = store.save;
