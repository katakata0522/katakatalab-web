/**
 * AnalyticsManager
 * パフォーマンス計測とイベント追跡を行うユーティリティ。
 */

const IS_DEBUG = typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export class AnalyticsManager {
    /**
     * パフォーマンスを計測し、Analyticsへ送信
     * @param {string} name - 計測項目の名前
     * @param {number} value - 計測値 (ミリ秒など)
     */
    static trackPerformance(name, value) {
        if (IS_DEBUG) {
            console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);
        }

        if (typeof window.gtag === 'function') {
            window.gtag('event', 'performance_timing', {
                'event_category': 'Performance',
                'event_label': name,
                'value': Math.round(value)
            });
        }
    }

    /**
     * ユーザーアクションを追跡
     * @param {string} action - アクション名
     * @param {Object} params - 詳細情報
     */
    static trackEvent(action, params = {}) {
        if (IS_DEBUG) {
            console.log(`[Event] ${action}`, params);
        }

        if (typeof window.gtag === 'function') {
            window.gtag('event', action, params);
        }
    }
}
