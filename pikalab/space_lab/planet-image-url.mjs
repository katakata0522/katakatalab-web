const PLANET_IMAGE_URLS = Object.freeze({
    'assets/sun.png': new URL('./assets/sun.png', import.meta.url).href,
    'assets/mercury.png': new URL('./assets/mercury.png', import.meta.url).href,
    'assets/venus.png': new URL('./assets/venus.png', import.meta.url).href,
    'assets/earth.png': new URL('./assets/earth.png', import.meta.url).href,
    'assets/mars.png': new URL('./assets/mars.png', import.meta.url).href,
    'assets/jupiter.png': new URL('./assets/jupiter.png', import.meta.url).href,
    'assets/saturn.png': new URL('./assets/saturn.png', import.meta.url).href,
    'assets/uranus.png': new URL('./assets/uranus.png', import.meta.url).href,
    'assets/neptune.png': new URL('./assets/neptune.png', import.meta.url).href
});

export function resolvePlanetImageUrl(imagePath) {
    const imageUrl = PLANET_IMAGE_URLS[imagePath];
    if (!imageUrl) {
        throw new TypeError(`未登録の惑星画像です: ${String(imagePath)}`);
    }
    return imageUrl;
}
