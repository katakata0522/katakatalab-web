import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from './StorageManager';

describe('StorageManager', () => {
    let storageManager: StorageManager;
    let mockStorage: Record<string, string>;

    beforeEach(() => {
        mockStorage = {};

        // localStorage のモック
        const localStorageMock = {
            getItem: vi.fn((key: string) => mockStorage[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                mockStorage[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete mockStorage[key];
            }),
            clear: vi.fn(() => {
                mockStorage = {};
            })
        };

        vi.stubGlobal('localStorage', localStorageMock);
        
        storageManager = new StorageManager();
    });

    it('should return empty array if no data exists', () => {
        expect(storageManager.load()).toEqual([]);
    });

    it('should correctly save and load data with versioning', () => {
        const testData = ['shark', 'whale'];
        const saveResult = storageManager.save(testData);
        
        expect(saveResult).toBe(true);
        expect(storageManager.load()).toEqual(testData);

        // Saved payload should have the version structure
        const raw = JSON.parse(mockStorage['deepsea_captured_ids']);
        expect(raw.v).toBe(1);
        expect(raw.data).toEqual(testData);
    });

    it('should clear data', () => {
        storageManager.save(['squid']);
        expect(storageManager.load()).toEqual(['squid']);
        
        const clearResult = storageManager.clear();
        expect(clearResult).toBe(true);
        expect(storageManager.load()).toEqual([]);
    });
});

describe('保存済みIDの形の検証', () => {
    it.each([null, {}, 'shark', 42])('配列以外のdata=%jを空配列として扱う', (data) => {
        vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ v: 1, data }) });
        expect(new StorageManager().load()).toEqual([]);
        vi.unstubAllGlobals();
    });

    it('現在形式・旧形式・クイズから文字列でないIDを除く', () => {
        const ids = ['shark', null, 2, {}, '', 'whale'];
        const setItem = vi.fn();
        const getItem = vi.fn().mockReturnValue(JSON.stringify({ v: 1, data: ids }));
        vi.stubGlobal('localStorage', { getItem, setItem });
        const storage = new StorageManager();
        expect(storage.load()).toEqual(['shark', 'whale']);
        getItem.mockReturnValue(JSON.stringify(ids));
        expect(storage.load()).toEqual(['shark', 'whale']);
        expect(JSON.parse(setItem.mock.calls[0][1]).data).toEqual(['shark', 'whale']);
        expect(storage.loadQuiz()).toEqual(['shark', 'whale']);
        vi.unstubAllGlobals();
    });
});
