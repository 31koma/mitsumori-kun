import { type ConstructionProject } from '../types';

const DB_NAME = 'mitsumori_kun_db';
const STORE_NAME = 'construction_projects';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('IndexedDBを開くことができませんでした。'));
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export const constructionDB = {
    async saveProject(project: ConstructionProject): Promise<void> {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(project);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error('案件データの保存に失敗しました。'));
            };
        });
    },

    async getProject(id: string): Promise<ConstructionProject | null> {
        if (!id) return null;
        const db = await openDB();
        return new Promise<ConstructionProject | null>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(new Error('案件データの取得に失敗しました。'));
            };
        });
    },

    async getAllProjects(): Promise<ConstructionProject[]> {
        const db = await openDB();
        return new Promise<ConstructionProject[]>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // 更新日時の降順（新しい順）で並び替え
                const projects = (request.result || []) as ConstructionProject[];
                projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                resolve(projects);
            };

            request.onerror = () => {
                reject(new Error('案件一覧の取得に失敗しました。'));
            };
        });
    },

    async deleteProject(id: string): Promise<void> {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error('案件データの削除に失敗しました。'));
            };
        });
    }
};
