// 現在の年を自動表示
document.getElementById('current-year').textContent = new Date().getFullYear();

// グラフ自動生成
const eventStats = [
  {
    date: '7/7(月)',
    value: 35,
    label: 'プレ4回',
  },
  {
    date: '7/15(火)',
    value: 63,
    label: 'プレ5回',
  },
  {
    date: '7/23(水)',
    value: 55,
    label: 'プレ6回',
  },
  {
    date: '7/31(木)',
    value: 64,
    label: 'プレ7回',
  },
  {
    date: '8/9(土)',
    value: 60,
    label: 'プレ8回',
  },
  {
    date: '8/16(土)',
    value: 48,
    label: 'プレ9回',
  },
  {
    date: '8/21(木)',
    value: 63,
    label: 'プレ10回',
  },
  {
    date: '9/19(金)',
    value: 84,
    label: 'プレ11回',
  },
  {
    date: '9/26(金)',
    value: 93,
    label: '第1回',
  },
  {
    date: '10/3(金)',
    value: 95,
    label: '第2回',
  },
];

const maxStatsValue = Math.max(...eventStats.map(item => item.value));
const participantsTotal = eventStats.reduce((sum, item) => sum + item.value, 0);

document.querySelectorAll('.stats-section .bar-date').forEach((item, index) => {
  item.textContent = eventStats[index].date;
});

document.querySelectorAll('.stats-section .bar-value').forEach((item, index) => {
  item.textContent = eventStats[index].value;
});

document.querySelectorAll('.stats-section .bar-label').forEach((item, index) => {
  item.textContent = eventStats[index].label;
});

document.querySelectorAll('.stats-section .bar').forEach((item, index) => {
  item.style.height = `${(eventStats[index].value / maxStatsValue) * 100}%`;
});

// 平均参加者数を表示
const averageParticipantsAverage = Math.round(participantsTotal / eventStats.length);
document.getElementById('average-participants').textContent = averageParticipantsAverage;
document.getElementById('average-participants-count').textContent = eventStats[0].label;
