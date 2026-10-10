const fs = require('fs');
const path = require('path');
const { writeGeneratedText } = require('./write-generated-text.cjs');
const pikalabRoot = path.resolve(__dirname, '..');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');

function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>~+])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
}

async function main() {
    const articlesDir = path.join(pikalabRoot, 'articles');
    const tailwindConfig = require(path.join(pikalabRoot, 'tailwind.config.js'));

    const config = {
        ...tailwindConfig,
        content: [
            path.join(articlesDir, '**/*.html').replace(/\\/g, '/')
        ]
    };

    const inputCss = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    `;

    console.log('Compiling Tailwind CSS for articles...');
    const result = await postcss([tailwindcss(config)]).process(inputCss, { from: undefined });
    const minified = minifyCss(result.css);

    const outputCssPath = path.join(articlesDir, 'tailwind.generated.css');
    writeGeneratedText(outputCssPath, minified);
    console.log(`Saved ${outputCssPath} (${result.css.length} -> ${minified.length} bytes, minified)`);

    const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));
    let updatedCssLinks = 0;
    let updatedJsLinks = 0;

    for (const file of files) {
        const filePath = path.join(articlesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Ensure tailwind.generated.css link
        if (!content.includes('tailwind.generated.css')) {
            if (content.includes('<link rel="stylesheet" href="./style.css">')) {
                content = content.replace(
                    '<link rel="stylesheet" href="./style.css">',
                    '<link rel="stylesheet" href="./tailwind.generated.css">\n    <link rel="stylesheet" href="./style.css">'
                );
                modified = true;
                updatedCssLinks++;
            } else if (content.includes('<link rel="stylesheet" href="style.css">')) {
                content = content.replace(
                    '<link rel="stylesheet" href="style.css">',
                    '<link rel="stylesheet" href="./tailwind.generated.css">\n    <link rel="stylesheet" href="style.css">'
                );
                modified = true;
                updatedCssLinks++;
            }
        }

        // Ensure article-common.js link
        if (!content.includes('article-common.js')) {
            if (content.includes('<script src="./preferences.js"></script>')) {
                content = content.replace(
                    '<script src="./preferences.js"></script>',
                    '<script src="./preferences.js"></script>\n    <script src="./article-common.js" defer></script>'
                );
                modified = true;
                updatedJsLinks++;
            }
        }

        // Ensure index.html includes hub.js
        if (file === 'index.html' && !content.includes('hub.js')) {
            if (content.includes('<script src="./article-common.js" defer></script>')) {
                content = content.replace(
                    '<script src="./article-common.js" defer></script>',
                    '<script src="./article-common.js" defer></script>\n    <script src="./hub.js" defer></script>'
                );
                modified = true;
                updatedJsLinks++;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }

    console.log(`Verified ${files.length} HTML files.`);
    if (updatedCssLinks > 0) console.log(`Added CSS links to ${updatedCssLinks} files.`);
    if (updatedJsLinks > 0) console.log(`Added JS links to ${updatedJsLinks} files.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
