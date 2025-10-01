// 現在の年を自動表示
document.getElementById('current-year').textContent = new Date().getFullYear();

// 平均参加者数を表示
const averageParticipants = Array.from(document.querySelectorAll('.bar-value')).reduce((sum, bar) => sum + parseInt(bar.textContent), 0)
const averageParticipantsAverage = Math.round(averageParticipants / document.querySelectorAll('.bar-value').length);
document.getElementById('average-participants').textContent = averageParticipantsAverage;

const averageParticipantsCountText = document.querySelector('.stats-section .bar-label').textContent;
document.getElementById('average-participants-count').textContent = averageParticipantsCountText;
