import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { KnowledgeItem, OFFICIAL_BOOK_DATA } from '../utils/electionLogic';

const firebaseConfig = {
  apiKey: 'AIzaSyCpaVUr0GryvkhukV2jyJowTIX7hh3j1eQ',
  authDomain: 'bau-cu-hoi-an-dong.firebaseapp.com',
  projectId: 'bau-cu-hoi-an-dong',
  storageBucket: 'bau-cu-hoi-an-dong.firebasestorage.app',
  messagingSenderId: '736515363687',
  appId: '1:736515363687:web:331e3d4abe6fd0f93315c2',
};

export const APP_ID = 'ung-dung-bau-cu-hoi-an-dong';
const LOCAL_STORAGE_KEY = 'hoi_an_dong_kb_v1';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error('Lỗi khởi tạo Firebase:', e);
}

export {
  auth,
  db,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
};
export type { FirebaseUser };

export function loadLocalKnowledgeBase(): KnowledgeItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read local knowledge base:', e);
  }
  return OFFICIAL_BOOK_DATA;
}

export function saveLocalKnowledgeBase(items: KnowledgeItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not save local knowledge base:', e);
  }
}
