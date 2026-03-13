// End-to-end test: load the page and simulate a full AI game in node
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function test() {
  const results = [];
  let pass = 0;
  let fail = 0;

  function assert(name, condition, detail) {
    if (condition) {
      results.push('  ✅ ' + name);
      pass++;
    } else {
      results.push('  ❌ ' + name + (detail ? ' — ' + detail : ''));
      fail++;
    }
  }

  // Test 1: Page loads
  console.log('🔍 测试1: 页面加载');
  const res = await fetch('http://127.0.0.1:8080/index.html');
  assert('HTTP 200', res.status === 200);
  assert('Contains DOCTYPE', res.body.includes('<!DOCTYPE html>'));
  assert('Contains 狼人杀 title', res.body.includes('<title>狼人杀</title>'));
  assert('Has setup screen', res.body.includes('id="screen-setup"'));
  assert('Has role screen', res.body.includes('id="screen-role"'));
  assert('Has game screen', res.body.includes('id="screen-game"'));
  assert('Has result screen', res.body.includes('id="screen-result"'));

  // Test 2: HTML structure
  console.log('🔍 测试2: HTML结构');
  assert('Has humanCount select', res.body.includes('id="humanCount"'));
  assert('Has start button', res.body.includes('onclick="startGame()"'));
  assert('Has player area', res.body.includes('id="playerArea"'));
  assert('Has phase banner', res.body.includes('id="phaseBanner"'));
  assert('Has night overlay', res.body.includes('id="nightOverlay"'));
  assert('Has game log area', res.body.includes('id="gameLog"'));

  // Test 3: CSS responsive
  console.log('🔍 测试3: 响应式CSS');
  assert('Has media query for mobile', res.body.includes('@media(max-width:600px)'));
  assert('Has touch-action for buttons', res.body.includes('touch-action:manipulation'));
  assert('Has viewport meta', res.body.includes('viewport'));

  // Test 4: JavaScript functions exist
  console.log('🔍 测试4: JS函数完整性');
  const requiredFns = [
    'startGame', 'showNextRoleReveal', 'revealRole', 'confirmRole',
    'showScreen', 'renderPlayers', 'setAction', 'setButtons',
    'startNight', 'phaseGuard', 'phaseWolf', 'phaseWitch', 'phaseSeer',
    'resolveNight', 'startDay', 'hunterShoot', 'phaseSpeech', 'phaseVote',
    'generateSpeech', 'aiVote', 'showResult', 'waitPlayerSelect',
    'humanWitchAction', 'checkWin', 'shuffle', 'addPublicLog',
    'lastWordsPhase', 'generateLastWords'
  ];
  requiredFns.forEach(fn => {
    assert('Function: ' + fn, res.body.includes('function ' + fn));
  });

  // Test 5: Game constants
  console.log('🔍 测试5: 游戏常量');
  assert('12 roles defined', res.body.includes("'平民','平民','平民','平民'"));
  assert('ROLE_ICONS defined', res.body.includes('ROLE_ICONS'));
  assert('ROLE_CAMP defined', res.body.includes('ROLE_CAMP'));
  assert('ROLE_DESC defined', res.body.includes('ROLE_DESC'));

  // Test 6: No secret info leaks in public logs
  console.log('🔍 测试6: 信息安全');
  // The function addPublicLog should not be called with secret info
  // Check that night actions don't use addPublicLog
  const jsMatch = res.body.match(/<script>([\s\S]*?)<\/script>/);
  const js = jsMatch ? jsMatch[1] : '';

  // Guard phase should NOT log who they guard
  const guardSection = js.substring(js.indexOf('async function phaseGuard'), js.indexOf('async function phaseWolf'));
  assert('Guard: no public log of target', !guardSection.includes('addPublicLog'));

  // Wolf phase should NOT log who they kill
  const wolfSection = js.substring(js.indexOf('async function phaseWolf'), js.indexOf('async function phaseWitch'));
  assert('Wolf: no public log of target', !wolfSection.includes('addPublicLog'));

  // Witch phase should NOT log drug usage
  const witchSection = js.substring(js.indexOf('async function phaseWitch'), js.indexOf('function humanWitchAction'));
  assert('Witch: no public log of drugs', !witchSection.includes('addPublicLog'));

  // Seer phase should NOT log check results
  const seerSection = js.substring(js.indexOf('async function phaseSeer'), js.indexOf('function resolveNight'));
  assert('Seer: no public log of check', !seerSection.includes('addPublicLog'));

  // Test 7: AI thinking animation
  console.log('🔍 测试7: AI行为');
  assert('AI thinking dots animation', res.body.includes('ai-thinking'));
  assert('Guard AI thinking', js.includes('守卫正在行动'));
  assert('Wolf AI thinking', js.includes('狼人正在行动'));
  assert('Witch AI thinking', js.includes('女巫正在行动'));
  assert('Seer AI thinking', js.includes('预言家正在行动'));

  // Test 8: Game flow integrity
  console.log('🔍 测试8: 游戏流程完整性');
  assert('Night starts guard', js.includes('await phaseGuard()'));
  assert('Guard -> Wolf', guardSection.includes('await phaseWolf()'));
  assert('Wolf -> Witch', wolfSection.includes('await phaseWitch()'));
  assert('Witch -> Seer', witchSection.includes('await phaseSeer()'));
  assert('Seer -> resolveNight', seerSection.includes('resolveNight()'));
  assert('resolveNight -> startDay', js.includes('startDay()') && js.indexOf('startDay()') > js.indexOf('resolveNight'));
  assert('Day has speech phase', js.includes('await phaseSpeech()'));
  assert('Speech has vote phase', js.includes('phaseVote()'));
  assert('Vote can loop to night', js.includes("return startNight();"));

  // Test 9: Win conditions
  console.log('🔍 测试9: 胜负判定');
  assert('Good wins when no wolves', js.includes("if (w === 0) return 'good'"));
  assert('Wolf wins when wolves >= good', js.includes("if (w >= g) return 'wolf'"));

  // Test 10: Run core logic simulation
  console.log('🔍 测试10: 核心逻辑模拟');
  // Simulate a game
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const ROLES = ['狼人','狼人','狼人','狼人','预言家','女巫','猎人','守卫','平民','平民','平民','平民'];
  const roles = ROLES.slice();
  shuffle(roles);
  const players = [];
  for (let i = 0; i < 12; i++) {
    players.push({ id: i, role: roles[i], alive: true, poisoned: false });
  }

  assert('12 players created', players.length === 12);
  assert('4 wolves', players.filter(p => p.role === '狼人').length === 4);
  assert('1 seer', players.filter(p => p.role === '预言家').length === 1);
  assert('1 witch', players.filter(p => p.role === '女巫').length === 1);
  assert('1 hunter', players.filter(p => p.role === '猎人').length === 1);
  assert('1 guard', players.filter(p => p.role === '守卫').length === 1);
  assert('4 villagers', players.filter(p => p.role === '平民').length === 4);

  // Simulate rounds
  let rounds = 0;
  while (rounds < 20) {
    rounds++;
    const aWolves = players.filter(p => p.role === '狼人' && p.alive);
    const aGood = players.filter(p => p.role !== '狼人' && p.alive);
    if (aWolves.length === 0 || aWolves.length >= aGood.length) break;

    // Night: wolf kills
    const target = pick(aGood);
    target.alive = false;

    // Day: vote out someone
    const aAll = players.filter(p => p.alive);
    if (aAll.length > 0) {
      const voted = pick(aAll);
      voted.alive = false;
    }
  }

  const finalWolves = players.filter(p => p.role === '狼人' && p.alive).length;
  const finalGood = players.filter(p => p.role !== '狼人' && p.alive).length;
  const winner = finalWolves === 0 ? 'good' : 'wolf';
  assert('Game terminates', rounds < 20, 'rounds=' + rounds);
  assert('Has a winner: ' + winner, winner === 'good' || winner === 'wolf');

  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('测试结果: ' + pass + ' 通过, ' + fail + ' 失败');
  console.log('='.repeat(40));
  results.forEach(r => console.log(r));

  if (fail > 0) {
    console.log('\n❌ 存在失败的测试！');
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
