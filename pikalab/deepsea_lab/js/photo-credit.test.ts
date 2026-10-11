import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AlbumManager } from './components/AlbumManager';
import { createDomFixture } from './test-support/dom-fixture';

vi.mock('./audio', () => ({ playSound: vi.fn() }));
vi.mock('./core/StorageManager', () => ({ StorageManager: class { load() { return []; } loadQuiz() { return []; } } }));
vi.mock('./utils/confetti', () => ({ ConfettiManager: class { fire() {} stop() {} } }));

let dom: ReturnType<typeof createDomFixture>;
let album: any;
beforeEach(() => {
    vi.useFakeTimers();
    dom = createDomFixture();
    vi.stubGlobal('document', dom.doc);
    vi.stubGlobal('window', dom.win);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    dom.make('sea-photo-credit');
    dom.make('sea-photo-credit-text');
    const anchor = dom.make('sea-photo-source', 'A');
    // hrefプロパティと属性を連動させ、リンク削除の検証が空振りしないようにする。
    Object.defineProperty(anchor, 'href', {
        get: () => anchor.getAttribute('href') || '',
        set: value => anchor.setAttribute('href', value),
    });
    album = new AlbumManager();
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function show(imageCredit: unknown, imageSourceUrl: unknown) {
    album.dataMap.creditTest = { id: 'creditTest', title: '試験画像', sizeRange: '1m', image: '', imageCredit, imageSourceUrl };
    album.showFact('creditTest', false);
}
function assertHidden() {
    expect(dom.ids.get('sea-photo-credit')!.classList.contains('hidden')).toBe(true);
    expect(dom.ids.get('sea-photo-credit-text')!.textContent).toBe('');
    const source = dom.ids.get('sea-photo-source')!;
    expect(source.hasAttribute('href')).toBe(false);
    expect(source.getAttribute('aria-hidden')).toBe('true');
    expect((source as any).tabIndex).toBe(-1);
}

it.each([
    'https://example.test/photo?a=1#credit',
    'http://example.test/photo',
    ' HTTPS://EXAMPLE.TEST/%E7%94%BB%E5%83%8F ',
    'https://例え.テスト/photo',
    'https://[::1]/photo',
    'https:example.test/photo',
])('有効なHTTP(S)出典と前後空白を含むクレジットを表示する: %s', value => {
    show('  Author <b>literal</b>  ', value);
    expect(dom.ids.get('sea-photo-credit')!.classList.contains('hidden')).toBe(false);
    expect(dom.ids.get('sea-photo-credit-text')!.textContent).toBe('Author <b>literal</b>');
    const source = dom.ids.get('sea-photo-source')!;
    expect(source.getAttribute('href')).toBe(new URL(value.trim()).href);
    expect(source.hasAttribute('aria-hidden')).toBe(false);
    expect((source as any).tabIndex).toBe(0);
});

it.each([
    undefined, null, '', '   ', 42,
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>', 'file:///tmp/photo',
    'mailto:author@example.test', 'ftp://example.test/photo',
    '/photo', '//example.test/photo', 'https://', 'https://bad host/', 'https://example.test:99999/',
])('不正な出典で前項目のリンクを消し、次の有効項目で復帰する: %s', value => {
    show('Author', 'https://example.test/old');
    expect(dom.ids.get('sea-photo-source')!.hasAttribute('href')).toBe(true);
    show('Author', value);
    assertHidden();
    show('Next', 'http://example.test/next');
    expect(dom.ids.get('sea-photo-source')!.getAttribute('href')).toBe('http://example.test/next');
    expect(dom.ids.get('sea-photo-credit-text')!.textContent).toBe('Next');
    expect(dom.ids.get('sea-photo-credit')!.classList.contains('hidden')).toBe(false);
});

it.each([undefined, null, '', ' \n\t ', 42])('空または不正なクレジットでは出典を表示しない: %s', value => {
    show('Author', 'https://example.test/old');
    show(value, 'https://example.test/photo');
    assertHidden();
});

it('任意のクレジット欄が存在しないページでも例外を出さない', () => {
    for (const id of ['sea-photo-credit', 'sea-photo-credit-text', 'sea-photo-source']) dom.ids.delete(id);
    expect(() => show('Author', 'https://example.test/photo')).not.toThrow();
    expect(() => show('Author', 'javascript:alert(1)')).not.toThrow();
});
