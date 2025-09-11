import React, { createContext } from 'react';

// Storage Keys
export const FOLDERS_STORAGE_KEY = 'quizAppFolders';
export const CURRENT_ROLE_STORAGE_KEY = 'quizAppCurrentRole';
export const DRAFT_STORAGE_KEY = 'quizAppDrafts';
export const CHILD_SESSION_KEY = 'quizAppChildSessionId';
export const DEFAULT_PER_Q_SECONDS = 15;

// App Context for shared state
export const AppContext = createContext(null);
