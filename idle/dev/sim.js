// 개발용 밸런스 시뮬레이터 (게임 빌드에는 포함되지 않음)
// 콘솔에서: await import('./dev/sim.js')  또는 script 태그로 주입 후 __sim.reset(); __sim.run(10)
(() => {
  const ok = s => !s.req || lv(s.req[0]) >= s.req[1];
  const saved = {};
  const sim = {
    log: [], min: 0,
    reset() {
      Object.assign(S, { churu: 0, lifetime: 0, skills: {}, level: 1, prog: 0, cats: { cheese: { lv: 1, dup: 0 } }, field: ['cheese'], fresh: {}, catSkills: {}, ips: 0, smashed: 0, births: 0, autoCam: true });
      G.items = []; G.orbs = []; G.parcels = []; G.cats = []; G.particles = []; G.popups = []; G.t = 0; G.earnLog = [];
      initWorld(); G.running = false;
      window.writeSave = () => {};
      for (const k of Object.keys(Sfx)) { const d = Object.getOwnPropertyDescriptor(Sfx, k); if (d && typeof d.value === 'function') { saved[k] = Sfx[k]; Sfx[k] = () => {}; } }
      UI.onBirth = () => {};
      sim.log = []; sim.min = 0; sim.firstBirth = null; sim.newAt = {};
    },
    shop() {
      for (const sp of SPECIES) while (canUpgrade(sp.id)) upgradeSpecies(sp.id);
      for (let k = 0; k < 80; k++) {
        const opts = [];
        for (const s of SKILLS) if (ok(s) && !(s.max && lv(s.id) >= s.max)) opts.push({ c: skillCost(s), f: () => { S.skills[s.id] = lv(s.id) + 1; if (s.id === 'tower') syncFieldCats(); } });
        for (const id of S.field) for (const s of CAT_SKILLS) {
          const L = csl(id, s.id);
          if ((!s.req || csl(id, s.req[0]) >= s.req[1]) && !(s.max && L >= s.max)) opts.push({ c: catSkillCost(s, id), f: () => { (S.catSkills[id] = S.catSkills[id] || {})[s.id] = L + 1; } });
        }
        opts.sort((a, b) => a.c - b.c);
        if (!opts.length || S.churu < opts[0].c) break;
        S.churu -= opts[0].c; opts[0].f();
      }
    },
    run(mins, every = 5) {
      for (let m = 0; m < mins; m++) {
        sim.min++;
        for (let i = 0; i < 1200; i++) { update(0.05); if (i % 100 === 0) sim.shop(); }
        for (const id in S.cats) if (!(id in sim.newAt)) sim.newAt[id] = sim.min;
        if (sim.min % every === 0 || sim.min <= 3) sim.log.push(`${sim.min}m L${S.level} 🐟${fmt(S.churu)} ${fmt(S.ips)}/s cats=${G.cats.length}/${fieldCap()} dex=${Object.keys(S.cats).length} births=${S.births} items=${G.items.length} orbs=${G.orbs.length} R=${Math.round(radius())} claw=${lv('claw')} val=${lv('value')} spawn=${lv('spawn')} stor=${lv('storage')} terr=${lv('territory')}`);
      }
      return sim.log.join('\n');
    },
  };
  window.__sim = sim;
})();
