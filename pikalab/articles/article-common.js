/**
 * PikaLab Articles - Common Interactive Features
 * Handles Dark Mode, Font Size Toggle, and Scroll to Top with full accessibility.
 */
(() => {
    'use strict';

    function initArticleUI() {
        const prefs = window.PikaLabArticlePreferences;

        // 1. Dark Mode Toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            const darkIcon = darkModeToggle.querySelector('.dark-icon');

            const updateDarkModeUI = (isDark) => {
                darkModeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
                darkModeToggle.title = isDark ? 'ライトモードに切替' : 'ダークモードに切替';
                if (darkIcon) {
                    darkIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
                }
            };

            // Check preferences or existing body class
            const isDarkActive = (prefs && prefs.get('pikalab-dark-mode') === 'true') ||
                document.body.classList.contains('dark-mode') ||
                document.body.classList.contains('theme-night');

            if (isDarkActive) {
                document.body.classList.add('dark-mode');
                updateDarkModeUI(true);
            } else {
                updateDarkModeUI(false);
            }

            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                if (prefs) prefs.set('pikalab-dark-mode', isDark);
                updateDarkModeUI(isDark);
            });
        }

        // 2. Font Size Toggle
        const fontSizeToggle = document.getElementById('font-size-toggle');
        if (fontSizeToggle) {
            const fontIcon = fontSizeToggle.querySelector('span');

            const updateFontSizeUI = (isLarge) => {
                fontSizeToggle.setAttribute('aria-pressed', isLarge ? 'true' : 'false');
                fontSizeToggle.title = isLarge ? '標準の文字サイズに戻す' : '文字サイズを拡大する';
                if (fontIcon) {
                    if (isLarge) {
                        fontIcon.classList.replace('text-[14px]', 'text-[18px]');
                        fontIcon.classList.replace('md:text-[15px]', 'md:text-[20px]');
                    } else {
                        fontIcon.classList.replace('text-[18px]', 'text-[14px]');
                        fontIcon.classList.replace('md:text-[20px]', 'md:text-[15px]');
                    }
                }
            };

            if (prefs && prefs.get('pikalab-large-text') === 'true') {
                document.body.classList.add('large-text');
                updateFontSizeUI(true);
            } else {
                updateFontSizeUI(false);
            }

            fontSizeToggle.addEventListener('click', () => {
                document.body.classList.toggle('large-text');
                const isLarge = document.body.classList.contains('large-text');
                if (prefs) prefs.set('pikalab-large-text', isLarge);
                updateFontSizeUI(isLarge);
            });
        }

        // 3. Scroll To Top
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            scrollTopBtn.tabIndex = -1; // Initially hidden from tab order
            let ticking = false;

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        if (window.scrollY > 400) {
                            scrollTopBtn.classList.add('visible');
                            scrollTopBtn.tabIndex = 0;
                        } else {
                            scrollTopBtn.classList.remove('visible');
                            scrollTopBtn.tabIndex = -1;
                        }
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });

            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArticleUI);
    } else {
        initArticleUI();
    }
})();
