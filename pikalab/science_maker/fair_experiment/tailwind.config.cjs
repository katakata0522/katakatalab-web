/** Build inside the existing PikaLab Tailwind 3 toolchain:
 * npx tailwindcss -c tailwind.config.cjs -i tailwind.input.css -o assets/style.css --minify
 * Keep the committed generated CSS for standalone, offline and CSP-safe rendering.
 */
module.exports = {
  content: ['./index.html', './app.js', './cases.js'],
  theme: {
    extend: {
      colors: { paper:'#fff8ed', coral:'#f57565', ink:'#302e45', lavender:'#6555a4', teal:'#72ada1' },
      fontFamily: { rounded: ['M PLUS Rounded 1c','Hiragino Maru Gothic ProN','Yu Gothic','Meiryo','sans-serif'] }
    }
  }, plugins: []
};
