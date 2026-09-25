// 「今日の建物クイズ」の挙動。ビルド時ではなく閲覧時のローカル日付で選ぶので、
// サイトを再ビルドしなくても日替わりになる。ロジックは src/lib/quiz.ts と同じ(重複実装)。
(function () {
  var D = window.__QUIZ__;
  if (!D || !D.items || !D.items.length) {
    var empty = document.getElementById('quiz-empty');
    if (empty) empty.hidden = false;
    return;
  }
  var ITEMS = D.items;
  var IS_JA = D.lang === 'ja';

  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function dayIndexFromDateKey(key) {
    var parts = key.split('-').map(Number);
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  }

  var dayIndex = dayIndexFromDateKey(todayKey());
  var sorted = ITEMS.slice().sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
  var b = sorted[((dayIndex % sorted.length) + sorted.length) % sorted.length];

  var fields = (b.f !== null && b.f !== undefined) ? ['height', 'year', 'floors'] : ['height', 'year'];
  var field = fields[((dayIndex % fields.length) + fields.length) % fields.length];

  var QUESTION = IS_JA
    ? { height: '高さは何mでしょう？', year: '竣工は何年でしょう？', floors: '地上は何階建てでしょう？' }
    : { height: 'How tall is it, in meters?', year: 'What year was it completed?', floors: 'How many floors above ground?' };

  var hints = [b.a];
  if (field !== 'year') hints.push((IS_JA ? '竣工' : 'Built ') + b.y + (IS_JA ? '年' : ''));
  if (field !== 'height') hints.push((IS_JA ? '高さ' : '') + b.h + 'm');
  if (field !== 'floors' && b.f !== null && b.f !== undefined) hints.push((IS_JA ? '地上' : '') + b.f + (IS_JA ? '階' : ' floors'));

  var answer = field === 'height' ? b.h + 'm' : field === 'year' ? b.y + (IS_JA ? '年' : '') : b.f + (IS_JA ? '階' : ' floors');

  document.getElementById('quiz-name').textContent = b.n;
  document.getElementById('quiz-hints').textContent = hints.join(' ・ ');
  document.getElementById('quiz-question').textContent = QUESTION[field];
  document.getElementById('quiz-link').href = b.u;

  var card = document.getElementById('quiz-card');
  var revealBtn = document.getElementById('quiz-reveal');
  var answerEl = document.getElementById('quiz-answer');
  answerEl.textContent = answer;
  card.hidden = false;

  revealBtn.addEventListener('click', function () {
    answerEl.hidden = false;
    revealBtn.hidden = true;
  });
})();
