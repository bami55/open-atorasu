// 現在の年を自動表示
document.getElementById('current-year').textContent = new Date().getFullYear();

// グラフ自動生成
const eventStats = [
  {
    date: '10/17(金)',
    value: 166,
    label: '第4回',
  },
  {
    date: '10/25(土)',
    value: 176,
    label: '第5回',
  },
  {
    date: '11/7(金)',
    value: 177,
    label: '第6回',
  },
  {
    date: '11/15(土)',
    value: 149,
    label: '第7回',
  },
  {
    date: '11/21(金)',
    value: 143,
    label: '第8回',
  },
  {
    date: '11/29(土)',
    value: 148,
    label: '第9回',
  },
  {
    date: '12/5(金)',
    value: 126,
    label: '第10回',
  },
  {
    date: '12/13(土)',
    value: 79,
    label: '第11回',
  },
  {
    date: '12/19(金)',
    value: 103,
    label: '第12回',
  },
  {
    date: '12/24(水)',
    value: 70,
    label: '第13回',
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
