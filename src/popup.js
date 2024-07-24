// popup.js - handles interaction with the extension's popup, sends requests to the
// service worker (background.js), and updates the popup's UI (popup.html) on completion.

const outputElement = document.getElementById('output');
const generateTags = document.getElementById('gen-tags');

generateTags.addEventListener('click', (event) => {
    chrome.history.search({ text: '', maxResults: 5 }, async function (data) {
        data.forEach(async function (page) {
            const message = {
                action: 'classify',
                text: page.title,
            }

            chrome.runtime.sendMessage(message, (response) => {
                console.log('received user data', response)
                // outputElement.innerText = JSON.stringify(response, null, 2);
                const storageKey = page.id;
                const storageValue = JSON.stringify({ title: page.title, tags: response });
                localStorage.setItem(storageKey, storageValue);
            });

        });
    });
})
