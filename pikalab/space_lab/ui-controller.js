// ============================================================
// ほしぞら・アドベンチャー - ui-controller.js
// DOM/UI制御モジュール
// ============================================================

export const UI = {
    DOM: {},

    init() {
        this.DOM = {
            loadingOverlay:      document.getElementById('loading-overlay'),
            loadingBarContainer: document.getElementById('loading-bar-container'),
            startBtn:            document.getElementById('start-adventure-btn'),
            bgLayer:             document.getElementById('bg-layer'),
            starsLayer:          document.getElementById('stars-layer'),
            canvas:              document.getElementById('space-canvas'),
            a11yContainer:       document.getElementById('a11y-container'),
            warpOverlay:         document.getElementById('warp-overlay'),
            modal:               document.getElementById('planet-detail-modal'),
            modalBody:           document.getElementById('modal-body'),
            closeBtn:            document.getElementById('close-modal-btn'),
            celOverlay:          document.getElementById('celebration-overlay'),
            celBox:              document.getElementById('celebration-box'),
            closeCelBtn:         document.getElementById('close-celebration-btn'),
            scrollHint:          document.getElementById('scroll-hint'),
            btnSecretColumn:     document.getElementById('btn-secret-column'),
            secretModal:         document.getElementById('secret-modal'),
            btnCloseSecret:      document.getElementById('btn-close-secret'),
            secretTabsContainer: document.getElementById('secret-tabs-container'),
            secretContentArea:   document.getElementById('secret-content-area'),
            headerBadgeBtn:      document.getElementById('header-badge-btn'),
            headerBadgeDot:      document.getElementById('header-badge-dot'),
            badgeStatusContainer: document.getElementById('badge-status-container'),
            miniMap:             document.getElementById('minimap-container'),
            minimapMarkers:      document.getElementById('minimap-markers'),
            miniIndicator:       document.getElementById('minimap-indicator'),
            ufoBtn:              document.getElementById('ufo-btn'),
            ufoModal:            document.getElementById('ufo-modal'),
            closeUfoBtn:         document.getElementById('close-ufo-btn'),
            boundaryWarningLeft:  document.getElementById('boundary-warning-left'),
            boundaryWarningRight: document.getElementById('boundary-warning-right'),
            stamp:               document.getElementById('stamp-effect'),
            quiz: {
                section: document.getElementById('quiz-section'),
                q:       document.getElementById('quiz-question'),
                options: document.getElementById('quiz-options'),
                res:     document.getElementById('quiz-result'),
                icon:    document.getElementById('quiz-result-icon'),
                text:    document.getElementById('quiz-result-text'),
                exp:     document.getElementById('quiz-result-explanation'),
                btn:     document.getElementById('quiz-continue-btn'),
                retryBtn: document.getElementById('quiz-retry-btn')
            },
            bgmToggleBtn:        document.getElementById('bgm-toggle-btn'),
            bgmIconOn:           document.getElementById('bgm-icon-on'),
            bgmIconOff:          document.getElementById('bgm-icon-off'),
            warpNextBtn:         document.getElementById('warp-next-btn'),
            closeModalBottomBtn: document.getElementById('close-modal-bottom-btn'),
            
            // PWA Updates
            pwaToast:            document.getElementById('pwa-toast'),
            pwaRefreshBtn:       document.getElementById('pwa-refresh-btn'),
            pwaCloseBtn:         document.getElementById('pwa-close-btn'),

            // Loading Elements
            loadingProgressBar:  document.getElementById('loading-progress-bar'),
            loadingPercentage:   document.getElementById('loading-percentage'),
            loadingStatusFeed:   document.getElementById('loading-status-feed'),

            // Planet Detail Elements
            detail: {
                image:        document.getElementById('detail-image'),
                type:         document.getElementById('detail-type'),
                name:         document.getElementById('detail-name'),
                desc:         document.getElementById('detail-desc'),
                size:         document.getElementById('detail-size'),
                distance:     document.getElementById('detail-distance'),
                temp:         document.getElementById('detail-temp'),
                trivia:       document.getElementById('detail-trivia'),
                credit:       document.getElementById('detail-credit'),
                realPhotoBtn: document.getElementById('real-photo-btn')
            }
        };
    }
};
