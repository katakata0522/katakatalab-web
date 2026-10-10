/* ==========================================================================
   Katakata Font-Lab - Interactive Typography Simulator & Tools (v4.0.0)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Dark Mode System ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkIcon = darkModeToggle ? darkModeToggle.querySelector('.material-symbols-rounded') : null;

    const updateDarkModeUI = (isDark) => {
        document.body.classList.toggle('dark-mode', isDark);
        if (!darkIcon) return;
        darkIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
        darkIcon.style.color = isDark ? '#f59e0b' : '';
    };

    let savedDark = null;
    try { savedDark = localStorage.getItem('fontlab-dark-mode'); } catch (e) {}
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let isDarkMode = savedDark === 'true' || (savedDark === null && systemDark);
    updateDarkModeUI(isDarkMode);

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            try {
                localStorage.setItem('fontlab-dark-mode', isDarkMode);
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            } catch (e) {}
            updateDarkModeUI(isDarkMode);
        });
    }

    // --- 2. Device View Simulator ---
    const desktopBtn = document.getElementById('btn-desktop');
    const mobileBtn = document.getElementById('btn-mobile');
    const previewContainer = document.getElementById('preview-container');

    if (desktopBtn && mobileBtn && previewContainer) {
        desktopBtn.addEventListener('click', () => {
            desktopBtn.classList.add('active');
            mobileBtn.classList.remove('active');
            previewContainer.classList.remove('mobile-mode');
        });

        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.add('active');
            desktopBtn.classList.remove('active');
            previewContainer.classList.add('mobile-mode');
        });
    }

    // --- 3. On-Demand Dynamic Font Lazy Loading System ---
    const FONTS = {
        "'Zen Maru Gothic', sans-serif": {
            query: 'Zen+Maru+Gothic:wght@400;500;700;900',
            weights: ['400', '500', '700', '900'],
            author: 'Yoshimichi Ohira',
            page: 'https://fonts.google.com/specimen/Zen+Maru+Gothic',
            preload: true
        },
        "'M PLUS Rounded 1c', sans-serif": {
            query: 'M+PLUS+Rounded+1c:wght@500;700;900',
            weights: ['500', '700', '900'],
            author: 'Coji Morishita / M+ Fonts Project',
            page: 'https://fonts.google.com/specimen/M+PLUS+Rounded+1c'
        },
        "'Noto Sans JP', sans-serif": {
            query: 'Noto+Sans+JP:wght@400;500;700;900',
            weights: ['400', '500', '700', '900'],
            author: 'Google / Adobe',
            page: 'https://fonts.google.com/specimen/Noto+Sans+JP'
        },
        "'Kiwi Maru', serif": {
            query: 'Kiwi+Maru:wght@300;400;500',
            weights: ['300', '400', '500'],
            author: 'Hiroki-Chan',
            page: 'https://fonts.google.com/specimen/Kiwi+Maru'
        },
        "'Yomogi', cursive": {
            query: 'Yomogi',
            weights: ['400'],
            author: 'Satsuyako',
            page: 'https://fonts.google.com/specimen/Yomogi'
        },
        "'Dela Gothic One', sans-serif": {
            query: 'Dela+Gothic+One',
            weights: ['400'],
            author: 'artakana',
            page: 'https://fonts.google.com/specimen/Dela+Gothic+One'
        },
        "'Hachi Maru Pop', cursive": {
            query: 'Hachi+Maru+Pop',
            weights: ['400'],
            author: 'Nonty',
            page: 'https://fonts.google.com/specimen/Hachi+Maru+Pop'
        }
    };

    const fontUrlMap = Object.fromEntries(
        Object.entries(FONTS).filter(([, meta]) => !meta.preload).map(([family, meta]) => [family, meta.query])
    );

    const loadedFonts = new Set(Object.entries(FONTS).filter(([, meta]) => meta.preload).map(([family]) => family));

    // Cache pending font promises to prevent duplicate stylesheet element injection
    const pendingFonts = {};

    const loadFontOnDemand = (fontFamily) => {
        if (loadedFonts.has(fontFamily)) return Promise.resolve();
        if (pendingFonts[fontFamily]) return pendingFonts[fontFamily];

        const promise = new Promise((resolve) => {
            const fontQuery = FONTS[fontFamily] && !FONTS[fontFamily].preload
                ? FONTS[fontFamily].query
                : fontUrlMap[fontFamily];
            if (!fontQuery) {
                resolve();
                return;
            }
            const linkUrl = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;

            // Create and append link tag dynamically
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = linkUrl;
            link.onload = () => {
                loadedFonts.add(fontFamily);
                delete pendingFonts[fontFamily];
                resolve();
            };
            link.onerror = () => {
                console.error(`Failed to load font: ${fontFamily}`);
                delete pendingFonts[fontFamily];
                resolve(); // Resolve anyway to avoid loading hangs
            };
            document.head.appendChild(link);
        });

        pendingFonts[fontFamily] = promise;
        return promise;
    };

    // --- 4. Simulator Controls & DOM Elements ---
    const fontSelect = document.getElementById('select-font');
    const sizeSlider = document.getElementById('slider-size');
    const weightSelect = document.getElementById('select-weight');
    const spacingSlider = document.getElementById('slider-spacing');
    const heightSlider = document.getElementById('slider-height');

    const valSize = document.getElementById('val-size');
    const valSpacing = document.getElementById('val-spacing');
    const valHeight = document.getElementById('val-height');

    const previewTitle = document.getElementById('preview-title');
    const previewPara = document.getElementById('preview-paragraph');
    const previewBtn = document.getElementById('preview-button');
    const outputCss = document.getElementById('output-css');
    const outputHtml = document.getElementById('output-html');
    const copyBtn = document.getElementById('copy-css-btn');
    const fontLoadStatus = document.getElementById('font-load-status');

    // Multi-task counter to prevent race conditions during rapid select switching
    let activeLoadTaskId = 0;
    
    // Cached unhighlighted raw text code strings for absolute copy fidelity
    let rawCSSCode = '';
    let rawHTMLCode = '';

    // Available weights per font (to dynamically filter select option)
    const updateWeightOptions = (selectedFont) => {
        const weights = (FONTS[selectedFont] && FONTS[selectedFont].weights) || ['400'];
        const currentVal = weightSelect.value;
        
        weightSelect.innerHTML = '';
        weights.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.textContent = w === '400' && weights.length === 1 ? 'Regular (400のみ)' : w;
            weightSelect.appendChild(opt);
        });

        if (weights.includes(currentVal)) {
            weightSelect.value = currentVal;
        } else {
            weightSelect.value = weights.includes('700') ? '700' : weights[0];
        }
    };

    const generateCSSString = (font, size, weight, spacing, height) => {
        return `.font-lab-custom {
    font-family: ${font};
    font-size: ${size}px;
    font-weight: ${weight};
    letter-spacing: ${spacing}em;
    line-height: ${height};
    font-feature-settings: "palt", "chws";
}`;
    };

    const generateLicenseComment = (font) => {
        const note = FONTS[font] || {
            author: '各作者',
            page: 'https://fonts.google.com/'
        };
        return `<!-- 配布元: Google Fonts / 作者: ${note.author}
     日本語書体の多くは SIL OFL（個別の条文は Google Fonts の各ページで確認）
     改変して再配布する場合は Reserved Font Name に注意
     ${note.page} -->`;
    };

    const generateHTMLString = (font) => {
        const licenseComment = generateLicenseComment(font);
        if (font.includes('Zen Maru Gothic')) {
            return `${licenseComment}
<!-- Zen Maru Gothic is preloaded synchronously -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet">`;
        }
        const query = fontUrlMap[font] || "Zen+Maru+Gothic";
        return `${licenseComment}
<!-- Dynamic Lazy-Load Import Tag -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${query}&display=swap" rel="stylesheet">`;
    };

    // --- 5. Code Highlight Tokens (Regex Based Lightweight Highlighter) ---
    const highlightCSS = (code) => {
        return code
            .replace(/(\.[a-zA-Z0-9_-]+)/g, '<span class="hl-selector">$1</span>')
            .replace(/([a-zA-Z0-9_-]+)(?=\s*:)/g, '<span class="hl-property">$1</span>')
            .replace(/(:\s*)([^;}\n]+)/g, '$1<span class="hl-value">$2</span>')
            .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    };

    const highlightHTML = (code) => {
        return code
            .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>')
            .replace(/(&lt;\/?[a-zA-Z0-9_-]+)(&gt;)?/g, '<span class="hl-tag">$1</span>$2')
            .replace(/([a-zA-Z0-9_-]+)(?==)/g, '<span class="hl-attr">$1</span>')
            .replace(/(".*?")/g, '<span class="hl-string">$1</span>');
    };

    const escapeHTML = (text) => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const applyTypography = () => {
        if (!fontSelect || !previewContainer) return;
        const font = fontSelect.value;
        const size = sizeSlider.value;
        const weight = weightSelect.value;
        const spacing = spacingSlider.value;
        const height = heightSlider.value;

        // Accessibility: Update slider current state values dynamically
        sizeSlider.setAttribute('aria-valuenow', size);
        spacingSlider.setAttribute('aria-valuenow', spacing);
        heightSlider.setAttribute('aria-valuenow', height);

        // Update display labels
        valSize.textContent = `${size}px`;
        valSpacing.textContent = `${spacing}em`;
        valHeight.textContent = height;

        // 💡 ADVANCED: Race condition secure Font Load and spinner control
        const currentTaskId = ++activeLoadTaskId;

        if (!loadedFonts.has(font)) {
            // Activate status spinner
            fontLoadStatus.classList.remove('success');
            fontLoadStatus.classList.add('active');
            fontLoadStatus.querySelector('.status-text').textContent = 'フォント適用中...';
            previewContainer.classList.add('loading');

            loadFontOnDemand(font).then(() => {
                // If a newer font is selected during network load, abort this task!
                if (currentTaskId !== activeLoadTaskId) return;

                const weightLabel = weight === '900' ? '900' : (weight === '700' ? '700' : '400');
                const cleanFontName = font.split(',')[0].replace(/'/g, "");
                
                const markReady = () => {
                    if (currentTaskId !== activeLoadTaskId) return;
                    fontLoadStatus.querySelector('.status-text').textContent = '適用完了！';
                    fontLoadStatus.classList.add('success');
                    previewContainer.classList.remove('loading');
                    window.setTimeout(() => {
                        if (currentTaskId === activeLoadTaskId) {
                            fontLoadStatus.classList.remove('active');
                        }
                    }, 1200);
                };

                const loadFace = document.fonts && typeof document.fonts.load === 'function'
                    ? document.fonts.load(`${weightLabel} 1em "${cleanFontName}"`)
                    : Promise.resolve();

                loadFace.then(markReady).catch(markReady);
            });
        } else {
            // Already cached, safely ensure loader spinner is inactive
            fontLoadStatus.classList.remove('active');
            previewContainer.classList.remove('loading');
        }

        // Apply styles to main preview paper
        previewContainer.style.fontFamily = font;
        previewTitle.style.fontSize = `${Math.round(size * 1.5)}px`;
        previewTitle.style.fontWeight = weight === '900' ? '900' : (weight === '700' ? '700' : '500');
        previewTitle.style.letterSpacing = `${spacing}em`;
        previewTitle.style.lineHeight = height;

        previewPara.style.fontSize = `${size}px`;
        previewPara.style.fontWeight = weight;
        previewPara.style.letterSpacing = `${spacing}em`;
        previewPara.style.lineHeight = height;

        previewBtn.style.fontFamily = font;
        previewBtn.style.fontWeight = weight === '900' ? '900' : '700';

        // Cache raw code strings
        rawCSSCode = generateCSSString(font, size, weight, spacing, height);
        rawHTMLCode = generateHTMLString(font);

        // Inject colorized rich highlight code
        outputCss.innerHTML = highlightCSS(rawCSSCode);
        outputHtml.innerHTML = highlightHTML(escapeHTML(rawHTMLCode));
    };

    // --- 6. Code Copy Tabs Manager ---
    const tabButtons = document.querySelectorAll('.code-tab-btn');
    const tabPanels = document.querySelectorAll('.code-tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            document.getElementById(`panel-${targetTab}`).classList.add('active');
        });
    });

    // --- 7. 見本市は書体別サンプル文を残し、フォントだけ遅延読み込みする ---
    fontSelect.addEventListener('change', () => {
        updateWeightOptions(fontSelect.value);
        applyTypography();
    });

    sizeSlider.addEventListener('input', applyTypography);
    weightSelect.addEventListener('change', applyTypography);
    spacingSlider.addEventListener('input', applyTypography);
    heightSlider.addEventListener('input', applyTypography);

    updateWeightOptions(fontSelect.value);
    applyTypography();

    const showcase = document.getElementById('section-showcase');
    const loadShowcaseFonts = () => {
        Object.keys(FONTS).forEach((fontFamily) => {
            if (!loadedFonts.has(fontFamily)) {
                loadFontOnDemand(fontFamily);
            }
        });
    };
    if (showcase && 'IntersectionObserver' in window) {
        const showcaseObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                loadShowcaseFonts();
                showcaseObserver.disconnect();
            }
        }, { rootMargin: '200px 0px' });
        showcaseObserver.observe(showcase);
    } else {
        window.setTimeout(loadShowcaseFonts, 1500);
    }

    // --- 8. Copy to Clipboard (High-Fidelity Raw Copier) ---
    if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.code-tab-btn.active').getAttribute('data-tab');
        
        // Copy the raw cached text, NEVER copying the decorative span highlight HTML elements!
        const textToCopy = activeTab === 'css' ? rawCSSCode : rawHTMLCode;
        
        const copyText = (text) => {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
            }
            return fallbackCopy(text);
        };

        const fallbackCopy = (text) => {
            return new Promise((resolve, reject) => {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    const ok = document.execCommand('copy');
                    ta.remove();
                    if (ok) resolve(); else reject(new Error('copy failed'));
                } catch (e) { reject(e); }
            });
        };

        copyText(textToCopy).then(() => {
            const btnText = copyBtn.querySelector('.btn-text');
            const btnIcon = copyBtn.querySelector('.material-symbols-rounded');
            if (btnText) btnText.textContent = activeTab === 'css' ? 'CSSコピー成功！' : 'インポートタグをコピーしました！';
            if (btnIcon) btnIcon.textContent = 'done';
            window.setTimeout(() => {
                if (btnText) btnText.textContent = 'CSSコードをコピー';
                if (btnIcon) btnIcon.textContent = 'content_copy';
            }, 2000);
        }).catch(() => {
            const btnText = copyBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'コピーに失敗しました';
            window.setTimeout(() => {
                if (btnText) btnText.textContent = 'CSSコードをコピー';
            }, 2000);
        });
    });
    }

    // --- 9. Scroll to Top ---
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});
