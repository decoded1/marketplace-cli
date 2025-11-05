const guideBackBtn = document.getElementById('guideBackBtn');
const guideContent = document.getElementById('guideContent');
const showGuideSection = (guideQuestion, guideSteps) => {
    pushToLastSection(() => {
        showGuideSection(guideQuestion, guideSteps);
    });
    hideSections();
    guideSection.style.display = 'flex';

    guideContent.innerHTML = '';

    const questionSpan = document.createElement('span');
    questionSpan.className = 'guideQuestion';
    questionSpan.textContent = guideQuestion;
    guideContent.appendChild(questionSpan);
    if (guideSteps) {
        guideSteps.forEach((step, index) => {
            const stepSpan = document.createElement('span');
            stepSpan.className = 'guideText';
            stepSpan.textContent = `${index + 1}. ${step}`;
            guideContent.appendChild(stepSpan);
        });
    }

    guideBackBtn.onclick = async () => {
        await showScrapeSection(false);

    };
}
