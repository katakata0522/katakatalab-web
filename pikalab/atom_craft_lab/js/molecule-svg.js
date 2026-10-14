// 教材用の簡略的な分子・物質モデルをSVGで描画
export function getMoleculeSvg(svgType) {
    switch (svgType) {
        case 'bent_H2O':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <line x1="120" y1="48" x2="68" y2="98" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
                <line x1="120" y1="48" x2="172" y2="98" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
                <circle cx="120" cy="48" r="29" fill="#f43f5e"/>
                <text x="120" y="54" text-anchor="middle" fill="#fff" font-weight="800" font-size="18">O</text>
                <circle cx="68" cy="98" r="21" fill="#0ea5e9"/>
                <text x="68" y="104" text-anchor="middle" fill="#fff" font-weight="800" font-size="15">H</text>
                <circle cx="172" cy="98" r="21" fill="#0ea5e9"/>
                <text x="172" y="104" text-anchor="middle" fill="#fff" font-weight="800" font-size="15">H</text>
            </svg>`;
        case 'linear_CO2':
            return `<svg viewBox="0 0 260 135" class="w-full h-full">
                <line x1="60" y1="62" x2="200" y2="62" stroke="#94a3b8" stroke-width="6"/>
                <line x1="60" y1="74" x2="200" y2="74" stroke="#94a3b8" stroke-width="6"/>
                <circle cx="130" cy="68" r="28" fill="#334155"/>
                <text x="130" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="18">C</text>
                <circle cx="56" cy="68" r="26" fill="#f43f5e"/>
                <text x="56" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">O</text>
                <circle cx="204" cy="68" r="26" fill="#f43f5e"/>
                <text x="204" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">O</text>
            </svg>`;
        case 'diatomic_O2':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <line x1="88" y1="62" x2="152" y2="62" stroke="#94a3b8" stroke-width="7"/>
                <line x1="88" y1="74" x2="152" y2="74" stroke="#94a3b8" stroke-width="7"/>
                <circle cx="88" cy="68" r="29" fill="#f43f5e"/>
                <text x="88" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="18">O</text>
                <circle cx="152" cy="68" r="29" fill="#f43f5e"/>
                <text x="152" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="18">O</text>
            </svg>`;
        case 'diatomic_H2':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <line x1="94" y1="68" x2="146" y2="68" stroke="#94a3b8" stroke-width="10"/>
                <circle cx="94" cy="68" r="24" fill="#0ea5e9"/>
                <text x="94" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="16">H</text>
                <circle cx="146" cy="68" r="24" fill="#0ea5e9"/>
                <text x="146" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="16">H</text>
            </svg>`;
        case 'pyramid_NH3':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <line x1="120" y1="44" x2="62" y2="100" stroke="#94a3b8" stroke-width="8"/>
                <line x1="120" y1="44" x2="120" y2="112" stroke="#94a3b8" stroke-width="8"/>
                <line x1="120" y1="44" x2="178" y2="100" stroke="#94a3b8" stroke-width="8"/>
                <circle cx="120" cy="44" r="27" fill="#6366f1"/>
                <text x="120" y="50" text-anchor="middle" fill="#fff" font-weight="800" font-size="18">N</text>
                <circle cx="62" cy="100" r="19" fill="#0ea5e9"/>
                <text x="62" y="106" text-anchor="middle" fill="#fff" font-weight="800" font-size="14">H</text>
                <circle cx="120" cy="112" r="19" fill="#0ea5e9"/>
                <text x="120" y="118" text-anchor="middle" fill="#fff" font-weight="800" font-size="14">H</text>
                <circle cx="178" cy="100" r="19" fill="#0ea5e9"/>
                <text x="178" y="106" text-anchor="middle" fill="#fff" font-weight="800" font-size="14">H</text>
            </svg>`;
        case 'tetra_CH4':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <line x1="120" y1="68" x2="120" y2="20" stroke="#94a3b8" stroke-width="7"/>
                <line x1="120" y1="68" x2="65" y2="108" stroke="#94a3b8" stroke-width="7"/>
                <line x1="120" y1="68" x2="175" y2="108" stroke="#94a3b8" stroke-width="7"/>
                <line x1="120" y1="68" x2="120" y2="118" stroke="#94a3b8" stroke-width="7"/>
                <circle cx="120" cy="68" r="25" fill="#334155"/>
                <text x="120" y="74" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">C</text>
                <circle cx="120" cy="20" r="16" fill="#0ea5e9"/>
                <text x="120" y="25" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">H</text>
                <circle cx="65" cy="108" r="16" fill="#0ea5e9"/>
                <text x="65" y="113" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">H</text>
                <circle cx="175" cy="108" r="16" fill="#0ea5e9"/>
                <text x="175" y="113" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">H</text>
                <circle cx="120" cy="118" r="16" fill="#0ea5e9"/>
                <text x="120" y="123" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">H</text>
            </svg>`;
        case 'lattice_CuO':
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <rect x="48" y="32" width="144" height="70" rx="16" fill="none" stroke="#94a3b8" stroke-dasharray="5 5" stroke-width="2"/>
                <circle cx="94" cy="67" r="28" fill="#d97706"/>
                <text x="94" y="73" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">Cu</text>
                <circle cx="148" cy="67" r="26" fill="#f43f5e"/>
                <text x="148" y="73" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">O</text>
            </svg>`;
        default:
            return `<svg viewBox="0 0 240 135" class="w-full h-full">
                <rect x="48" y="32" width="144" height="70" rx="16" fill="none" stroke="#94a3b8" stroke-dasharray="5 5" stroke-width="2"/>
                <circle cx="94" cy="67" r="28" fill="#0d9488"/>
                <text x="94" y="73" text-anchor="middle" fill="#fff" font-weight="800" font-size="17">Fe</text>
                <circle cx="148" cy="67" r="26" fill="#eab308"/>
                <text x="148" y="73" text-anchor="middle" fill="#1e293b" font-weight="800" font-size="17">S</text>
            </svg>`;
    }
}
