/** このラボ専用の静的CSS生成設定。ほかのPikaLab教材には影響させない。 */
module.exports = {
  darkMode: 'class',
  content: ['./atom_craft_lab/index.html', './atom_craft_lab/js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', 'Inter', 'sans-serif'],
        mono: ['Inter', 'monospace']
      }
    }
  },
  plugins: []
};
