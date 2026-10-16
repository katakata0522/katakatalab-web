/* PikaLab Train Graph Lab — deterministic learning model. No DOM or network. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TrainGraphCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LENGTH = 1200;
  const PARAMS = Object.freeze({
    speed: Object.freeze([12, 18, 24, 30, 36]),
    delay: Object.freeze([0, .5, 1, 1.5, 2, 2.5])
  });
  const MISSIONS = Object.freeze([
    Object.freeze({
      id:'meeting', number:'01', title:'中央駅で出会おう',
      goal:'2台の列車を、中央駅で同じ時刻に出会わせよう。',
      axis:'speedB', inputLabel:'B列車の速さ', unit:'km/h', choices:PARAMS.speed, initial:12,
      aSpeed:24, bSpeed:12, delayA:0, delayB:0, target:600,
      why:'2台とも同時に出発。中央駅までの距離は同じだから、速さも同じなら同時に着く。',
      tip:'中央駅までの距離はどちらも600m。速さを比べてみよう。'
    }),
    Object.freeze({
      id:'delay', number:'02', title:'発車時刻のナゾ',
      goal:'B列車の発車を遅らせて、中央駅で出会わせよう。',
      axis:'delayB', inputLabel:'B列車の発車まで待つ時間', unit:'分', choices:PARAMS.delay, initial:0,
      aSpeed:12, bSpeed:24, delayA:0, delayB:0, target:600,
      why:'Aは600mを3分で走る。Bは600mを1.5分で走るから、Bは1.5分待ってから出発すると同時に着く。',
      tip:'BはAの2倍の速さ。あとから出発すると、中央駅で会えそう。'
    }),
    Object.freeze({
      id:'target', number:'03', title:'800m地点の待ち合わせ',
      goal:'西の駅から800mの地点で、2台を出会わせよう。',
      axis:'speedA', inputLabel:'A列車の速さ', unit:'km/h', choices:PARAMS.speed, initial:12,
      aSpeed:12, bSpeed:12, delayA:0, delayB:0, target:800,
      why:'Aが800m進む間に、Bは400m進めばいい。時間が同じなら、AはBの2倍の速さにしよう。',
      tip:'Aは800m、Bは残り400m進む。Aの速さはBの何倍にするとよさそう？'
    })
  ]);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const kmhToMetresPerMin = kmh => kmh * 1000 / 60;
  const close = (a, b, tol = 1e-9) => Math.abs(a-b) <= tol;

  function validateConfig(cfg) {
    if (!cfg || ![cfg.aSpeed, cfg.bSpeed, cfg.delayA, cfg.delayB].every(Number.isFinite)
      || cfg.aSpeed <= 0 || cfg.bSpeed <= 0 || cfg.delayA < 0 || cfg.delayB < 0) {
      throw new TypeError('列車の速度・発車時刻が正しくありません。');
    }
  }
  function position(cfg, t) {
    validateConfig(cfg);
    if (!Number.isFinite(t)) throw new TypeError('経過時間が不正です');
    const time = Math.max(0, t);
    const a = clamp(kmhToMetresPerMin(cfg.aSpeed) * Math.max(0,time-cfg.delayA),0,LENGTH);
    const b = LENGTH - clamp(kmhToMetresPerMin(cfg.bSpeed) * Math.max(0,time-cfg.delayB),0,LENGTH);
    return {a,b};
  }
  function calculateMeeting(cfg) {
    validateConfig(cfg);
    const aEnd=cfg.delayA + LENGTH/kmhToMetresPerMin(cfg.aSpeed);
    const bEnd=cfg.delayB + LENGTH/kmhToMetresPerMin(cfg.bSpeed);
    const breaks=[0,cfg.delayA,cfg.delayB,aEnd,bEnd].sort((a,b)=>a-b)
      .filter((t,i,arr)=>i===0||!close(t,arr[i-1]));
    for(let i=0;i<breaks.length-1;i++) {
      const t0=breaks[i],t1=breaks[i+1];
      const d0=position(cfg,t0).a-position(cfg,t0).b;
      const d1=position(cfg,t1).a-position(cfg,t1).b;
      if(d0 <= 1e-8 && d1 >= -1e-8) {
        const time=close(d0,d1) ? t0 : t0 + (t1-t0) * (-d0)/(d1-d0);
        return {time,place:position(cfg,time).a};
      }
    }
    throw new Error('2台の列車が出会う時刻を計算できません');
  }
  function configForMission(mission,rawInput) {
    const allowed=mission?.choices;
    const input=Number(rawInput);
    if(!Array.isArray(allowed)||!allowed.some(n=>close(n,input))) throw new RangeError('許可されていない調整値です');
    return {
      aSpeed:mission.axis === 'speedA' ? input : mission.aSpeed,
      bSpeed:mission.axis === 'speedB' ? input : mission.bSpeed,
      delayA:mission.delayA,
      delayB:mission.axis === 'delayB' ? input : mission.delayB
    };
  }
  function outcome(mission,input) {
    const params=configForMission(mission,input);
    const meet=calculateMeeting(params);
    const error=meet.place-mission.target;
    const success=Math.abs(error) <= .5;
    const shortDistance=Math.round(Math.abs(error));
    const direction=error > 0 ? '東' : '西';
    let advice='';
    if(!success) {
      if(mission.axis === 'speedB') advice=error > 0 ? 'B列車をもっと速くすると、中央駅へ近づくよ。' : 'B列車を少し遅くすると、中央駅へ近づくよ。';
      if(mission.axis === 'delayB') advice=error < 0 ? 'B列車をもう少し遅れて出発させよう。' : 'B列車をもう少し早く出発させよう。';
      if(mission.axis === 'speedA') advice=error < 0 ? 'A列車を速くすると、800m地点へ近づくよ。' : 'A列車を少し遅くすると、800m地点へ近づくよ。';
    }
    return {params,meet,error,success,direction,shortDistance,advice};
  }
  function formatTime(t) {return `${Number(t.toFixed(1))}分`;}
  function formatPos(x) {return `${Math.round(x)}m`;}
  return {LENGTH,PARAMS,MISSIONS,clamp,kmhToMetresPerMin,position,calculateMeeting,configForMission,outcome,formatTime,formatPos};
});
